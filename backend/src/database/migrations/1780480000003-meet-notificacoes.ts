import type { MigrationInterface, QueryRunner } from 'typeorm';
export class MeetNotificacoes1780480000003 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Aulas anteriores permanecem válidas; o professor pode adicionar o link pelo calendário.
    await queryRunner.query(
      'ALTER TABLE aulas ADD COLUMN "linkMeet" varchar(2048), ADD COLUMN "iniciadaEm" timestamptz',
    );
    await queryRunner.query(`CREATE TABLE notificacoes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "aulaId" uuid NOT NULL UNIQUE REFERENCES aulas(id) ON DELETE CASCADE,
      "alunoId" uuid NOT NULL REFERENCES alunos("usuarioId") ON DELETE RESTRICT,
      "criadoEm" timestamptz NOT NULL DEFAULT now(), "lidaEm" timestamptz
    )`);
    await queryRunner.query(
      'CREATE INDEX notificacoes_aluno_criado ON notificacoes ("alunoId", "criadoEm")',
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE notificacoes');
    await queryRunner.query(
      'ALTER TABLE aulas DROP COLUMN "iniciadaEm", DROP COLUMN "linkMeet"',
    );
  }
}
