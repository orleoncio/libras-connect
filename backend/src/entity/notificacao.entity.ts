import { EntitySchema } from 'typeorm';
export class Notificacao {
  id: string;
  aulaId: string;
  alunoId: string;
  criadoEm: Date;
  lidaEm: Date | null;
}
export const NotificacaoEntity = new EntitySchema<Notificacao>({
  name: 'Notificacao',
  target: Notificacao,
  tableName: 'notificacoes',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    aulaId: { type: 'uuid', unique: true },
    alunoId: { type: 'uuid' },
    criadoEm: { type: 'timestamptz', createDate: true },
    lidaEm: { type: 'timestamptz', nullable: true },
  },
  indices: [
    { name: 'notificacoes_aluno_criado', columns: ['alunoId', 'criadoEm'] },
  ],
  foreignKeys: [
    {
      target: 'Aula',
      columnNames: ['aulaId'],
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    },
    {
      target: 'AlunoPerfil',
      columnNames: ['alunoId'],
      referencedColumnNames: ['usuarioId'],
      onDelete: 'RESTRICT',
    },
  ],
});
