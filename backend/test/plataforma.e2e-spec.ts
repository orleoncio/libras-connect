import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { DataSource, QueryFailedError } from 'typeorm';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { config } from 'dotenv';
import { PlataformaController } from '../dist/controller/plataforma.controller.js';
import { PlataformaService } from '../dist/service/plataforma.service.js';
import { JwtGuard } from '../dist/auth/jwt.guard.js';
import { AlunoGuard } from '../dist/auth/aluno.guard.js';
import { ProfessorGuard } from '../dist/auth/professor.guard.js';
import {
  UsuarioRegistro,
  AlunoPerfil,
  ProfessorPerfil,
} from '../dist/entity/usuario.entity.js';
import { HorarioProfessor } from '../dist/entity/horario-professor.entity.js';
import { Solicitacao } from '../dist/entity/solicitacao.entity.js';
import { AulaController } from '../dist/controller/aula.controller.js';
import { NotificacaoController } from '../dist/controller/notificacao.controller.js';
import { AulaService } from '../dist/service/aula.service.js';
import { NotificacaoService } from '../dist/service/notificacao.service.js';
import { Notificacao } from '../dist/entity/notificacao.entity.js';
import { Aula } from '../dist/entity/aula.entity.js';
import {
  databaseOptions,
  validateEnvironment,
} from '../dist/database/config.js';
import { NivelLibras, TipoUsuario } from '../dist/entity/usuario.js';

const realDatabase = process.env.AUTH_E2E_DATABASE === 'true';
const ids = {
  aluno: randomUUID(),
  outroAluno: randomUUID(),
  professor: randomUUID(),
  outroProfessor: randomUUID(),
  iniciante: randomUUID(),
  horario: randomUUID(),
  outroHorario: randomUUID(),
  horarioIniciante: randomUUID(),
  horarioRecusa: randomUUID(),
  horarioPassado: randomUUID(),
};
const fixtures = [
  {
    id: ids.aluno,
    nome: 'Aluno A',
    tipo: TipoUsuario.ALUNO,
    nivelLibras: NivelLibras.A1,
  },
  {
    id: ids.outroAluno,
    nome: 'Aluno B',
    tipo: TipoUsuario.ALUNO,
    nivelLibras: NivelLibras.A2,
  },
  {
    id: ids.professor,
    nome: 'Professor B2',
    tipo: TipoUsuario.PROFESSOR,
    nivelLibras: NivelLibras.B2,
  },
  {
    id: ids.outroProfessor,
    nome: 'Professor C1',
    tipo: TipoUsuario.PROFESSOR,
    nivelLibras: NivelLibras.C1,
  },
  {
    id: ids.iniciante,
    nome: 'Professor A1',
    tipo: TipoUsuario.PROFESSOR,
    nivelLibras: NivelLibras.A1,
  },
].map((item) => ({
  ...item,
  email: `${item.id}@example.com`,
  telefone: '+5581999999999',
  senhaHash: 'fixture-sem-login',
}));
const start = new Date(Date.now() + 7 * 86400000);
start.setUTCHours(14, 0, 0, 0);
const slotFixtures = [
  { id: ids.horario, professorId: ids.professor, inicio: start },
  { id: ids.outroHorario, professorId: ids.outroProfessor, inicio: start },
  { id: ids.horarioIniciante, professorId: ids.iniciante, inicio: start },
  {
    id: ids.horarioRecusa,
    professorId: ids.professor,
    inicio: new Date(start.getTime() + 86400000),
  },
  {
    id: ids.horarioPassado,
    professorId: ids.professor,
    inicio: new Date('2020-01-01T14:00:00Z'),
  },
].map((item) => ({
  ...item,
  livre: true,
  fim: new Date(item.inicio.getTime() + 3600000),
}));
const tables = new Map<unknown, Map<string, any>>();
for (const entity of [
  UsuarioRegistro,
  AlunoPerfil,
  ProfessorPerfil,
  HorarioProfessor,
  Solicitacao,
  Aula,
  Notificacao,
])
  tables.set(entity, new Map());
const table = (entity: unknown) => tables.get(entity)!;
const matches = (row: any, where: any) =>
  Object.entries(where).every(([key, value]) => row[key] === value);
