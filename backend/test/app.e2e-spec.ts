import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { DataSource, QueryFailedError } from 'typeorm';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AuthController } from '../dist/controller/auth.controller.js';
import { AuthService } from '../dist/service/auth.service.js';
import { JwtGuard } from '../dist/auth/jwt.guard.js';
import { UsuarioRegistro, AlunoPerfil } from '../dist/entity/usuario.entity.js';
import {
  databaseOptions,
  validateEnvironment,
} from '../dist/database/config.js';
import { config } from 'dotenv';

const secret = 'segredo-de-testes-com-mais-de-32-caracteres';
const realDatabase = process.env.AUTH_E2E_DATABASE === 'true';
const users = new Map<string, Record<string, any>>();
const alunos = new Map<string, Record<string, any>>();
const professores = new Map<string, Record<string, any>>();
const stores = (entity: unknown) =>
  entity === UsuarioRegistro
    ? users
    : entity === AlunoPerfil
      ? alunos
      : professores;
const fakeDb = {
  transaction: async (action: (manager: any) => Promise<unknown>) =>
    action({
      create: (_entity: unknown, data: any) => ({
        ...data,
        id: randomUUID(),
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      }),
      save: async (entity: any, data?: any) => {
        if (data) {
          stores(entity).set(data.usuarioId, data);
          return data;
        }
        if ([...users.values()].some((user) => user.email === entity.email)) {
          throw new QueryFailedError(
            'INSERT',
            [],
            Object.assign(new Error('duplicate'), { code: '23505' }),
          );
        }
        users.set(entity.id, entity);
        return entity;
      },
    }),
  getRepository: (entity: unknown) => ({
    findOneBy: async (where: any) =>
      stores(entity).get(where.id ?? where.usuarioId) ?? null,
    createQueryBuilder: () => {
      let email: string;
      let tipo: string;
      const query = {
        addSelect: () => query,
        where: (_sql: string, params: any) => {
          email = params.email;
          return query;
        },
        andWhere: (_sql: string, params: any) => {
          tipo = params.tipo;
          return query;
        },
        getOne: async () =>
          [...users.values()].find(
            (user) => user.email === email && user.tipo === tipo,
          ) ?? null,
      };
      return query;
    },
  }),
};

describe(`Autenticação HTTP (${realDatabase ? 'PostgreSQL' : 'persistência simulada'})`, () => {
  let app: INestApplication;
  let db: DataSource | undefined;
  const suffix = randomUUID();
  const ids: string[] = [];
  const aluno = {
    nome: 'Aluno Teste',
    email: `aluno-${suffix}@example.com`,
    telefone: '+5581999999999',
    nivelLibras: 'A1',
    senha: 'Senha123!',
    objetivoAprendizado: 'Conversação',
  };
  const professor = {
    ...aluno,
    email: `professor-${suffix}@example.com`,
    nivelLibras: 'C2',
    objetivoAprendizado: undefined,
    biografia: 'Professor de Libras',
    especialidades: ['Conversação'],
    anosExperiencia: 3,
  };
  beforeAll(async () => {
    if (realDatabase) {
      config();
      db = new DataSource(databaseOptions(validateEnvironment(process.env)));
      await db.initialize();
      await db.runMigrations();
    }
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtGuard,
        { provide: DataSource, useValue: db ?? fakeDb },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) {
      if (ids.length) await db.getRepository(UsuarioRegistro).delete(ids);
      await db.destroy();
    }
  });
  it('cadastra os dois perfis, normaliza email e não expõe senha', async () => {
    for (const [route, dto] of [
      ['alunos', aluno],
      ['professores', professor],
    ] as const) {
      const response = await request(app.getHttpServer())
        .post(`/auth/${route}/registro`)
        .send({ ...dto, email: dto.email.toUpperCase() })
        .expect(201);
      ids.push(response.body.id);
      expect(response.body.email).toBe(dto.email);
      expect(response.body.tipo).toBe(
        route === 'alunos' ? 'aluno' : 'professor',
      );
      expect(response.body).not.toHaveProperty('senhaHash');
      expect(response.body).not.toHaveProperty('senha');
      if (db) {
        const stored = await db
          .getRepository(UsuarioRegistro)
          .createQueryBuilder('u')
          .addSelect('u.senhaHash')
          .where('u.id = :id', { id: response.body.id })
          .getOneOrFail();
        expect(stored.senhaHash).not.toBe(dto.senha);
        expect(stored.senhaHash).toMatch(/^\$2/);
      }
    }
  });
  it('autentica os dois perfis e consulta /auth/me com JWT', async () => {
    for (const [route, dto] of [
      ['alunos', aluno],
      ['professores', professor],
    ] as const) {
      const { body } = await request(app.getHttpServer())
        .post(`/auth/${route}/login`)
        .send({ email: dto.email, senha: dto.senha })
        .expect(200);
      expect(body.expiresIn).toBe(3600);
      expect(body.usuario).not.toHaveProperty('senhaHash');
      const me = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);
      expect(me.body.email).toBe(dto.email);
      expect(me.body).not.toHaveProperty('senhaHash');
      if (route === 'professores')
        expect(me.body.especialidades).toEqual(['Conversação']);
      else expect(me.body.objetivoAprendizado).toBe('Conversação');
    }
  });
  it('rejeita senha incorreta e login no perfil errado', async () => {
    await request(app.getHttpServer())
      .post('/auth/alunos/login')
      .send({ email: aluno.email, senha: 'incorreta123' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/professores/login')
      .send({ email: aluno.email, senha: aluno.senha })
      .expect(401);
  });
  it('rejeita nível inválido, campos extras e senha longa em bytes', async () => {
    await request(app.getHttpServer())
      .post('/auth/alunos/registro')
      .send({ ...aluno, nivelLibras: 'iniciante' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/alunos/registro')
      .send({ ...aluno, tipo: 'professor' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/alunos/registro')
      .send({ ...aluno, senha: 'á'.repeat(40) })
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/professores/registro')
      .send({ ...professor, anosExperiencia: -1 })
      .expect(400);
  });
  it('rejeita token ausente, adulterado e expirado', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer invalido')
      .expect(401);
    const expired = await app
      .get(JwtService)
      .signAsync({ sub: ids[0], tipo: 'aluno' }, { expiresIn: -1 });
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
  });
  it('rejeita email duplicado entre perfis sem criar usuário extra', async () => {
    await request(app.getHttpServer())
      .post('/auth/professores/registro')
      .send({ ...professor, email: aluno.email })
      .expect(409);
    expect(
      db
        ? await db
            .getRepository(UsuarioRegistro)
            .countBy({ email: aluno.email })
        : [...users.values()].filter((user) => user.email === aluno.email)
            .length,
    ).toBe(1);
  });
});
