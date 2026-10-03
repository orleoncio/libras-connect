# Libras Connect

Plataforma que conecta alunos a professores de Libras, com solicitação de aulas e confirmação pelo professor.

- **Backend:** NestJS, TypeORM, PostgreSQL e autenticação JWT.
- **Frontend:** React, TypeScript e Vite.
- **Banco:** PostgreSQL em Docker Compose, com dados persistidos em volume.

## Funcionalidades

Escolha de perfil, cadastro e login de aluno ou professor, edição cadastral, níveis de Libras A1 a C2, disponibilidade semanal por datas concretas, busca de professores com nível superior ao aluno, solicitações de aula, aceite ou recusa e calendário de aulas confirmadas.

## Executar localmente

Pré-requisitos: Node.js compatível com as dependências (recomendado 24.15 ou superior na série 24), npm e Docker com Compose v2.

Prepare o backend e o banco:

```bash
cd backend
npm ci
cp .env.example .env
```

Edite `.env` para configurar `DB_PASSWORD` e um `JWT_SECRET` aleatório de pelo menos 32 caracteres. Depois:

```bash
docker compose up -d --wait postgres
npm run migration:run
npm run start:dev
```

Em outro terminal, a partir da raiz do projeto:

```bash
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Abra `http://localhost:5173`. O Vite encaminha `/api` para o backend em `http://localhost:3000`.

Os arquivos `.env` não são versionados. Use os `.env.example` como referência.

## Documentação e testes

Consulte [backend/README.md](backend/README.md) para banco, migrations, autenticação e endpoints, e [frontend/README.md](frontend/README.md) para interface, configuração e testes no navegador.

No backend: `npm run build`, `npm run lint`, `npm test` e `npm run test:e2e`. A suíte HTTP usa persistência simulada por padrão; `AUTH_E2E_DATABASE=true npm run test:e2e` usa o PostgreSQL configurado.

No frontend: `npm run build`, `npm run lint` e `npm run test:e2e`. Instale o navegador dos testes com `npx playwright install chromium --only-shell`. Os testes de interface simulam as respostas da API.
