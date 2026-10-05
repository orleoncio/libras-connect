import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Lesson, Role } from "../types";
import { api, json } from "../lib/api";
import { meetLink } from "../lib/meet";
import { dayLabel, rangeLabel } from "../lib/date";
import { Feedback } from "./ui";
import Icon from "./Icon";
type Meeting = {
  id: string;
  linkMeet: string | null;
  iniciadaEm: string | null;
};
export default function LessonDialog({
  lesson,
  role,
  onClose,
  onStarted,
}: {
  lesson: Lesson;
  role: Role;
  onClose: () => void;
  onStarted: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState(lesson);
  const [link, setLink] = useState(lesson.linkMeet || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  useEffect(() => {
    if (role !== "aluno" || current.iniciadaEm) return;
    const controller = new AbortController();
    let inFlight = false;
    async function update() {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      try {
        const data = await api<Lesson>(`/aulas/${lesson.id}`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setCurrent(data);
          setError("");
        }
      } catch (err) {
        if (!controller.signal.aborted) setError((err as Error).message);
      } finally {
        inFlight = false;
      }
    }
    void update();
    const timer = window.setInterval(() => {
      if (!document.hidden) void update();
    }, 10000);
    const visible = () => {
      if (!document.hidden) void update();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [role, current.iniciadaEm, lesson.id]);
  async function saveLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = meetLink(link);
    if (!url) {
      setError("Informe um link válido do Google Meet.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const meeting = await api<Meeting>(
        `/aulas/${lesson.id}/link`,
        json("PATCH", { linkMeet: url }),
      );
      setCurrent((previous) => ({ ...previous, ...meeting }));
      setLink(url);
      setSuccess("Link salvo. Agora você pode iniciar a aula.");
      onStarted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    // Abra durante o clique para evitar bloqueio de pop-ups depois da resposta HTTP.
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const meeting = await api<Meeting>(
        `/aulas/${lesson.id}/iniciar`,
        json("POST"),
      );
      const url = meetLink(meeting.linkMeet);
      if (!url) throw new Error("O link da chamada não é válido.");
      setCurrent((previous) => ({ ...previous, ...meeting }));
      setSuccess(
        "Aluno notificado! Use o botão abaixo se a chamada não abrir automaticamente.",
      );
      if (popup) popup.location.href = url;
      onStarted();
    } catch (err) {
      popup?.close();
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const url = meetLink(current.linkMeet);
  return (
    <dialog
      ref={ref}
      className="booking-dialog lesson-dialog"
      aria-labelledby="lesson-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
    >
      <button
        className="icon-button dialog-close"
        onClick={onClose}
        disabled={busy}
        aria-label="Fechar"
      >
        <Icon name="close" />
      </button>
      <p className="eyebrow">SEU ENCONTRO EM LIBRAS</p>
      <h2 id="lesson-title">
        Aula com {role === "aluno" ? current.professorNome : current.alunoNome}.
      </h2>
      <div className="lesson-details">
        <p className="capitalize">
          <Icon name="calendar" />
          {dayLabel(current.inicio)}
        </p>
        <p>
          <Icon name="clock" />
          {rangeLabel(current.inicio, current.fim)} · Horário de Brasília
        </p>
        <span
          className={`status ${current.iniciadaEm ? "aceita" : "pendente"}`}
        >
          {current.iniciadaEm
            ? "Professor pronto para iniciar"
            : "Aula confirmada"}
        </span>
      </div>
      {role === "professor" && !current.iniciadaEm && (
        <form onSubmit={saveLink} className="meet-form">
          <label>
            Link do Google Meet
            <input
              type="url"
              required
              maxLength={2048}
              placeholder="https://meet.google.com/abc-defg-hij"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              disabled={busy}
            />
            <small>O aluno receberá este link ao iniciar a aula.</small>
          </label>
          {meetLink(link) !== url && (
            <button className="button secondary full" disabled={busy}>
              Salvar link da chamada
            </button>
          )}
        </form>
      )}
      <Feedback error={error} success={success} />
      {role === "professor" && !current.iniciadaEm ? (
        <button
          className="button primary full"
          onClick={start}
          disabled={busy || !url || meetLink(link) !== url}
        >
          {busy ? "Iniciando…" : "Iniciar aula"}
          <Icon name="video" />
        </button>
      ) : current.iniciadaEm && url ? (
        <a
          className="button primary full"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {role === "aluno" ? "Entrar na chamada" : "Entrar no Google Meet"}
          <Icon name="video" />
        </a>
      ) : (
        <div className="booking-note">
          <Icon name="bell" />
          <p>
            Aguardando o professor iniciar. Você receberá uma notificação com o
            link da chamada.
          </p>
        </div>
      )}
    </dialog>
  );
}
