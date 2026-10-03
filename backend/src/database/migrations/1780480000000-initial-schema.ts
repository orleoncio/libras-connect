import type { MigrationInterface, QueryRunner } from 'typeorm';
export class InitialSchema1780480000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE nivel_libras AS ENUM ('A1','A2','B1','B2','C1','C2')`,
    );
    await queryRunner.query(
      `CREATE TYPE tipo_usuario AS ENUM ('aluno','professor')`,
    );
    await queryRunner.query(`CREATE TABLE usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome varchar(120) NOT NULL,
      email varchar(254) NOT NULL UNIQUE, telefone varchar(25) NOT NULL,
      "nivelLibras" nivel_libras NOT NULL, tipo tipo_usuario NOT NULL,
      "senhaHash" varchar(255) NOT NULL,
      "criadoEm" timestamptz NOT NULL DEFAULT now(), "atualizadoEm" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE alunos (
      "usuarioId" uuid PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      "objetivoAprendizado" varchar(1000)
    )`);
    await queryRunner.query(`CREATE TABLE professores (
      "usuarioId" uuid PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      biografia varchar(2000) NOT NULL, especialidades text[] NOT NULL,
      "anosExperiencia" integer NOT NULL CHECK ("anosExperiencia" >= 0)
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE professores');
    await queryRunner.query('DROP TABLE alunos');
    await queryRunner.query('DROP TABLE usuarios');
    await queryRunner.query('DROP TYPE tipo_usuario');
    await queryRunner.query('DROP TYPE nivel_libras');
  }
}
