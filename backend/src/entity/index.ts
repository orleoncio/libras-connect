import { usuarioEntities } from './usuario.entity.js';
import { HorarioProfessorEntity } from './horario-professor.entity.js';
import { AulaEntity } from './aula.entity.js';
import { SolicitacaoEntity } from './solicitacao.entity.js';
export const entities = [
  ...usuarioEntities,
  HorarioProfessorEntity,
  AulaEntity,
  SolicitacaoEntity,
];
