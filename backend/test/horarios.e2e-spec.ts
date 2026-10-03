import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { DataSource, QueryFailedError } from 'typeorm';
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { HorarioProfessorController } from '../dist/controller/horario-professor.controller.js';
import { HorarioProfessorService } from '../dist/service/horario-professor.service.js';
import { JwtGuard } from '../dist/auth/jwt.guard.js';
import { ProfessorGuard } from '../dist/auth/professor.guard.js';
import { HorarioProfessor } from '../dist/entity/horario-professor.entity.js';
import { Aula } from '../dist/entity/aula.entity.js';
import {
  UsuarioRegistro,
  ProfessorPerfil,
  AlunoPerfil,
} from '../dist/entity/usuario.entity.js';
import { NivelLibras, TipoUsuario } from '../dist/entity/usuario.js';
import {
  databaseOptions,
  validateEnvironment,
} from '../dist/database/config.js';

const realDatabase = process.env.AUTH_E2E_DATABASE === 'true';
const professorId = randomUUID();
const outroProfessorId = randomUUID();
const alunoId = randomUUID();
const rows: HorarioProfessor[] = [];
const start = new Date(Date.now() + 14 * 86400000);
start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
start.setUTCHours(14, 0, 0, 0);
const inicio = (hours: number) =>
  new Date(start.getTime() + hours * 3600000).toISOString();
const conflict = () =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('overlap'), { code: '23P01' }),
  );
const fakeDb = {
  transaction: async (action: (manager: any) => Promise<unknown>) =>
    action({
      findOneBy: async (_entity: unknown, where: { usuarioId: string }) =>
        [professorId, outroProfessorId].includes(where.usuarioId)
          ? { usuarioId: where.usuarioId }
          : null,
      create: (_entity: unknown, data: unknown) =>
        Object.assign(new HorarioProfessor(), data, {
          id: randomUUID(),
          criadoEm: new Date(),
        }),
      save: async (_entity: unknown, batch: HorarioProfessor[]) => {
        if (
          batch.some((item) =>
            rows.some(
              (row) =>
                row.professorId === item.professorId &&
                item.inicio < row.fim &&
                item.fim > row.inicio,
            ),
          )
        )
          throw conflict();
        rows.push(...batch);
        return batch;
      },
    }),
};