const fakeQuery = async (sql: string, params: any[]) => {
  if (sql.includes('LIMIT 1'))
    return [...table(Aula).values()].filter((aula) => {
      const slot = table(HorarioProfessor).get(aula.horarioId);
      return (
        aula.alunoId === params[0] &&
        slot.inicio < params[2] &&
        slot.fim > params[1]
      );
    });
  if (sql.includes('json_agg'))
    return fixtures
      .filter(
        (user) =>
          user.tipo === 'professor' && params[0].includes(user.nivelLibras),
      )
      .map((user) => ({
        id: user.id,
        nome: user.nome,
        nivelLibras: user.nivelLibras,
        ...table(ProfessorPerfil).get(user.id),
        horarios: [...table(HorarioProfessor).values()].filter(
          (slot) =>
            slot.professorId === user.id &&
            slot.livre &&
            slot.inicio.getTime() > Date.now(),
        ),
      }))
      .filter((user) => user.horarios.length);
  if (sql.includes('FROM notificacoes'))
    return [...table(Notificacao).values()]
      .filter((n) => n.alunoId === params[0])
      .map((n) => {
        const aula = table(Aula).get(n.aulaId);
        const slot = table(HorarioProfessor).get(aula.horarioId);
        return {
          ...n,
          linkMeet: aula.linkMeet,
          inicio: slot.inicio,
          professorNome: table(UsuarioRegistro).get(slot.professorId).nome,
        };
      });
  const isSolicitacoes = sql.includes('FROM solicitacoes');
  return [...table(isSolicitacoes ? Solicitacao : Aula).values()]
    .filter((row) => {
      const slot = table(HorarioProfessor).get(row.horarioId);
      if (params[2] && row.id !== params[2]) return false;
      return sql.includes('WHERE s."alunoId"') ||
        sql.includes('WHERE a."alunoId"')
        ? row.alunoId === params[0]
        : slot.professorId === params[0];
    })
    .map((row) => {
      const slot = table(HorarioProfessor).get(row.horarioId);
      return {
        ...row,
        ...(!isSolicitacoes
          ? {
              linkMeet:
                params[1] === 'professor' || row.iniciadaEm
                  ? row.linkMeet
                  : null,
            }
          : {}),
        inicio: slot.inicio,
        fim: slot.fim,
        alunoNome: table(UsuarioRegistro).get(row.alunoId).nome,
        alunoNivel: table(UsuarioRegistro).get(row.alunoId).nivelLibras,
        professorNome: table(UsuarioRegistro).get(slot.professorId).nome,
      };
    });
};
let failNotification = false;
const manager = {
  query: fakeQuery,
  findOneBy: async (entity: unknown, where: any) =>
    structuredClone(
      [...table(entity).values()].find((row) => matches(row, where)) ?? null,
    ),
  findOne: async (entity: unknown, options: any) =>
    manager.findOneBy(entity, options.where),
  findOneByOrFail: async (entity: unknown, where: any) => {
    const row = await manager.findOneBy(entity, where);
    if (!row) throw new Error('fixture não encontrada');
    return row;
  },
  create: (_entity: unknown, data: any) => ({
    lidaEm: null,
    iniciadaEm: null,
    ...data,
    id: randomUUID(),
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  }),
  save: async (entity: unknown, row: any) => {
    if (entity === Notificacao && failNotification) {
      failNotification = false;
      throw new Error('Falha simulada ao salvar notificação');
    }
    if (
      entity === Solicitacao &&
      [...table(entity).values()].some(
        (item) =>
          item.id !== row.id &&
          item.alunoId === row.alunoId &&
          item.horarioId === row.horarioId,
      )
    )
      throw new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('duplicate'), { code: '23505' }),
      );
    table(entity).set(row.id ?? row.usuarioId, structuredClone(row));
    return row;
  },
  update: async (entity: unknown, where: any, values: any) => {
    for (const [key, row] of table(entity))
      if (matches(row, where)) table(entity).set(key, { ...row, ...values });
  },
};
let queue: Promise<unknown> = Promise.resolve();
const fakeDb = {
  query: fakeQuery,
  getRepository: (entity: unknown) => ({
    findOneBy: (where: any) => manager.findOneBy(entity, where),
    find: async (options: any) =>
      [...table(entity).values()].filter((row) => matches(row, options.where)),
  }),
  transaction: (action: (value: typeof manager) => Promise<unknown>) => {
    const transaction = queue.then(async () => {
      const snapshot = new Map(
        [...tables].map(([entity, rows]) => [entity, structuredClone(rows)]),
      );
      try {
        return await action(manager);
      } catch (error) {
        tables.clear();
        for (const [entity, rows] of snapshot) tables.set(entity, rows);
        throw error;
      }
    });
    queue = transaction.catch(() => undefined);
    return transaction;
  },
};

