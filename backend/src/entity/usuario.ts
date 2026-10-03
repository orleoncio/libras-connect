export enum NivelLibras {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}
export enum TipoUsuario {
  ALUNO = 'aluno',
  PROFESSOR = 'professor',
}
export abstract class Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  nivelLibras: NivelLibras;
  senhaHash: string;
  tipo: TipoUsuario;
  criadoEm: Date;
  atualizadoEm: Date;
}
export class Aluno extends Usuario {
  objetivoAprendizado?: string | null;
}
export class Professor extends Usuario {
  biografia: string;
  especialidades: string[];
  anosExperiencia: number;
}
