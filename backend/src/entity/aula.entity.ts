import { EntitySchema } from 'typeorm';
export class Aula {
  id: string;
  horarioId: string;
  alunoId: string;
  criadoEm: Date;
}
export const AulaEntity = new EntitySchema<Aula>({
  name: 'Aula',
  target: Aula,
  tableName: 'aulas',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    horarioId: { type: 'uuid', unique: true },
    alunoId: { type: 'uuid' },
    criadoEm: { type: 'timestamptz', createDate: true },
  },
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
