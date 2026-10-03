import type { MigrationInterface, QueryRunner } from 'typeorm';
export class Solicitacoes1780480000002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE status_solicitacao AS ENUM ('pendente', 'aceita', 'recusada')`,
    );
    await queryRunner.query(`CREATE TABLE solicitacoes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "horarioId" uuid NOT NULL REFERENCES horarios_professores(id) ON DELETE RESTRICT,
      "alunoId" uuid NOT NULL REFERENCES alunos("usuarioId") ON DELETE RESTRICT,
      status status_solicitacao NOT NULL DEFAULT 'pendente',
      "criadoEm" timestamptz NOT NULL DEFAULT now(), "atualizadoEm" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT solicitacao_aluno_horario_unica UNIQUE ("alunoId", "horarioId")
    )`);
    await queryRunner.query(
      'CREATE INDEX solicitacoes_horario_status ON solicitacoes ("horarioId", status)',
    );
    await queryRunner.query('CREATE INDEX aulas_aluno ON aulas ("alunoId")');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX aulas_aluno');
    await queryRunner.query('DROP TABLE solicitacoes');
    await queryRunner.query('DROP TYPE status_solicitacao');
  }
}
