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
- O professor publica horários por datas concretas, consulta pedidos e aceita ou recusa cada solicitação. Ao aceitar, informa o link de uma reunião criada manualmente no Google Meet.
- O aceite confirma a aula, ocupa o horário e recusa outros pedidos pendentes para o mesmo horário. O calendário de aluno e professor mostra apenas as aulas confirmadas.
- A recusa mantém o horário livre. Cada aluno pode solicitar um horário uma única vez, incluindo pedidos já recusados.
- A sessão fica no `sessionStorage`, sobrevive ao recarregamento da aba e termina ao sair, fechar a sessão do navegador ou expirar o JWT. A expiração leva novamente ao login.

As datas são exibidas no fuso `America/Recife` (horário de Brasília). As telas de calendário e solicitações têm botão de atualização. O sino de notificações do aluno e o modal de uma aula ainda não iniciada consultam a API a cada 10 segundos enquanto a página estiver visível. Os avisos ficam salvos no banco, inclusive para o próximo acesso.

Para experimentar o fluxo real: cadastre um professor com nível B2 ou superior, publique um horário futuro e cadastre um aluno A1. Solicite o horário como aluno, saia e entre como professor para aceitar. No aceite, cole um link válido do Google Meet. No calendário do professor, escolha o dia e clique no ícone de vídeo da aula; o link pode ser corrigido antes de iniciar. Clique em **Iniciar aula** para abrir a chamada e notificar o aluno. Entre como aluno e use o sino de notificações ou o modal da aula para entrar na chamada. Para testar os dois perfis simultaneamente, use um navegador normal e uma janela anônima. Aplique primeiro a migration do backend com `npm run migration:run`.

## Verificações

```bash
npm run build
npm run lint
npx playwright install chromium --only-shell
npm run test:e2e
```

Os testes Playwright iniciam o Vite e verificam no Chromium a escolha de perfil, registros, login, edição do perfil, solicitação, aceite, recusa, calendário, publicação de horários, recuperação de erros, expiração da sessão, aceite com link, início da chamada, notificação automática, leitura persistente de avisos e interface móvel. As respostas da API são simuladas para isolar os testes de interface.

Os testes HTTP do backend exercitam controllers e services reais. Para verificar a persistência e os bloqueios transacionais no PostgreSQL, execute `AUTH_E2E_DATABASE=true npm run test:e2e` dentro de `backend/`, preferencialmente com um banco dedicado de testes.

Se a porta 5173 estiver em uso por outro servidor, execute os testes com `PLAYWRIGHT_PORT=5181 npm run test:e2e` para usar uma porta isolada.

## Títulos em Libras com VLibras

O olhinho **Libras** abre o painel oficial do VLibras e reproduz o sinal do título
com o avatar. O script é carregado apenas no primeiro uso e a mesma instância
é reaproveitada ao navegar entre as telas. Não precisa de chave de API nem de
vídeos locais. Os controles de pausa, repetição, velocidade, legendas, expansão
e fechamento pertencem ao widget.

Os títulos foram simplificados e estão definidos em
[src/lib/libras.ts](src/lib/libras.ts), junto com as glosas correspondentes:

| Tela | Título | Glosa |
| --- | --- | --- |
| Inicial | Aprender Libras | APRENDER LIBRAS |
| Escolha de perfil | Escolher perfil | ESCOLHER PERFIL |
| Login | Entrar | ENTRAR |
| Registro | Cadastro | CADASTRO |
| Busca de professores | Professores | PROFESSORES |
| Perfil do aluno/professor | Perfil | PERFIL |
| Solicitações do aluno/professor | Solicitações | SOLICITAÇÕES |
| Calendário | Calendário | CALENDÁRIO |
| Disponibilidade do professor | Agenda | AGENDA |

Cada sinal foi encontrado no [dicionário oficial](https://dicionario2.vlibras.gov.br/static/TREES/2018.3.1.json)
em 5 de outubro de 2026. O serviço fornece animações do avatar, e não um catálogo
de MP4. Para esses títulos usamos as glosas conhecidas diretamente, evitando
que uma tradução automática altere os termos escolhidos. Para os demais textos,
o widget mantém sua tradução habitual por seleção do conteúdo.

A integração segue o [carregamento oficial](https://www.vlibras.gov.br/doc/widget/installation/webpageintegration.html).
Os métodos `window.vlibras.play`, `stop` e `setOpen` foram verificados no
[código-fonte oficial](https://github.com/spbgovbr-vlibras/vlibras-web-browsers/blob/dev/src/widget/providers/sync/use-window-sync.ts)
e no script publicado 7.12.2. Como o serviço recebe atualizações, alterações nessa
interface podem exigir atualização de [src/lib/vlibras.ts](src/lib/vlibras.ts).

Para testar, execute o frontend normalmente e clique no olhinho. É necessário
acesso à internet e suporte a WebGL. A primeira abertura carrega o avatar e pode
demorar; há mensagem de carregamento e botão para cancelar. Erros mostram
**Tentar novamente**. Se o avatar não inicializar, recarregue a página.

Não há alterações de banco para esta integração. Em uma implantação com CSP,
permita os scripts, módulos, frames, arquivos e conexões utilizados pelo VLibras;
consulte a [documentação de CSP do projeto](https://www.vlibras.gov.br/doc/widget/).

Os testes Playwright simulam a interface do widget para verificar todos os títulos,
uma única carga do script por documento, recuperação de erro e cancelamento.
A validação do avatar real depende da disponibilidade do serviço externo.
Os sinais escolhidos e suas combinações ainda devem ser revisados por alguém
fluente em Libras para avaliar a adequação linguística.