describe(`Plataforma HTTP (${realDatabase ? 'PostgreSQL' : 'persistência simulada'})`, () => {
  let app: INestApplication;
  let db: DataSource | undefined;
  const tokens: Record<string, string> = {};
  let requestId: string;
  let otherRequestId: string;
  let overlapRequestId: string;
  beforeAll(async () => {
    if (realDatabase) {
      config();
      db = new DataSource(databaseOptions(validateEnvironment(process.env)));
      await db.initialize();
      await db.runMigrations();
    }
    const seedManager = db ? db.manager : manager;
    for (const user of fixtures) {
      await seedManager.save(UsuarioRegistro, user);
      if (user.tipo === TipoUsuario.ALUNO)
        await seedManager.save(AlunoPerfil, { usuarioId: user.id });
      else
        await seedManager.save(ProfessorPerfil, {
          usuarioId: user.id,
          biografia: 'Professor de teste',
          especialidades: ['Conversação'],
          anosExperiencia: 2,
        });
    }
    for (const slot of slotFixtures)
      await seedManager.save(HorarioProfessor, slot);
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'segredo-de-testes-com-mais-de-32-caracteres',
        }),
      ],
      controllers: [
        PlataformaController,
        AulaController,
        NotificacaoController,
      ],
      providers: [
        PlataformaService,
        AulaService,
        NotificacaoService,
        JwtGuard,
        AlunoGuard,
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
    for (const user of fixtures)
      tokens[user.id] = await app
        .get(JwtService)
        .signAsync({ sub: user.id, tipo: user.tipo });
  });
  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) {
      for (const id of [ids.aluno, ids.outroAluno]) {
        await db.getRepository(Solicitacao).delete({ alunoId: id });
        await db.getRepository(Aula).delete({ alunoId: id });
      }
      await db
        .getRepository(UsuarioRegistro)
        .delete(fixtures.map((user) => user.id));
      await db.destroy();
    }
  });
  const call = (id: string, method: 'get' | 'post' | 'patch', path: string) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${tokens[id]}`);
  const repo = (entity: unknown) =>
    db ? db.getRepository(entity as any) : fakeDb.getRepository(entity);
  it('filtra professores por nível superior e disponibilidade futura', async () => {
    const response = await call(ids.aluno, 'get', '/professores').expect(200);
    expect(response.body.map((user: any) => user.id).sort()).toEqual(
      [ids.professor, ids.outroProfessor].sort(),
    );
    expect(
      response.body
        .flatMap((user: any) => user.horarios)
        .some((slot: any) => slot.id === ids.horarioPassado),
    ).toBe(false);
    await call(ids.professor, 'get', '/professores').expect(403);
  });
  it('salva os dados cadastrais e rejeita alteração de perfil por outro papel', async () => {
    await call(ids.aluno, 'patch', '/alunos/me')
      .send({
        nome: 'Aluno Atualizado',
        email: `${ids.aluno}@example.com`,
        telefone: '+5581999999999',
        nivelLibras: 'A2',
        objetivoAprendizado: 'Conversar',
      })
      .expect(200);
    expect(
      (await repo(UsuarioRegistro).findOneBy({ id: ids.aluno })).nivelLibras,
    ).toBe('A2');
    await call(ids.professor, 'patch', '/alunos/me').send({}).expect(403);
  });
  it('cria pedidos pendentes sem ocupar o horário ou criar aula', async () => {
    requestId = (
      await call(ids.aluno, 'post', '/solicitacoes')
        .send({ horarioId: ids.horario })
        .expect(201)
    ).body.id;
    otherRequestId = (
      await call(ids.outroAluno, 'post', '/solicitacoes')
        .send({ horarioId: ids.horario })
        .expect(201)
    ).body.id;
    expect(
      (await repo(HorarioProfessor).findOneBy({ id: ids.horario })).livre,
    ).toBe(true);
    expect(await repo(Aula).findOneBy({ horarioId: ids.horario })).toBeNull();
    await call(ids.aluno, 'post', '/solicitacoes')
      .send({ horarioId: ids.horario })
      .expect(409);
  });
  it('bloqueia professor com nível insuficiente, horário passado e requisições inválidas', async () => {
    await call(ids.aluno, 'post', '/solicitacoes')
      .send({ horarioId: ids.horarioIniciante })
      .expect(403);
    await call(ids.aluno, 'post', '/solicitacoes')
      .send({ horarioId: ids.horarioPassado })
      .expect(409);
    await call(ids.professor, 'post', '/solicitacoes')
      .send({ horarioId: ids.horario })
      .expect(403);
    await call(ids.aluno, 'post', '/solicitacoes')
      .send({ horarioId: 'invalido' })
      .expect(400);
  });
  it('protege solicitações de outros professores e dados de outros alunos', async () => {
    await call(
      ids.outroProfessor,
      'patch',
      `/solicitacoes/${requestId}/aceitar`,
    )
      .send({ linkMeet: 'https://meet.google.com/abc-defg-hij' })
      .expect(403);
    const aluno = await call(ids.aluno, 'get', '/solicitacoes').expect(200);
    expect(aluno.body.map((row: any) => row.id)).toEqual([requestId]);
    const professor = await call(
      ids.outroProfessor,
      'get',
      '/solicitacoes',
    ).expect(200);
    expect(professor.body).toEqual([]);
  });
  it('permite pedidos pendentes para professores diferentes antes da confirmação', async () => {
    overlapRequestId = (
      await call(ids.aluno, 'post', '/solicitacoes')
        .send({ horarioId: ids.outroHorario })
        .expect(201)
    ).body.id;
  });
  it('exige um link válido antes de confirmar', async () => {
    for (const body of [
      {},
      { linkMeet: 'https://example.com/abc-defg-hij' },
      { linkMeet: 'http://meet.google.com/abc-defg-hij' },
      { linkMeet: 'https://meet.google.com.evil.com/abc-defg-hij' },
    ]) {
      await call(ids.professor, 'patch', `/solicitacoes/${requestId}/aceitar`)
        .send(body)
        .expect(400);
    }
    expect(await repo(Aula).findOneBy({ horarioId: ids.horario })).toBeNull();
  });
  it('aceite cria aula, ocupa horário, confirma solicitação e recusa concorrentes', async () => {
    await call(ids.professor, 'patch', `/solicitacoes/${requestId}/aceitar`)
      .send({ linkMeet: 'https://meet.google.com/abc-defg-hij' })
      .expect(200);
    expect(
      (await repo(HorarioProfessor).findOneBy({ id: ids.horario })).livre,
    ).toBe(false);
    expect((await repo(Solicitacao).findOneBy({ id: requestId })).status).toBe(
      'aceita',
    );
    expect(
      (await repo(Solicitacao).findOneBy({ id: otherRequestId })).status,
    ).toBe('recusada');
    expect(
      (await repo(Aula).findOneBy({ horarioId: ids.horario })).alunoId,
    ).toBe(ids.aluno);
    await call(ids.professor, 'patch', `/solicitacoes/${requestId}/aceitar`)
      .send({ linkMeet: 'https://meet.google.com/abc-defg-hij' })
      .expect(409);
    const alunoCalendar = await call(ids.aluno, 'get', '/aulas').expect(200);
    expect(alunoCalendar.body).toHaveLength(1);
    expect(
      (await call(ids.professor, 'get', '/aulas').expect(200)).body,
    ).toHaveLength(1);
    expect(
      (await call(ids.outroAluno, 'get', '/aulas').expect(200)).body,
    ).toEqual([]);
  });
  it.skipIf(realDatabase)(
    'reverte o início se a notificação não for salva',
    async () => {
      const aula = await repo(Aula).findOneBy({ horarioId: ids.horario });
      failNotification = true;
      await call(ids.professor, 'post', `/aulas/${aula.id}/iniciar`).expect(
        500,
      );
      expect(
        (await repo(Aula).findOneBy({ id: aula.id })).iniciadaEm,
      ).toBeNull();
      expect(
        (await call(ids.aluno, 'get', '/notificacoes').expect(200)).body,
      ).toEqual([]);
    },
  );
  it('libera o link e notifica somente ao iniciar, sem duplicação', async () => {
    const aula = await repo(Aula).findOneBy({ horarioId: ids.horario });
    const path = `/aulas/${aula.id}`;
    expect(
      (await call(ids.aluno, 'get', path).expect(200)).body.linkMeet,
    ).toBeNull();
    expect(
      (await call(ids.professor, 'get', path).expect(200)).body.linkMeet,
    ).toBe('https://meet.google.com/abc-defg-hij');
    expect(
      (await call(ids.aluno, 'get', '/notificacoes').expect(200)).body,
    ).toEqual([]);
    await call(ids.outroAluno, 'get', path).expect(404);
    await call(ids.aluno, 'post', path + '/iniciar').expect(403);
    await call(ids.outroProfessor, 'post', path + '/iniciar').expect(403);
    await call(ids.professor, 'patch', path + '/link')
      .send({ linkMeet: 'https://meet.google.com/xyz-abcd-efg?authuser=1' })
      .expect(200);
    const started = await Promise.all([
      call(ids.professor, 'post', path + '/iniciar').expect(201),
      call(ids.professor, 'post', path + '/iniciar').expect(201),
    ]);
    expect(started[0].body.iniciadaEm).toBe(started[1].body.iniciadaEm);
    expect((await call(ids.aluno, 'get', path).expect(200)).body.linkMeet).toBe(
      'https://meet.google.com/xyz-abcd-efg',
    );
    const notifications = (
      await call(ids.aluno, 'get', '/notificacoes').expect(200)
    ).body;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].linkMeet).toBe(
      'https://meet.google.com/xyz-abcd-efg',
    );
    expect(
      (await call(ids.outroAluno, 'get', '/notificacoes').expect(200)).body,
    ).toEqual([]);
    await call(ids.professor, 'get', '/notificacoes').expect(403);
    await call(
      ids.outroAluno,
      'patch',
      `/notificacoes/${notifications[0].id}/lida`,
    ).expect(404);
    const read = await call(
      ids.aluno,
      'patch',
      `/notificacoes/${notifications[0].id}/lida`,
    ).expect(200);
    expect(
      (
        await call(
          ids.aluno,
          'patch',
          `/notificacoes/${notifications[0].id}/lida`,
        ).expect(200)
      ).body.lidaEm,
    ).toBe(read.body.lidaEm);
    await call(ids.professor, 'patch', path + '/link')
      .send({ linkMeet: 'https://meet.google.com/abc-defg-hij' })
      .expect(409);
  });
  it('impede aceitar uma solicitação que conflita com outra aula confirmada', async () => {
    await call(
      ids.outroProfessor,
      'patch',
      `/solicitacoes/${overlapRequestId}/aceitar`,
    )
      .send({ linkMeet: 'https://meet.google.com/abc-defg-hij' })
      .expect(409);
    expect(
      (await repo(HorarioProfessor).findOneBy({ id: ids.outroHorario })).livre,
    ).toBe(true);
    expect(
      await repo(Aula).findOneBy({ horarioId: ids.outroHorario }),
    ).toBeNull();
    expect(
      (await repo(Solicitacao).findOneBy({ id: overlapRequestId })).status,
    ).toBe('pendente');
  });
  it('impede solicitar uma aula em conflito e um horário já ocupado', async () => {
    await call(ids.aluno, 'post', '/solicitacoes')
      .send({ horarioId: ids.outroHorario })
      .expect(409);
    await call(ids.outroAluno, 'post', '/solicitacoes')
      .send({ horarioId: ids.horario })
      .expect(409);
  });
  it('recusa não cria aula e mantém o horário livre', async () => {
    const id = (
      await call(ids.outroAluno, 'post', '/solicitacoes')
        .send({ horarioId: ids.horarioRecusa })
        .expect(201)
    ).body.id;
    await call(ids.professor, 'patch', `/solicitacoes/${id}/recusar`).expect(
      200,
    );
    expect(
      (await repo(HorarioProfessor).findOneBy({ id: ids.horarioRecusa })).livre,
    ).toBe(true);
    expect(
      await repo(Aula).findOneBy({ horarioId: ids.horarioRecusa }),
    ).toBeNull();
  });
});
