# Libras Connect — frontend

Interface React, TypeScript e Vite integrada à API NestJS. As rotas usam hash (`#/aluno/login`, `#/app/calendario`), permitindo atualizar a página sem configurar fallback no servidor estático.

## Executar localmente

1. Prepare o PostgreSQL e o `.env` do backend conforme `../backend/README.md`.
2. Aplique todas as migrations e inicie a API:

   ```bash
   cd backend
   npm run migration:run
   npm run start:dev
   ```

3. Em outro terminal, a partir da raiz do projeto:

   ```bash
   cd frontend
   npm ci
   cp .env.example .env
   npm run dev
   ```

4. Abra `http://localhost:5173`.

O Vite encaminha `/api` para `http://localhost:3000`, retirando o prefixo antes de chegar ao backend. Caso a API use outra porta, altere `API_PROXY_TARGET` no `.env` do frontend e reinicie o Vite. `VITE_API_URL` controla o endereço usado pelo navegador.

Em produção, configure um proxy reverso para `/api` ou defina `VITE_API_URL` com o endereço público do backend antes do build. Para acesso entre origens diferentes, configure `FRONTEND_ORIGIN` no backend com a origem pública do frontend; várias origens podem ser separadas por vírgulas. O proxy do Vite existe somente no servidor de desenvolvimento.

## Fluxos

- A página inicial permite escolher aluno ou professor e leva ao login correspondente. O link de registro abre outra tela.
- O registro cria a conta e realiza o login automaticamente. Senhas não são persistidas no navegador.
- O aluno entra na tela de dados cadastrais, incluindo seu nível A1 a C2 e objetivo de aprendizado. Ao salvar, segue para a busca de professores.
- A busca usa a filtragem da API: somente professores com nível estritamente superior ao aluno e horários livres no futuro. É possível pesquisar por nome ou especialidade.
- O aluno escolhe dia e período de uma hora e envia uma solicitação. Ela permanece pendente até o professor responder.
- O professor publica horários por datas concretas, consulta pedidos e aceita ou recusa cada solicitação.
- O aceite confirma a aula, ocupa o horário e recusa outros pedidos pendentes para o mesmo horário. O calendário de aluno e professor mostra apenas as aulas confirmadas.
- A recusa mantém o horário livre. Cada aluno pode solicitar um horário uma única vez, incluindo pedidos já recusados.
- A sessão fica no `sessionStorage`, sobrevive ao recarregamento da aba e termina ao sair, fechar a sessão do navegador ou expirar o JWT. A expiração leva novamente ao login.

As datas são exibidas no fuso `America/Recife` (horário de Brasília). As telas de calendário e solicitações têm botão de atualização para consultar mudanças feitas por outro usuário; não há notificações em tempo real nesta etapa.

Para experimentar o fluxo real: cadastre um professor com nível B2 ou superior, publique um horário futuro e cadastre um aluno A1. Solicite o horário como aluno, saia e entre como professor para aceitar. Confira então o calendário de ambos.

## Verificações

```bash
npm run build
npm run lint
npx playwright install chromium --only-shell
npm run test:e2e
```

Os testes Playwright iniciam o Vite e verificam no Chromium a escolha de perfil, registros, login, edição do perfil, solicitação, aceite, recusa, calendário, publicação de horários, recuperação de erros, expiração da sessão e interface móvel. As respostas da API são simuladas para isolar os testes de interface.

Os testes HTTP do backend exercitam controllers e services reais. Para verificar a persistência e os bloqueios transacionais no PostgreSQL, execute `AUTH_E2E_DATABASE=true npm run test:e2e` dentro de `backend/`, preferencialmente com um banco dedicado de testes.
