import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type {
  AppNotification,
  Booking,
  Lesson,
  Slot,
  User,
} from "../src/types";

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes("Invalid regular expression")
    )
      errors.push(message.text());
  });
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

async function setup(page: Page) {
  const aluno: User = {
    id: "aluno-id",
    tipo: "aluno",
    nome: "Ana Santos",
    email: "ana@example.com",
    telefone: "+5581999999999",
    nivelLibras: "A1",
    objetivoAprendizado: "Conversação",
  };
  const professor: User = {
    id: "professor-id",
    tipo: "professor",
    nome: "Marina Oliveira",
    email: "marina@example.com",
    telefone: "+5581988888888",
    nivelLibras: "C1",
    biografia:
      "Libras para abrir caminhos. Aulas acolhedoras e práticas para o seu dia a dia.",
    especialidades: ["Conversação", "Iniciantes"],
    anosExperiencia: 5,
  };
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Recife",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + 2 * 86400000));
  const slot: Slot = {
    id: "horario-id",
    inicio: `${day}T14:00:00-03:00`,
    fim: `${day}T15:00:00-03:00`,
    professorId: professor.id,
    livre: true,
  };
  const state = {
    role: "aluno",
    requests: [] as Booking[],
    lessons: [] as Lesson[],
    notifications: [] as AppNotification[],
    slots: [slot],
    empty: false,
    fail: false,
    expire: false,
    registrations: [] as Record<string, unknown>[],
  };
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api", "");
    const method = req.method();
    const body = req.postDataJSON() as Record<string, unknown> | null;
    const user = state.role === "aluno" ? aluno : professor;
    let response: unknown;
    if (path.endsWith("/registro")) {
      state.registrations.push(body!);
      response = { ...body, id: "novo-id" };
    } else if (path.endsWith("/login")) {
      state.role = path.includes("/alunos/") ? "aluno" : "professor";
      response = {
        accessToken: "test-token",
        usuario: state.role === "aluno" ? aluno : professor,
      };
    } else if (state.expire) {
      await route.fulfill({ status: 401, json: { message: "Token expirado" } });
      return;
    } else if (path === "/auth/me") response = user;
    else if (path === "/alunos/me" || path === "/professores/me") {
      Object.assign(user, body);
      response = { mensagem: "Perfil atualizado" };
    } else if (path === "/professores") {
      if (state.fail) {
        await route.fulfill({
          status: 503,
          json: { message: "Serviço temporariamente indisponível" },
        });
        return;
      }
      response = state.empty
        ? []
        : [
            {
              ...professor,
              horarios: state.slots.filter((item) => item.livre),
            },
          ].filter((item) => item.horarios.length);
    } else if (path === "/professores/me/horarios") {
      if (method === "POST") {
        const slots = (body!.horarios as { inicio: string }[]).map(
          (item, index) => ({
            id: `novo-horario-${index}`,
            inicio: item.inicio,
            fim: new Date(
              new Date(item.inicio).getTime() + 3600000,
            ).toISOString(),
            livre: true,
          }),
        );
        state.slots.push(...slots);
        response = slots;
      } else response = state.slots;
    } else if (path === "/solicitacoes" && method === "POST") {
      const item: Booking = {
        id: "pedido-id",
        horarioId: String(body!.horarioId),
        status: "pendente",
        inicio: slot.inicio,
        fim: slot.fim,
        alunoNome: aluno.nome,
        alunoNivel: aluno.nivelLibras,
        professorNome: professor.nome,
        criadoEm: new Date().toISOString(),
      };
      state.requests.push(item);
      response = item;
    } else if (path === "/solicitacoes") response = state.requests;
    else if (path.endsWith("/aceitar")) {
      state.requests[0].status = "aceita";
      state.slots[0].livre = false;
      state.lessons.push({
        id: "aula-id",
        horarioId: slot.id,
        inicio: slot.inicio,
        fim: slot.fim,
        alunoNome: aluno.nome,
        professorNome: professor.nome,
        linkMeet: String(body!.linkMeet),
        iniciadaEm: null,
      });
      response = state.lessons[0];
    } else if (path.endsWith("/recusar")) {
      state.requests[0].status = "recusada";
      response = state.requests[0];
    } else if (path === "/notificacoes") response = state.notifications;
    else if (path.endsWith("/lida")) {
      const n = state.notifications[0];
      n.lidaEm = new Date().toISOString();
      response = n;
    } else if (path.endsWith("/iniciar")) {
      const lesson = state.lessons[0];
      if (!lesson.iniciadaEm) {
        lesson.iniciadaEm = new Date().toISOString();
        state.notifications.push({
          id: "notification-id",
          aulaId: lesson.id,
          criadoEm: lesson.iniciadaEm,
          lidaEm: null,
          linkMeet: lesson.linkMeet!,
          inicio: lesson.inicio,
          professorNome: professor.nome,
        });
      }
      response = lesson;
    } else if (path.endsWith("/link")) {
      state.lessons[0].linkMeet = String(body!.linkMeet);
      response = state.lessons[0];
    } else if (path === "/aulas")
      response = state.lessons.map((l) => ({
        ...l,
        linkMeet:
          state.role === "professor" || l.iniciadaEm ? l.linkMeet : null,
      }));
    else if (path === "/aulas/aula-id")
      response = {
        ...state.lessons[0],
        linkMeet:
          state.role === "professor" || state.lessons[0].iniciadaEm
            ? state.lessons[0].linkMeet
            : null,
      };
    else {
      await route.fulfill({
        status: 404,
        json: { message: `Endpoint inesperado: ${method} ${path}` },
      });
      return;
    }
    await route.fulfill({
      status: method === "POST" && !path.endsWith("/login") ? 201 : 200,
      json: response,
    });
  });
  return state;
}
async function login(page: Page, role: "aluno" | "professor") {
  await page.goto(`/#/${role}/login`);
  await page
    .getByLabel("Email", { exact: true })
    .fill(role === "aluno" ? "ana@example.com" : "marina@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("Senha123!");
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
}

test("escolha de perfil leva a login e registro em telas distintas", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Aprender Libras" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Quero aprender/ }).click();
  await expect(page).toHaveURL(/aluno\/login/);
  await page.getByRole("link", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/aluno\/registro/);
  await expect(page.getByLabel("Nome completo")).toBeVisible();
  await page.getByRole("link", { name: "Trocar perfil" }).click();
  await page.getByRole("link", { name: /Quero ensinar/ }).click();
  await expect(page).toHaveURL(/professor\/login/);
});

