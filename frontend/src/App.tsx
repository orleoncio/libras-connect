import { useEffect, useState } from "react";
import type { User } from "./types";
import { api, tokenStore } from "./lib/api";
import { initials } from "./lib/date";
import { navigate, useRoute } from "./hooks/useRoute";
import Icon from "./components/Icon";
import { Brand, Feedback } from "./components/ui";
import Welcome from "./pages/Welcome";
import Access from "./pages/Access";
import Profile from "./pages/Profile";
import Teachers from "./pages/Teachers";
import Requests from "./pages/Requests";
import Calendar from "./pages/Calendar";
import Availability from "./pages/Availability";
import NotificationsBell from "./components/NotificationsBell";
import "./App.css";

export default function App() {
  const route = useRoute();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !!tokenStore.get());
  const [sessionError, setSessionError] = useState("");
  useEffect(() => {
    if (!tokenStore.get()) return;
    const controller = new AbortController();
    api<User>("/auth/me", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setUser(data);
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          tokenStore.clear();
          setSessionError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  const role = user?.tipo;
  useEffect(() => {
    const expired = () => {
      tokenStore.clear();
      setUser(null);
      setSessionError("Sua sessão expirou. Entre novamente para continuar.");
      navigate(`/${role || "aluno"}/login`);
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, [role]);
  function login(data: User) {
    setUser(data);
    setSessionError("");
    navigate(data.tipo === "aluno" ? "/app/perfil" : "/app/solicitacoes");
  }
  function logout() {
    tokenStore.clear();
    setUser(null);
    setSessionError("");
    navigate("/");
  }
  if (loading)
    return (
      <div className="boot-screen">
        <Brand />
        <div className="loading" role="status">
          <span className="spinner" />
          Preparando sua próxima conexão…
        </div>
      </div>
    );
  if (!user) {
    const match = /^\/(aluno|professor)\/(login|registro)$/.exec(route);
    return (
      <>
        {sessionError && (
          <div className="session-notice">
            <Feedback error={sessionError} />
          </div>
        )}
        {match ? (
          <Access
            key={route}
            role={match[1] as "aluno" | "professor"}
            register={match[2] === "registro"}
            onLogin={login}
          />
        ) : (
          <Welcome />
        )}
      </>
    );
  }
  const items = [
    ...(user.tipo === "aluno"
      ? [
          {
            path: "professores",
            label: "Encontrar professores",
            icon: "people",
          },
        ]
      : [{ path: "horarios", label: "Meus horários", icon: "clock" }]),
    { path: "solicitacoes", label: "Solicitações", icon: "message" },
    { path: "calendario", label: "Meu calendário", icon: "calendar" },
    { path: "perfil", label: "Meu perfil", icon: "user" },
  ];
  const requested = route.split("/")[2];
  const page = items.some((item) => item.path === requested)
    ? requested
    : user.tipo === "aluno"
      ? "perfil"
      : "solicitacoes";
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Pular para conteúdo
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">
          ESPAÇO DO {user.tipo === "aluno" ? "ALUNO" : "PROFESSOR"}
        </div>
        <nav aria-label="Menu principal">
          {items.map((item) => (
            <a
              key={item.path}
              href={`#/app/${item.path}`}
              className={page === item.path ? "active" : ""}
              aria-current={page === item.path ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {page === item.path && <span className="nav-indicator" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <Icon name="spark" size={25} />
          <h3>
            Pequenos passos.
            <br />
            Grandes conexões.
          </h3>
          <p>Reserve um tempo para aprender algo novo hoje.</p>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar small-avatar">{initials(user.nome)}</span>
          <div>
            <strong>{user.nome}</strong>
            <span>Libras {user.nivelLibras}</span>
          </div>
          <button
            className="icon-button"
            aria-label="Sair da plataforma"
            onClick={logout}
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-header">
          <span>Uma nova conexão começa com você.</span>
          <div>
            {user.tipo === "aluno" && <NotificationsBell key={user.id} />}
            <span className="header-date">
              {new Intl.DateTimeFormat("pt-BR", {
                day: "numeric",
                month: "long",
                timeZone: "America/Recife",
              }).format(new Date())}
            </span>
            <span className="badge">
              {user.tipo === "aluno" ? "Aluno" : "Professor"} ·{" "}
              {user.nivelLibras}
            </span>
          </div>
        </header>
        <main id="main-content" className="app-content" tabIndex={-1}>
          {page === "perfil" && (
            <Profile key={user.id} user={user} onUpdate={setUser} />
          )}
          {page === "professores" && <Teachers />}
          {page === "solicitacoes" && <Requests role={user.tipo} />}
          {page === "calendario" && <Calendar role={user.tipo} />}
          {page === "horarios" && <Availability />}
          <footer className="app-footer">
            <span>Libras conecta. Você faz parte.</span>
            <span>Aprendizado no seu ritmo.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
