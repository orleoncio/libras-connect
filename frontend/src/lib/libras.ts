// Glosas verificadas no dicionário oficial do VLibras (2018.3.1).
export const librasTitles = {
  inicio: { title: "Aprender Libras", gloss: "APRENDER LIBRAS" },
  "escolher-perfil": { title: "Escolher perfil", gloss: "ESCOLHER PERFIL" },
  login: { title: "Entrar", gloss: "ENTRAR" },
  cadastro: { title: "Cadastro", gloss: "CADASTRO" },
  professores: { title: "Professores", gloss: "PROFESSORES" },
  "perfil-aluno": { title: "Perfil", gloss: "PERFIL" },
  "perfil-professor": { title: "Perfil", gloss: "PERFIL" },
  "solicitacoes-aluno": { title: "Solicitações", gloss: "SOLICITAÇÕES" },
  "solicitacoes-professor": { title: "Solicitações", gloss: "SOLICITAÇÕES" },
  calendario: { title: "Calendário", gloss: "CALENDÁRIO" },
  horarios: { title: "Agenda", gloss: "AGENDA" },
} as const;
export type LibrasTitleId = keyof typeof librasTitles;
