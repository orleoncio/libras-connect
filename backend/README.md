# Libras Connect — backend

API NestJS com PostgreSQL, TypeORM e autenticação JWT. `Aluno` e `Professor` herdam de `Usuario` no domínio. A persistência utiliza `usuarios`, `alunos` e `professores`; cada conta possui um perfil. Email é único entre os dois tipos e é normalizado para minúsculas.

Níveis aceitos: `A1`, `A2`, `B1`, `B2`, `C1`, `C2`. São os rótulos escolhidos pelo projeto, sem avaliação ou certificação automática de proficiência.

## Preparar o ambiente

Pré-requisitos: Node.js compatível com as dependências (recomendado 24.15 ou superior na série 24), npm, Docker Engine iniciado e Docker Compose v2 (`docker compose version`).

Execute a partir de `backend/`:

1. Instale as dependências e crie a configuração local:

   ```bash
   npm ci
   cp .env.example .env
   ```

2. Edite `.env`. Defina uma senha local para `DB_PASSWORD` e substitua `JWT_SECRET` por um segredo aleatório. Você pode gerar esse segredo com:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   ```

   Configuração de conexão para o backend executado na sua máquina:

   ```dotenv
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=libras_connect
   DB_USER=libras
   DB_PASSWORD=sua_senha_local
   JWT_SECRET=cole_aqui_o_segredo_gerado
   ```

   O Compose lê o mesmo `.env` e cria o banco e o usuário usando esses valores. Não publique `.env`; ele está no `.gitignore`.

3. Crie e inicie o contêiner:

   ```bash
   docker compose up -d --wait postgres
   docker compose ps
   ```

   A porta é publicada somente em `127.0.0.1`. Os dados persistem no volume `postgres_data`. Se 5432 estiver ocupada, escolha outra porta em `DB_PORT` (por exemplo 5433); o Compose e a aplicação usarão o mesmo valor.

   Se aparecer `permission denied` para `/var/run/docker.sock`, sua conta não tem acesso ao Docker. Em Linux com Docker instalado como serviço do sistema, execute os comandos Docker com `sudo` (por exemplo `sudo docker compose up -d --wait postgres`) ou configure o acesso da sua conta conforme sua instalação.

4. Crie as tabelas com a migration:

   ```bash
   npm run migration:run
   ```

   O comando compila o backend e executa as migrations pendentes. `synchronize` fica desabilitado; iniciar a aplicação não altera o esquema automaticamente.

5. Inicie a aplicação:

   ```bash
   npm run start:dev
   ```

   A API estará em `http://localhost:3000`.

6. Para conferir o banco diretamente:

   ```bash
   docker compose exec postgres psql -U libras -d libras_connect
   ```

   Use os valores de `DB_USER` e `DB_NAME` se os tiver alterado. Dentro do `psql`, `\dt` lista as tabelas e `\q` sai.

Se futuramente o backend também rodar em um contêiner da mesma rede Compose, configure `DB_HOST=postgres` e `DB_PORT=5432` **no ambiente do contêiner do backend**. Na máquina host, use `localhost` e a porta publicada. Esta etapa dockeriza somente o banco.

`POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` inicializam um volume vazio. Alterar `.env` depois da primeira inicialização não modifica as credenciais do banco existente; alterações devem ser feitas no PostgreSQL. `docker compose down` para os contêineres e preserva o volume. Não use `down -v` para uma parada normal: essa opção apaga os dados.

## Endpoints

| Método | Rota | Resultado |
| --- | --- | --- |
| POST | `/auth/alunos/registro` | 201, aluno cadastrado |
| POST | `/auth/professores/registro` | 201, professor cadastrado |
| POST | `/auth/alunos/login` | 200, JWT e dados do aluno |
| POST | `/auth/professores/login` | 200, JWT e dados do professor |
| GET | `/auth/me` | 200, usuário autenticado |

Cadastro de aluno:

```bash
curl -X POST http://localhost:3000/auth/alunos/registro \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Ana","email":"ana@example.com","telefone":"+5581999999999","nivelLibras":"A1","senha":"Senha123!","objetivoAprendizado":"Conversação"}'
```

Cadastro de professor:

