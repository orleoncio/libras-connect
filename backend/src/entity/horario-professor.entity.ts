import { EntitySchema } from 'typeorm';
export class HorarioProfessor {
  id: string;
  professorId: string;
  inicio: Date;
  fim: Date;
  livre: boolean;
  criadoEm: Date;
}
export const HorarioProfessorEntity = new EntitySchema<HorarioProfessor>({
  name: 'HorarioProfessor',
  target: HorarioProfessor,
  tableName: 'horarios_professores',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    professorId: { type: 'uuid' },
    inicio: { type: 'timestamptz' },
    fim: { type: 'timestamptz' },
    livre: { type: 'boolean', default: true },
    criadoEm: { type: 'timestamptz', createDate: true },
  },
  foreignKeys: [
    {
      target: 'ProfessorPerfil',
      columnNames: ['professorId'],
      referencedColumnNames: ['usuarioId'],
      onDelete: 'CASCADE',
    },
  ],
  checks: [
    {
      name: 'horario_duracao_uma_hora',
      expression: `fim = inicio + interval '1 hour'`,
    },
  ],
  exclusions: [
    {
      name: 'horarios_sem_sobreposicao',
      expression: `USING gist ("professorId" WITH =, tstzrange(inicio, fim, '[)') WITH &&)`,
    },
  ],
});
