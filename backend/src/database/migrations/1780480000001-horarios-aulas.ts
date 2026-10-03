import type { MigrationInterface, QueryRunner } from 'typeorm';
export class HorariosAulas1780480000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS btree_gist');
    await queryRunner.query(`CREATE TABLE horarios_professores (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "professorId" uuid NOT NULL REFERENCES professores("usuarioId") ON DELETE CASCADE,
      inicio timestamptz NOT NULL, fim timestamptz NOT NULL,
      livre boolean NOT NULL DEFAULT true, "criadoEm" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT horario_duracao_uma_hora CHECK (fim = inicio + interval '1 hour'),
      CONSTRAINT horarios_sem_sobreposicao EXCLUDE USING gist
        ("professorId" WITH =, tstzrange(inicio, fim, '[)') WITH &&)
    )`);
    await queryRunner.query(`CREATE TABLE aulas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "horarioId" uuid NOT NULL UNIQUE REFERENCES horarios_professores(id) ON DELETE RESTRICT,
      "alunoId" uuid NOT NULL REFERENCES alunos("usuarioId") ON DELETE RESTRICT,
      "criadoEm" timestamptz NOT NULL DEFAULT now()
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE aulas');
    await queryRunner.query('DROP TABLE horarios_professores');
    // A extensão pode estar sendo usada por outras tabelas; preserve-a.
  }
}