```bash
curl -X POST http://localhost:3000/auth/professores/registro \
  -H 'Content-Type: application/json' \
  -d '{"nome":"João","email":"joao@example.com","telefone":"+5581988888888","nivelLibras":"C2","senha":"Senha123!","biografia":"Professor de Libras","especialidades":["Conversação"],"anosExperiencia":3}'
```

Login (para professor, substitua `alunos` por `professores` e use o email correspondente):

```bash
curl -X POST http://localhost:3000/auth/alunos/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","senha":"Senha123!"}'
```

Resposta: `accessToken`, `tokenType: "Bearer"`, `expiresIn: 3600` e `usuario`. Use o token retornado:

```bash
curl http://localhost:3000/auth/me \
  -H 'Authorization: Bearer COLE_O_ACCESS_TOKEN'
```

Senhas usam bcrypt com custo 12 e limite de 72 bytes UTF-8 (mínimo de 8 caracteres). Hashes nunca são retornados e não são selecionados nas consultas comuns. O JWT usa HS256 e expira em uma hora. Não há refresh token nesta etapa; após expirar, faça login novamente.

Campos adicionais são rejeitados. Email duplicado retorna 409; dados inválidos, 400; credenciais incorretas, perfil errado no login e tokens inválidos ou expirados, 401. O cadastro de usuário e perfil ocorre em uma única transação.

## Validação

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

Os testes HTTP padrão simulam somente a persistência; usam controllers, validação, hashing e JWT reais. Para executar a mesma suíte contra o PostgreSQL configurado no `.env`:

```bash
AUTH_E2E_DATABASE=true npm run test:e2e
```

Essa opção executa migrations pendentes e cria contas de teste com emails únicos, removidas ao final. Prefira um banco dedicado de testes para essa execução. Ela verifica também o armazenamento dos hashes, os perfis e a restrição de email único no PostgreSQL.

## Organização dos pacotes

```text
src/
  entity/       # classes de domínio e mapeamentos TypeORM
  controller/   # endpoints HTTP
  service/      # regras de negócio e transações
  dto/          # validação dos dados de entrada
  auth/         # módulo JWT e guards de autenticação/autorização
  modules/      # composição dos módulos NestJS
  database/     # configuração, data source e migrations
  main.ts
```

Os services usam os repositories e o EntityManager do TypeORM diretamente. As rotas de autenticação permanecem iguais após a reorganização.

## Horários dos professores e aulas

Aplique a nova migration com o banco iniciado, a partir de `backend/`:

```bash
npm run migration:run
```