describe(`Horários HTTP (${realDatabase ? 'PostgreSQL' : 'persistência simulada'})`, () => {
  let app: INestApplication;
  let db: DataSource | undefined;
  let professorToken: string;
  let alunoToken: string;
  let outroToken: string;
  const url = '/professores/me/horarios';
  beforeAll(async () => {
    if (realDatabase) {
      config();
      db = new DataSource(databaseOptions(validateEnvironment(process.env)));
      await db.initialize();
      await db.runMigrations();
      await db.transaction(async (manager) => {
        for (const [id, tipo] of [
          [professorId, TipoUsuario.PROFESSOR],
          [outroProfessorId, TipoUsuario.PROFESSOR],
          [alunoId, TipoUsuario.ALUNO],
        ] as const) {
          await manager.save(UsuarioRegistro, {
            id,
            tipo,
            nome: 'Teste Horários',
            email: `${id}@example.com`,
            telefone: '+5581999999999',
            nivelLibras: NivelLibras.B2,
            senhaHash: 'fixture-sem-login',
          });
          if (tipo === TipoUsuario.PROFESSOR)
            await manager.save(ProfessorPerfil, {
              usuarioId: id,
              biografia: 'Teste',
              especialidades: ['Conversação'],
              anosExperiencia: 1,
            });
          else await manager.save(AlunoPerfil, { usuarioId: id });
        }
      });
    }
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'segredo-de-testes-com-mais-de-32-caracteres',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [HorarioProfessorController],
      providers: [
        HorarioProfessorService,
        JwtGuard,
        ProfessorGuard,
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
    const jwt = app.get(JwtService);
    professorToken = await jwt.signAsync({
      sub: professorId,
      tipo: 'professor',
    });
    outroToken = await jwt.signAsync({
      sub: outroProfessorId,
      tipo: 'professor',
    });
    alunoToken = await jwt.signAsync({ sub: alunoId, tipo: 'aluno' });
  });
  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) {
      const horarios = await db
        .getRepository(HorarioProfessor)
        .findBy({ professorId });
      for (const horario of horarios)
        await db.getRepository(Aula).delete({ horarioId: horario.id });
      await db
        .getRepository(UsuarioRegistro)
        .delete([professorId, outroProfessorId, alunoId]);
      await db.destroy();
    }
  });
  const post = (token = professorToken) =>
    request(app.getHttpServer())
      .post(url)
      .set('Authorization', `Bearer ${token}`);
  const stored = async () =>
    db
      ? db.getRepository(HorarioProfessor).findBy({ professorId })
      : rows.filter((row) => row.professorId === professorId);
  it('exige JWT e perfil de professor', async () => {
    await request(app.getHttpServer())
      .post(url)
      .send({ horarios: [{ inicio: inicio(0) }] })
      .expect(401);
    await post(alunoToken)
      .send({ horarios: [{ inicio: inicio(0) }] })
      .expect(403);
    const inexistente = await app
      .get(JwtService)
      .signAsync({ sub: randomUUID(), tipo: 'professor' });
    await post(inexistente)
      .send({ horarios: [{ inicio: inicio(0) }] })
      .expect(403);
  });
  it('cadastra horários consecutivos com uma hora de duração e livre=true', async () => {
    const response = await post()
      .send({ horarios: [{ inicio: inicio(1) }, { inicio: inicio(0) }] })
      .expect(201);
    expect(response.body).toHaveLength(2);
    for (const row of response.body) {
      expect(row.professorId).toBe(professorId);
      expect(row.livre).toBe(true);
      expect(new Date(row.fim).getTime() - new Date(row.inicio).getTime()).toBe(
        3600000,
      );
    }
    expect(await stored()).toHaveLength(2);
  });
  it('rejeita fuso ausente, datas impossíveis e campos controlados pelo servidor', async () => {
    for (const data of [
      { horarios: [{ inicio: inicio(3).replace('Z', '') }] },
      { horarios: [{ inicio: '2030-02-30T14:00:00Z' }] },
      { horarios: [{ inicio: inicio(3), livre: false }] },
      { horarios: [{ inicio: inicio(3), fim: inicio(4) }] },
      { horarios: [{ inicio: inicio(3) }], professorId: outroProfessorId },
      { horarios: [] },
    ])
      await post().send(data).expect(400);
  });
  it('rejeita datas passadas e horários de semanas diferentes', async () => {
    await post()
      .send({ horarios: [{ inicio: '2020-01-01T14:00:00Z' }] })
      .expect(400);
    await post()
      .send({ horarios: [{ inicio: inicio(3) }, { inicio: inicio(171) }] })
      .expect(400);
  });
  it('rejeita sobreposições dentro do lote sem salvar parcialmente', async () => {
    await post()
      .send({ horarios: [{ inicio: inicio(3) }, { inicio: inicio(3.5) }] })
      .expect(409);
    await post()
      .send({ horarios: [{ inicio: inicio(3) }, { inicio: inicio(3) }] })
      .expect(409);
    expect(await stored()).toHaveLength(2);
  });
  it('rejeita conflito com horário existente e mantém atomicidade do lote', async () => {
    await post()
      .send({ horarios: [{ inicio: inicio(3) }, { inicio: inicio(0.5) }] })
      .expect(409);
    expect(await stored()).toHaveLength(2);
  });
  it('permite o mesmo período para outro professor', async () => {
    const response = await post(outroToken)
      .send({ horarios: [{ inicio: inicio(0) }] })
      .expect(201);
    expect(response.body[0].professorId).toBe(outroProfessorId);
  });
  it('retorna um sucesso e um conflito para cadastros simultâneos iguais', async () => {
    const responses = await Promise.all([
      post().send({ horarios: [{ inicio: inicio(5) }] }),
      post().send({ horarios: [{ inicio: inicio(5) }] }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
  });
  it.skipIf(!realDatabase)(
    'impõe duração, FKs e uma aula por horário no PostgreSQL',
    async () => {
      const horario = (await stored())[0];
      await expect(
        db!.getRepository(HorarioProfessor).save({
          professorId,
          inicio: new Date(inicio(8)),
          fim: new Date(inicio(10)),
        }),
      ).rejects.toMatchObject({ driverError: { code: '23514' } });
      await expect(
        db!.getRepository(Aula).save({ horarioId: randomUUID(), alunoId }),
      ).rejects.toMatchObject({ driverError: { code: '23503' } });
      await expect(
        db!
          .getRepository(Aula)
          .save({ horarioId: horario.id, alunoId: professorId }),
      ).rejects.toMatchObject({ driverError: { code: '23503' } });
      await db!.getRepository(Aula).save({ horarioId: horario.id, alunoId });
      await expect(
        db!.getRepository(Aula).save({ horarioId: horario.id, alunoId }),
      ).rejects.toMatchObject({ driverError: { code: '23505' } });
    },
  );
});
