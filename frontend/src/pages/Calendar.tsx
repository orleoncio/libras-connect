import { useState } from "react";
import { useRemote } from "../hooks/useRemote";
import { dateKey, dayLabel, rangeLabel } from "../lib/date";
import type { Lesson, Role } from "../types";
import { Empty, PageHeading, RemoteState } from "../components/ui";
import Icon from "../components/Icon";
export default function Calendar({ role }: { role: Role }) {
  const remote = useRemote<Lesson[]>("/aulas");
  const today = dateKey(new Date());
  const [month, setMonth] = useState(
    () => new Date(`${today.slice(0, 7)}-01T12:00:00Z`),
  );
  const [selected, setSelected] = useState(today);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(month);
  const first = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1, 12),
  );
  const offset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const days = Array.from(
    { length: Math.ceil((offset + daysInMonth) / 7) * 7 },
    (_, index) => {
      const day = new Date(
        Date.UTC(
          month.getUTCFullYear(),
          month.getUTCMonth(),
          index - offset + 1,
          12,
        ),
      );
      return {
        key: dateKey(day),
        number: day.getUTCDate(),
        current: day.getUTCMonth() === month.getUTCMonth(),
      };
    },
  );
  const lessons =
    remote.data?.filter((item) => dateKey(item.inicio) === selected) || [];
  function changeMonth(delta: number) {
    const next = new Date(
      Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + delta, 1, 12),
    );
    setMonth(next);
    setSelected(dateKey(next));
  }
  return (
    <>
      <PageHeading
        eyebrow="TEMPO PARA SE CONECTAR"
        title="Seu calendário de encontros."
        description="Aqui estão suas aulas confirmadas. Todos os horários seguem o horário de Brasília."
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
      <RemoteState
        loading={remote.loading}
        error={remote.error}
        retry={remote.refresh}
      />
      {!remote.loading && !remote.error && (
        <div className="calendar-layout">
          <section
            className="panel calendar-panel"
            aria-label="Calendário de aulas"
          >
            <div className="calendar-toolbar">
              <h2 className="capitalize">{monthLabel}</h2>
              <div>
                <button
                  className="button secondary small"
                  onClick={() => {
                    setMonth(new Date(`${today.slice(0, 7)}-01T12:00:00Z`));
                    setSelected(today);
                  }}
                >
                  Hoje
                </button>
                <button
                  className="icon-button previous"
                  aria-label="Mês anterior"
                  onClick={() => changeMonth(-1)}
                >
                  <Icon name="chevron" />
                </button>
                <button
                  className="icon-button"
                  aria-label="Próximo mês"
                  onClick={() => changeMonth(1)}
                >
                  <Icon name="chevron" />
                </button>
              </div>
            </div>
            <div className="calendar-weekdays">
              {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {days.map((day) => {
                const count =
                  remote.data?.filter(
                    (item) => dateKey(item.inicio) === day.key,
                  ).length || 0;
                return (
                  <button
                    key={day.key}
                    className={`calendar-day ${day.current ? "" : "outside"} ${selected === day.key ? "selected" : ""} ${today === day.key ? "today" : ""}`}
                    onClick={() => setSelected(day.key)}
                    aria-pressed={selected === day.key}
                    aria-label={`${dayLabel(`${day.key}T12:00:00Z`)}, ${count} aulas`}
                  >
                    <span>{day.number}</span>
                    {count > 0 && (
                      <span className="calendar-event">
                        <span />
                        {count} {count === 1 ? "aula" : "aulas"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="calendar-legend">
              <span className="live-dot" />
              Aulas confirmadas{" "}
              <span className="muted">
                Solicitações pendentes ficam na tela de solicitações.
              </span>
            </p>
          </section>
          <aside className="panel day-agenda">
            <p className="eyebrow">SUA AGENDA</p>
            <h2 className="capitalize">{dayLabel(`${selected}T12:00:00Z`)}</h2>
            {lessons.length ? (
              lessons.map((lesson) => (
                <article className="agenda-event" key={lesson.id}>
                  <span className="status aceita">Confirmada</span>
                  <h3>
                    {role === "aluno" ? lesson.professorNome : lesson.alunoNome}
                  </h3>
                  <p>
                    <Icon name="clock" size={16} />
                    {rangeLabel(lesson.inicio, lesson.fim)}
                  </p>
                  <p className="muted">Aula individual de Libras · 1 hora</p>
                </article>
              ))
            ) : (
              <Empty title="Um dia livre.">
                Você ainda não tem aulas confirmadas para este dia.
              </Empty>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
