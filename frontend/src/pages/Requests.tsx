import { useState } from "react";
import { api, json } from "../lib/api";
import { dayLabel, rangeLabel } from "../lib/date";
import { useNow } from "../hooks/useNow";
import { useRemote } from "../hooks/useRemote";
import type { Booking, Role } from "../types";
import { Empty, Feedback, PageHeading, RemoteState } from "../components/ui";
import Icon from "../components/Icon";
const labels = {
  pendente: "Aguardando resposta",
  aceita: "Confirmada",
  recusada: "Não confirmada",
};
export default function Requests({ role }: { role: Role }) {
  const now = useNow();
  const remote = useRemote<Booking[]>("/solicitacoes");
  const [filter, setFilter] = useState("todas");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function decide(id: string, accept: boolean) {
    setBusy(id);
    setError("");
    setSuccess("");
    try {
      await api(
        `/solicitacoes/${id}/${accept ? "aceitar" : "recusar"}`,
        json("PATCH"),
      );
      setSuccess(
        accept
          ? "Aula confirmada! Ela já está no seu calendário e no do aluno."
          : "Solicitação recusada. O horário continua disponível.",
      );
      remote.refresh();
    } catch (err) {
      setError((err as Error).message);
      remote.refresh();
    } finally {
      setBusy("");
    }
  }
  const filtered = remote.data?.filter(
    (item) => filter === "todas" || item.status === filter,
  );
  const pending =
    remote.data?.filter((item) => item.status === "pendente").length || 0;
  return (
    <>
      <PageHeading
        eyebrow={
          role === "professor" ? "NOVAS CONEXÕES" : "ACOMPANHE SEUS ENCONTROS"
        }
        title={
          role === "professor"
            ? "Quem quer aprender com você."
            : "Suas solicitações."
        }
        description={
          role === "professor"
            ? "Aceite uma solicitação para confirmar a aula e reservar o horário."
            : "O primeiro passo está dado. Agora é só acompanhar o retorno do professor."
        }
        action={
          <button
            className="button secondary"
            onClick={remote.refresh}
            disabled={remote.loading}
          >
            Atualizar
          </button>
        }
      />
      <div className="stat-strip">
        <span className="soft-icon">
          <Icon name="message" />
        </span>
        <div>
          <strong>
            {pending}{" "}
            {pending === 1
              ? "solicitação aguardando resposta"
              : "solicitações aguardando resposta"}
          </strong>
          <p className="muted">
            {role === "professor"
              ? "Cada novo encontro é uma oportunidade de compartilhar."
              : "Somente aulas aceitas aparecem no seu calendário."}
          </p>
        </div>
      </div>
      <Feedback error={error} success={success} />
      <div
        className="filter-tabs"
        role="group"
        aria-label="Filtrar solicitações"
      >
        {[
          ["todas", "Todas"],
          ["pendente", "Pendentes"],
          ["aceita", "Confirmadas"],
          ["recusada", "Não confirmadas"],
        ].map(([value, label]) => (
          <button
            className={filter === value ? "active" : ""}
            key={value}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
          >
            {label}
          </button>
        ))}
      </div>
      <RemoteState
        loading={remote.loading}
        error={remote.error}
        retry={remote.refresh}
      />
      {!remote.loading &&
        !remote.error &&
        (filtered?.length ? (
          <div className="request-list">
            {filtered.map((item) => {
              const expired = new Date(item.inicio).getTime() <= now;
              return (
                <article className="panel request-card" key={item.id}>
                  <span className="request-icon">
                    <Icon name="calendar" size={24} />
                  </span>
                  <div className="request-main">
                    <span className={`status ${item.status}`}>
                      {item.status === "pendente" && expired
                        ? "Horário encerrado"
                        : labels[item.status]}
                    </span>
                    <h3>
                      {role === "aluno" ? item.professorNome : item.alunoNome}
                    </h3>
                    <p className="capitalize">{dayLabel(item.inicio)}</p>
                    <p className="muted">
                      {rangeLabel(item.inicio, item.fim)} · Horário de Brasília
                      {role === "professor" && ` · Aluno ${item.alunoNivel}`}
                    </p>
                  </div>
                  {role === "professor" && item.status === "pendente" && (
                    <div className="request-actions">
                      <button
                        className="button secondary"
                        disabled={!!busy}
                        onClick={() => decide(item.id, false)}
                      >
                        Recusar
                      </button>
                      <button
                        className="button primary"
                        disabled={!!busy || expired}
                        onClick={() => decide(item.id, true)}
                      >
                        {busy === item.id ? "Aguarde…" : "Aceitar aula"}
                        <Icon name="check" size={17} />
                      </button>
                    </div>
                  )}
                  {item.status === "aceita" && (
                    <a className="text-link" href="#/app/calendario">
                      Ver calendário <Icon name="arrow" size={16} />
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <Empty icon="message" title="Nenhuma solicitação por aqui.">
            {role === "aluno"
              ? "Encontre um professor e escolha um horário para iniciar uma nova conexão."
              : "Cadastre seus horários para que os alunos possam solicitar uma aula."}
          </Empty>
        ))}
    </>
  );
}
