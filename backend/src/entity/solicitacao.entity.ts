import { EntitySchema } from 'typeorm';
export enum StatusSolicitacao {
  PENDENTE = 'pendente',
  ACEITA = 'aceita',
  RECUSADA = 'recusada',
}
export class Solicitacao {
  id: string;
  horarioId: string;
  alunoId: string;
  status: StatusSolicitacao;
  criadoEm: Date;
  atualizadoEm: Date;
}
export const SolicitacaoEntity = new EntitySchema<Solicitacao>({
  name: 'Solicitacao',
  target: Solicitacao,
  tableName: 'solicitacoes',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    horarioId: { type: 'uuid' },
    alunoId: { type: 'uuid' },
    status: {
      type: 'enum',
      enum: StatusSolicitacao,
      enumName: 'status_solicitacao',
      default: StatusSolicitacao.PENDENTE,
    },
    criadoEm: { type: 'timestamptz', createDate: true },
    atualizadoEm: { type: 'timestamptz', updateDate: true },
  },
  uniques: [
    {
      name: 'solicitacao_aluno_horario_unica',
      columns: ['alunoId', 'horarioId'],
    },
  ],
  foreignKeys: [
    {
      target: 'HorarioProfessor',
      columnNames: ['horarioId'],
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT',
    },
    {
      target: 'AlunoPerfil',
      columnNames: ['alunoId'],
      referencedColumnNames: ['usuarioId'],
      onDelete: 'RESTRICT',
    },
  ],
});