test("aluno solicita, professor aceita e ambos veem a aula no calendário", async ({
  page,
}) => {
  const state = await setup(page);
  await login(page, "aluno");
  await expect(page.getByRole("heading", { name: "Perfil" })).toBeVisible();
  await page.getByLabel("Seu nível de Libras").selectOption("A2");
  await page
    .getByRole("button", { name: "Salvar e encontrar professores" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Marina Oliveira" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Escolher dia e horário" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "14:00 – 15:00", exact: true })
    .click();
  await page.getByRole("button", { name: "Enviar solicitação" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Solicitação enviada" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Solicitações", exact: true }).click();
  await expect(
    page.getByText("Aguardando resposta", { exact: true }),
  ).toBeVisible();
  expect(state.lessons).toHaveLength(0);
  await page.getByRole("link", { name: "Meu calendário" }).click();
  await expect(
    page.getByText("Você ainda não tem aulas confirmadas para este dia."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair da plataforma" }).click();
  await login(page, "professor");
  await page.getByRole("button", { name: "Aceitar aula" }).click();
  await page
    .getByLabel("Link do Google Meet")
    .fill("https://example.com/invalid");
  await page
    .getByRole("button", { name: "Confirmar aula e salvar link" })
    .click();
  await expect(
    page.getByText(/Informe um link válido do Google Meet/),
  ).toBeVisible();
  expect(state.lessons).toHaveLength(0);
  await page
    .getByLabel("Link do Google Meet")
    .fill("https://meet.google.com/abc-defg-hij");
  await page
    .getByRole("button", { name: "Confirmar aula e salvar link" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Aula confirmada" }),
  ).toBeVisible();
  expect(state.lessons).toHaveLength(1);
  await page.getByRole("link", { name: "Meu calendário" }).click();
  await expect(page.getByLabel("Calendário de aulas")).toBeVisible();
  // O horário pode pertencer ao mês seguinte quando o teste roda no fim do mês.
  for (
    let i = 0;
    i < 2 &&
    (await page.getByRole("button", { name: /, 1 aulas$/ }).count()) === 0;
    i++
  )
    await page.getByRole("button", { name: "Próximo mês" }).click();
  await page.getByRole("button", { name: /, 1 aulas$/ }).click();
  await expect(page.getByRole("heading", { name: "Ana Santos" })).toBeVisible();
  expect(state.notifications).toHaveLength(0);
  await page.getByRole("button", { name: "Abrir aula com Ana Santos" }).click();
  await expect(
    page.getByRole("button", { name: "Iniciar aula", exact: true }),
  ).toBeVisible();
  // Simula bloqueio de pop-up: o link de entrada deve continuar disponível.
  await page.evaluate(() => {
    window.open = () => null;
  });
  await page.getByRole("button", { name: "Iniciar aula", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Entrar no Google Meet" }),
  ).toHaveAttribute("href", "https://meet.google.com/abc-defg-hij");
  expect(state.notifications).toHaveLength(1);
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Sair da plataforma" }).click();
  await login(page, "aluno");
  await page.getByRole("link", { name: "Meu calendário" }).click();
  await expect(page.getByLabel("Calendário de aulas")).toBeVisible();
  for (
    let i = 0;
    i < 2 &&
    (await page.getByRole("button", { name: /, 1 aulas$/ }).count()) === 0;
    i++
  )
    await page.getByRole("button", { name: "Próximo mês" }).click();
  await page.getByRole("button", { name: /, 1 aulas$/ }).click();
  await expect(
    page.getByRole("heading", { name: "Marina Oliveira" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Abrir aula com Marina Oliveira" })
    .click();
  await expect(
    page.getByRole("link", { name: "Entrar na chamada" }),
  ).toHaveAttribute("href", "https://meet.google.com/abc-defg-hij");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Notificações, 1 não lidas" }).click();
  await expect(
    page.getByRole("dialog").getByRole("link", { name: /Entrar/ }),
  ).toHaveAttribute("href", "https://meet.google.com/abc-defg-hij");
  await page.getByRole("button", { name: "Marcar como lida" }).click();
  await expect(
    page.getByRole("button", { name: "Notificações, 0 não lidas" }),
  ).toBeVisible();
});

test("registro de aluno autentica automaticamente e sessão resiste ao recarregamento", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/#/aluno/registro");
  await page.getByLabel("Nome completo").fill("Ana Santos");
  await page.getByLabel("Telefone").fill("+5581999999999");
  await page.getByLabel("Email", { exact: true }).fill("ana@example.com");
  await page.getByLabel("Senha").fill("Senha123!");
  await page.getByRole("button", { name: "Criar conta e entrar" }).click();
  await expect(page.getByRole("heading", { name: "Perfil" })).toBeVisible();
  expect(state.registrations[0].nivelLibras).toBe("A1");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Perfil" })).toBeVisible();
});

test("professor se registra e publica uma disponibilidade de uma hora", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/#/professor/registro");
  await page.getByLabel("Nome completo").fill("Marina Oliveira");
  await page.getByLabel("Telefone").fill("+5581988888888");
  await page.getByLabel("Email", { exact: true }).fill("marina@example.com");
  await page.getByLabel("Senha").fill("Senha123!");
  await page.getByLabel("Seu nível de Libras").selectOption("C1");
  await page.getByLabel("Sobre você").fill("Aulas práticas e acolhedoras.");
  await page.getByLabel("Especialidades").fill("Conversação, Iniciantes");
  await page.getByLabel("Anos de experiência").fill("5");
  await page.getByRole("button", { name: "Criar conta e entrar" }).click();
  await expect(
    page.getByRole("heading", { name: "Solicitações" }),
  ).toBeVisible();
  expect(state.registrations[0].especialidades).toEqual([
    "Conversação",
    "Iniciantes",
  ]);
  await page.getByRole("link", { name: "Meus horários" }).click();
  await page.getByLabel("Dia e horário de início").fill("2030-10-07T16:00");
  await page.getByRole("button", { name: "Adicionar à lista" }).click();
  await page.getByRole("button", { name: "Publicar 1 horário" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Horários publicados" }),
  ).toBeVisible();
  expect(state.slots).toHaveLength(2);
  expect(
    new Date(state.slots[1].fim).getTime() -
      new Date(state.slots[1].inicio).getTime(),
  ).toBe(3600000);
});

test("estados vazios, erro com nova tentativa e expiração da sessão", async ({
  page,
}) => {
  const state = await setup(page);
  state.empty = true;
  await login(page, "aluno");
  await page.getByRole("link", { name: "Encontrar professores" }).click();
  await expect(
    page.getByRole("heading", { name: "Novas conexões estão a caminho." }),
  ).toBeVisible();
  state.fail = true;
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Serviço temporariamente indisponível",
  );
  state.fail = false;
  state.empty = false;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("heading", { name: "Marina Oliveira" }),
  ).toBeVisible();
  state.expire = true;
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Sua sessão expirou");
});

test("interface móvel sem rolagem horizontal e modal acessível pelo teclado", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await setup(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Escolher perfil" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/libras-welcome-mobile.png",
    fullPage: true,
  });
  await login(page, "aluno");
  await page.getByRole("link", { name: "Encontrar professores" }).click();
  await page.getByRole("button", { name: "Escolher dia e horário" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/libras-teachers-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "/tmp/libras-teachers-desktop.png",
    fullPage: true,
  });
});

test("professor recusa pedido sem criar aula ou ocupar horário", async ({
  page,
}) => {
  const state = await setup(page);
  state.requests.push({
    id: "pedido-id",
    horarioId: state.slots[0].id,
    status: "pendente",
    inicio: state.slots[0].inicio,
    fim: state.slots[0].fim,
    alunoNome: "Ana Santos",
    alunoNivel: "A1",
    professorNome: "Marina Oliveira",
    criadoEm: new Date().toISOString(),
  });
  await login(page, "professor");
  await page.getByRole("button", { name: "Recusar", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Solicitação recusada" }),
  ).toBeVisible();
  expect(state.requests[0].status).toBe("recusada");
  expect(state.lessons).toHaveLength(0);
  expect(state.slots[0].livre).toBe(true);
});

test("aluno recebe aviso e link enquanto aguarda o início da aula", async ({
  page,
}) => {
  const state = await setup(page);
  const slot = state.slots[0];
  state.lessons.push({
    id: "aula-id",
    horarioId: slot.id,
    inicio: slot.inicio,
    fim: slot.fim,
    alunoNome: "Ana Santos",
    professorNome: "Marina Oliveira",
    linkMeet: "https://meet.google.com/abc-defg-hij",
    iniciadaEm: null,
  });
  await login(page, "aluno");
  await expect(
    page.getByRole("button", { name: "Notificações, 0 não lidas" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Meu calendário" }).click();
  await expect(page.getByLabel("Calendário de aulas")).toBeVisible();
  for (
    let i = 0;
    i < 2 &&
    (await page.getByRole("button", { name: /, 1 aulas$/ }).count()) === 0;
    i++
  )
    await page.getByRole("button", { name: "Próximo mês" }).click();
  await page.getByRole("button", { name: /, 1 aulas$/ }).click();
  await page
    .getByRole("button", { name: "Abrir aula com Marina Oliveira" })
    .click();
  await expect(page.getByText(/Aguardando o professor iniciar/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Entrar na chamada" }),
  ).toHaveCount(0);
  const started = new Date().toISOString();
  state.lessons[0].iniciadaEm = started;
  state.notifications.push({
    id: "notification-id",
    aulaId: "aula-id",
    criadoEm: started,
    lidaEm: null,
    linkMeet: state.lessons[0].linkMeet!,
    inicio: slot.inicio,
    professorNome: "Marina Oliveira",
  });
  await expect(
    page.getByRole("dialog").getByRole("link", { name: "Entrar na chamada" }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.getByText("Sua aula vai começar!")).toBeVisible({
    timeout: 15000,
  });
  await expect(
    page.getByRole("status").getByRole("link", { name: "Entrar na chamada" }),
  ).toHaveAttribute("href", "https://meet.google.com/abc-defg-hij");
  await page.getByRole("button", { name: "Notificações, 1 não lidas" }).click();
  await page.getByRole("button", { name: "Marcar como lida" }).click();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Notificações, 0 não lidas" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Notificações, 0 não lidas" }).click();
  await expect(
    page.getByRole("dialog").getByRole("link", { name: "Entrar na chamada" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/libras-connect-notificacao-mobile.png" });
});

test("olhinho abre VLibras e reproduz o sinal correspondente sem duplicar o widget", async ({
  page,
}) => {
  await setup(page);
  let loads = 0;
  await page.route(
    "https://vlibras.gov.br/app/vlibras-plugin.js",
    async (route) => {
      loads++;
      await route.fulfill({
        contentType: "application/javascript",
        body: `
      window.testGlosses = [];
      window.VLibrasWidget = {open() {
        if (!document.getElementById("vlibras-app-root")) {
          const root = document.createElement("section"); root.id="vlibras-app-root"; root.style.cssText="position:fixed;right:12px;top:100px;width:240px;z-index:2147483647;background:white;padding:12px;"; root.setAttribute("aria-label","Painel VLibras");
          const label = document.createElement("p"); label.id="test-vlibras-gloss"; root.append(label);
          const close = document.createElement("button"); close.textContent="Fechar VLibras"; close.onclick=()=>window.vlibras.setOpen(false); root.append(close); document.body.append(root);
          window.vlibras = {isLoaded:true,isPlayingWelcome:true,isWelcomeFinished:false,status:"idle",stop(){},setOpen(value){root.hidden=!value;},play(gloss){window.vlibras.isPlayingWelcome=false;window.vlibras.isWelcomeFinished=true;window.testGlosses.push(gloss); label.textContent=gloss;}};
        }
        if (!window.vlibras.isWelcomeFinished) setTimeout(() => {window.vlibras.status="playing";document.getElementById("test-vlibras-gloss").textContent="APRESENTAÇÃO DO AVATAR";},500);
        window.vlibras.setOpen(true);
      }};
    `,
      });
    },
  );
  await page.goto("/");
  expect(loads).toBe(0);
  await page
    .getByRole("button", { name: "Ver em Libras: Aprender Libras" })
    .click();
  await expect(page.getByLabel("Painel VLibras")).toBeVisible();
  await expect(page.locator("#test-vlibras-gloss")).toHaveText(
    "APRENDER LIBRAS",
  );
  await page.getByRole("button", { name: "Fechar VLibras" }).click();
  await page
    .getByRole("button", { name: "Ver em Libras: Escolher perfil" })
    .click();
  await expect(page.locator("#test-vlibras-gloss")).toHaveText(
    "ESCOLHER PERFIL",
  );
  await page.getByRole("button", { name: "Fechar VLibras" }).click();
  await page.getByRole("link", { name: /Quero aprender/ }).click();
  await page.getByRole("button", { name: "Ver em Libras: Entrar" }).click();
  await expect(page.locator("#test-vlibras-gloss")).toHaveText("ENTRAR");
  await page.getByRole("button", { name: "Fechar VLibras" }).click();
  await page.getByRole("link", { name: "Criar minha conta" }).click();
  await page.getByRole("button", { name: "Ver em Libras: Cadastro" }).click();
  await expect(page.locator("#test-vlibras-gloss")).toHaveText("CADASTRO");
  await page.getByRole("button", { name: "Fechar VLibras" }).click();
  await login(page, "aluno");
  for (const [title, menu, gloss] of [
    ["Perfil", "Meu perfil", "PERFIL"],
    ["Professores", "Encontrar professores", "PROFESSORES"],
    ["Solicitações", "Solicitações", "SOLICITAÇÕES"],
    ["Calendário", "Meu calendário", "CALENDÁRIO"],
  ]) {
    await page.getByRole("link", { name: menu, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Ver em Libras: " + title }).click();
    await expect(page.locator("#test-vlibras-gloss")).toHaveText(gloss);
    await page.getByRole("button", { name: "Fechar VLibras" }).click();
  }
  await page.getByRole("button", { name: "Sair da plataforma" }).click();
  await login(page, "professor");
  await page.getByRole("link", { name: "Meus horários" }).click();
  await page.getByRole("button", { name: "Ver em Libras: Agenda" }).click();
  await expect(page.locator("#test-vlibras-gloss")).toHaveText("AGENDA");
  expect(loads).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("falha de rede permite tentar novamente e cancelar carregamento do avatar", async ({
  page,
}) => {
  await setup(page);
  let loads = 0;
  await page.route(
    "https://vlibras.gov.br/app/vlibras-plugin.js",
    async (route) => {
      if (++loads === 1) return route.abort("failed");
      await route.fulfill({
        contentType: "application/javascript",
        body: `
      window.VLibrasWidget={open(){window.testOpen=true;}};
    `,
      });
    },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ver em Libras: Aprender Libras" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível carregar o VLibras",
  );
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByText("Carregando avatar do VLibras…")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar tradução" }).click();
  await expect(page.getByText("Carregando avatar do VLibras…")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Ver em Libras: Aprender Libras" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Ver em Libras: Aprender Libras" }),
  ).toBeFocused();
  expect(loads).toBe(2);
});
