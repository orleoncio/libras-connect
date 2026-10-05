import { DataSource } from 'typeorm';
import { databaseOptions, validateEnvironment } from './config.js';
describe('Configuração do banco', () => {
  const env = {
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_NAME: 'test',
    DB_USER: 'test',
    DB_PASSWORD: 'test',
    JWT_SECRET: 'segredo-de-testes-com-mais-de-32-caracteres',
  };
  it('valida os metadados das tabelas e suas referências sem conectar ao banco', async () => {
    const db = new DataSource(databaseOptions(validateEnvironment(env)));
    await (
      db as unknown as { buildMetadatas(): Promise<void> }
    ).buildMetadatas();
    expect(db.entityMetadatas.map((entity) => entity.tableName).sort()).toEqual(
      [
        'alunos',
        'aulas',
        'horarios_professores',
        'notificacoes',
        'professores',
        'solicitacoes',
        'usuarios',
      ],
    );
    for (const table of ['alunos', 'professores']) {
      const entity = db.entityMetadatas.find(
        (item) => item.tableName === table,
      )!;
      expect(entity.foreignKeys[0].referencedEntityMetadata.tableName).toBe(
        'usuarios',
      );
      expect(entity.foreignKeys[0].onDelete).toBe('CASCADE');
    }
    expect(db.options.synchronize).toBe(false);
  });
  it('rejeita segredo curto e porta inválida', () => {
    expect(() => validateEnvironment({ ...env, JWT_SECRET: 'curto' })).toThrow(
      'JWT_SECRET',
    );
    expect(() => validateEnvironment({ ...env, DB_PORT: 'abc' })).toThrow(
      'DB_PORT',
    );
  });
});
