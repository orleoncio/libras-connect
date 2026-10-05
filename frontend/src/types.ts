export type Role = "aluno" | "professor";
export const levels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof levels)[number];
export interface User {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  tipo: Role;
  nivelLibras: Level;
  objetivoAprendizado?: string | null;
  biografia?: string;
  especialidades?: string[];
  anosExperiencia?: number;
}
export interface Slot {
  id: string;
  inicio: string;
  fim: string;
  professorId?: string;
  livre?: boolean;
}
export interface Teacher {
  id: string;
  nome: string;
  nivelLibras: Level;
  biografia: string;
  especialidades: string[];
  anosExperiencia: number;
  horarios: Slot[];
}
export interface Booking {
  id: string;
  horarioId: string;
  status: "pendente" | "aceita" | "recusada";
  inicio: string;
  fim: string;
  alunoNome: string;
  alunoNivel: Level;
  professorNome: string;
  criadoEm: string;
}
export interface Lesson {
  linkMeet?: string | null;
  iniciadaEm?: string | null;
  id: string;
  horarioId: string;
  inicio: string;
  fim: string;
  alunoNome: string;
  professorNome: string;
}

export interface AppNotification {
  id: string;
  aulaId: string;
  criadoEm: string;
  lidaEm: string | null;
  linkMeet: string;
  inicio: string;
  professorNome: string;
}