A migration cria `horarios_professores` e `aulas`. Ela habilita `btree_gist` para uma restrição de exclusão que impede intervalos sobrepostos para o mesmo professor, inclusive em cadastros concorrentes. O usuário das migrations precisa de permissão para criar a extensão; o usuário criado pelo Compose fornecido tem essa permissão. Referência: [restrições de exclusão do PostgreSQL](https://www.postgresql.org/docs/17/rangetypes.html#RANGETYPES-CONSTRAINT).

### Cadastro semanal

`POST /professores/me/horarios`, com `Authorization: Bearer TOKEN_DO_PROFESSOR`:

```json
{
  "horarios": [
    { "inicio": "2030-10-07T14:00:00-03:00" },
    { "inicio": "2030-10-07T15:00:00-03:00" }
  ]
}
```

Substitua as datas do exemplo pelas datas futuras desejadas. Cada entrada deve ter data, hora, segundos e um fuso explícito (`Z` ou `±HH:MM`). O lote aceita de 1 a 168 entradas, cujos inícios devem pertencer à mesma semana, de segunda a domingo, considerando `America/Recife`. Os horários são armazenados como instantes com fuso e retornados em UTC. Não há recorrência automática.

A resposta 201 é uma lista ordenada pelo início. Cada item contém `id`, `professorId`, `inicio`, `fim`, `livre` e `criadoEm`. `fim` é calculado como início + uma hora e `livre` inicia como `true`. O professor vem do JWT; não envie `professorId`, `fim` ou `livre` no corpo.

Horários consecutivos são permitidos (14h–15h e 15h–16h); horários duplicados ou parcialmente sobrepostos são rejeitados com 409. O lote é atômico: se um horário conflitar, nenhum item daquele lote será salvo. Sobreposições são rejeitadas independentemente do atributo `livre`. Sem token, retorna 401; aluno ou conta sem perfil de professor recebe 403; dados inválidos, horários passados e semanas diferentes recebem 400.

### Entidade Aula

`Aula` contém `id`, `horarioId`, `alunoId` e `criadoEm`. As FKs referenciam o horário e o perfil de aluno. O professor é obtido pelo horário. `horarioId` é único, permitindo uma aula por horário; as referências de aulas impedem excluir seus horários ou alunos.

O fluxo de solicitações está implementado: o aceite pelo professor cria a aula e define `livre=false` na mesma transação. Uma solicitação pendente não cria aula nem ocupa o horário.

A suíte `npm run test:e2e` cobre também os endpoints de horários. `AUTH_E2E_DATABASE=true npm run test:e2e` usa PostgreSQL real e inclui a verificação da duração de uma hora, das FKs de aula e da unicidade de aula por horário. Sem essa variável, a persistência é simulada e esse teste específico do banco é omitido.

## Solicitações, perfis e calendário

Aplique a migration adicional com `npm run migration:run`. Ela cria `solicitacoes`, com FKs para aluno e horário e os estados `pendente`, `aceita` e `recusada`.

Todas as rotas abaixo exigem JWT:

| Método | Rota | Acesso / função |
| --- | --- | --- |
| PATCH | `/alunos/me` | Aluno, atualizar nome, email, telefone, nível e objetivo |
| PATCH | `/professores/me` | Professor, atualizar dados cadastrais, biografia, especialidades e experiência |
| GET | `/professores` | Aluno, professores de nível superior com horários livres futuros |
| GET | `/professores/me/horarios` | Professor, seus horários cadastrados |
| POST | `/solicitacoes` | Aluno, enviar `{ "horarioId": "UUID" }` |
| GET | `/solicitacoes` | Cada perfil consulta suas próprias solicitações |
| PATCH | `/solicitacoes/:id/aceitar` | Professor responsável, confirmar uma aula |
| PATCH | `/solicitacoes/:id/recusar` | Professor responsável, recusar um pedido |
| GET | `/aulas` | Cada perfil consulta suas próprias aulas para o calendário |

Os PATCH de perfil recebem todos os campos cadastrais do respectivo perfil, sem senha. Os PATCH de aceite e recusa não precisam de corpo. Para obter o perfil atualizado após o PATCH, use `/auth/me`.

A ordem de níveis é A1 < A2 < B1 < B2 < C1 < C2. O filtro é aplicado na API, e a regra de nível superior também é validada ao solicitar o horário. Alunos C2 não encontram professores de nível superior dentro dessa escala.

Um horário livre pode receber pedidos de vários alunos. Ao aceitar um pedido, a transação bloqueia o perfil do aluno e o horário, verifica a disponibilidade e conflitos com outras aulas do aluno, cria a aula, ocupa o horário e recusa os outros pedidos pendentes desse horário. O bloqueio do aluno serializa aceites para ele mesmo quando feitos por professores diferentes. Pedidos pendentes para outros horários não são recusados automaticamente; um aceite posterior que conflite será rejeitado com 409.

A recusa não ocupa o horário e não cria aula. Há uma restrição única por aluno e horário: um pedido já enviado não pode ser reenviado. Não há cancelamento de aulas ou pedidos nesta etapa. Os dados retornados em listagens não incluem emails, telefones ou hashes dos outros usuários.

`FRONTEND_ORIGIN` define a origem aceita pelo CORS (padrão `http://localhost:5173`); várias origens podem ser separadas por vírgulas. Em desenvolvimento o frontend também usa o proxy `/api` do Vite.

A suíte HTTP inclui os fluxos de busca, atualização cadastral, pedido, aceite, recusa, privacidade entre perfis e conflitos. Por padrão a persistência é simulada. `AUTH_E2E_DATABASE=true npm run test:e2e` executa os mesmos fluxos no PostgreSQL configurado no `.env`, com contas temporárias removidas ao final.
