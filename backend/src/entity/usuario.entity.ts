import { EntitySchema } from 'typeorm';
import { Usuario, NivelLibras, TipoUsuario } from './usuario.js';
export class UsuarioRegistro extends Usuario {}
export class AlunoPerfil {
  usuarioId: string;
  objetivoAprendizado?: string | null;
}
export class ProfessorPerfil {
  usuarioId: string;
  biografia: string;
  especialidades: string[];
  anosExperiencia: number;
}
export const UsuarioEntity = new EntitySchema<UsuarioRegistro>({
  name: 'UsuarioRegistro',
  target: UsuarioRegistro,
  tableName: 'usuarios',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    nome: { type: 'varchar', length: 120 },
    email: { type: 'varchar', length: 254, unique: true },
    telefone: { type: 'varchar', length: 25 },
    nivelLibras: { type: 'enum', enum: NivelLibras, enumName: 'nivel_libras' },
    tipo: { type: 'enum', enum: TipoUsuario, enumName: 'tipo_usuario' },
    senhaHash: { type: 'varchar', length: 255, select: false },
    criadoEm: { type: 'timestamptz', createDate: true },
    atualizadoEm: { type: 'timestamptz', updateDate: true },
  },
});
export const AlunoEntity = new EntitySchema<AlunoPerfil>({
  name: 'AlunoPerfil',
  target: AlunoPerfil,
  tableName: 'alunos',
  columns: {
    usuarioId: { type: 'uuid', primary: true },
    objetivoAprendizado: { type: 'varchar', length: 1000, nullable: true },
  },
  foreignKeys: [
    {
      target: 'UsuarioRegistro',
      columnNames: ['usuarioId'],
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    },
  ],
});
export const ProfessorEntity = new EntitySchema<ProfessorPerfil>({
  name: 'ProfessorPerfil',
  target: ProfessorPerfil,
  tableName: 'professores',
  columns: {
    usuarioId: { type: 'uuid', primary: true },
    biografia: { type: 'varchar', length: 2000 },
    especialidades: { type: 'text', array: true },
    anosExperiencia: { type: 'integer' },
  },
  checks: [{ expression: '"anosExperiencia" >= 0' }],
  foreignKeys: [
    {
      target: 'UsuarioRegistro',
      columnNames: ['usuarioId'],
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    },
  ],
});
export const usuarioEntities = [UsuarioEntity, AlunoEntity, ProfessorEntity];
