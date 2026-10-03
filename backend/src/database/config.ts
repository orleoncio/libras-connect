import type { DataSourceOptions } from 'typeorm';
import { entities } from '../entity/index.js';
import { InitialSchema1780480000000 } from './migrations/1780480000000-initial-schema.js';
import { HorariosAulas1780480000001 } from './migrations/1780480000001-horarios-aulas.js';
import { Solicitacoes1780480000002 } from './migrations/1780480000002-solicitacoes.js';
export function validateEnvironment(env: Record<string, unknown>) {
  for (const key of [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
  ]) {
    if (typeof env[key] !== 'string' || !env[key])
      throw new Error(`${key} é obrigatório`);
  }
  if (String(env.JWT_SECRET).length < 32)
    throw new Error('JWT_SECRET precisa de pelo menos 32 caracteres');
  const port = Number(env.DB_PORT ?? 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('DB_PORT inválida');
  return { ...env, DB_PORT: port };
}
export function databaseOptions(
  env: Record<string, unknown>,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: String(env.DB_HOST),
    port: Number(env.DB_PORT ?? 5432),
    username: String(env.DB_USER),
    password: String(env.DB_PASSWORD),
    database: String(env.DB_NAME),
    entities,
    migrations: [
      InitialSchema1780480000000,
      HorariosAulas1780480000001,
      Solicitacoes1780480000002,
    ],
    synchronize: false,
  };
}
