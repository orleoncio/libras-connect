import { useEffect, useRef, useState } from "react";
import { api, json } from "../lib/api";
import { dateKey, dayLabel, initials, rangeLabel } from "../lib/date";
import { useRemote } from "../hooks/useRemote";
import type { Booking, Teacher } from "../types";
import { Empty, Feedback, PageHeading, RemoteState } from "../components/ui";
import Icon from "../components/Icon";
function BookingDialog({
  teacher,
  onClose,
  onBooked,
}: {
  teacher: Teacher;
  onClose: () => void;
  onBooked: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const requests = useRemote<Booking[]>("/solicitacoes");
  const days = [
    ...new Set(teacher.horarios.map((slot) => dateKey(slot.inicio))),
  ];
  const [day, setDay] = useState(days[0]);
  const [slot, setSlot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  async function book() {
    if (!slot) return;
    setBusy(true);
    setError("");
    try {
      await api("/solicitacoes", json("POST", { horarioId: slot }));
      onBooked();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="booking-dialog"
      onCancel={onClose}
      aria-labelledby="booking-title"
    >
      <button
        className="icon-button dialog-close"
        aria-label="Fechar"
        onClick={onClose}
        disabled={busy}
      >
        <Icon name="close" />
      </button>
      <p className="eyebrow">UM NOVO ENCONTRO</p>
      <h2 id="booking-title">Aprenda com {teacher.nome.split(" ")[0]}.</h2>
      <p className="muted">
        Escolha um dia e um horário para sua aula de uma hora.
      </p>
      <div className="dialog-teacher">
        <span className="avatar">{initials(teacher.nome)}</span>
        <div>
          <strong>{teacher.nome}</strong>
          <p className="muted">
            Nível {teacher.nivelLibras} · {teacher.especialidades.join(", ")}
          </p>
        </div>
      </div>
      <label>
        Qual dia funciona para você?
        <select
          value={day}
          onChange={(event) => {
            setDay(event.target.value);
            setSlot("");
          }}
        >
          {days.map((date) => (
            <option key={date} value={date}>
              {dayLabel(`${date}T12:00:00-03:00`)}
            </option>
          ))}
        </select>
      </label>
      <p className="slot-label">
        Horários disponíveis <span>Horário de Brasília</span>
      </p>
      <RemoteState
        loading={requests.loading}
        error={requests.error}
        retry={requests.refresh}
      />
      {!requests.loading && !requests.error && (
        <div className="slot-grid">
          {teacher.horarios
            .filter((item) => dateKey(item.inicio) === day)
            .map((item) => {
              const requested = requests.data?.some(
                (request) => request.horarioId === item.id,
              );
              return (
                <button
                  key={item.id}
                  className={`slot-button ${slot === item.id ? "selected" : ""}`}
                  disabled={requested || busy}
                  onClick={() => setSlot(item.id)}
                  aria-pressed={slot === item.id}
                >
                  {rangeLabel(item.inicio, item.fim)}
                  {requested && <small>Solicitação já enviada</small>}
                </button>
              );
            })}
        </div>
      )}
      <div className="booking-note">
        <Icon name="message" />
        <p>
          O professor receberá sua solicitação. A aula aparece no calendário
          após o aceite.
        </p>
      </div>
      <Feedback error={error} />
      <button
        className="button primary full"
        disabled={!slot || busy || requests.loading || !!requests.error}
        onClick={book}
      >
        {busy ? "Enviando…" : "Enviar solicitação"}
        <Icon name="arrow" />
      </button>
    </dialog>
  );
}
export default function Teachers() {
  const remote = useRemote<Teacher[]>("/professores");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Teacher | null>(null);
  const [success, setSuccess] = useState("");
  const filtered = remote.data?.filter((teacher) =>
    `${teacher.nome} ${teacher.especialidades.join(" ")}`
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR")),
  );
  return (
    <>
      <PageHeading
        librasId="professores"
        eyebrow="ENCONTRE SUA PRÓXIMA CONEXÃO"
        description="Professores com nível superior ao seu, prontos para ajudar você a avançar."
      />
      <div className="discovery-banner">
        <div>
          <span className="badge">UM ENCONTRO, MUITAS POSSIBILIDADES</span>
          <h2>
            Sua próxima conversa
            <br />
            começa aqui.
          </h2>
          <p>Aulas individuais de uma hora, no horário que combina com você.</p>
        </div>
        <div className="banner-art" aria-hidden="true">
          <span className="art-ring" />
          <span className="art-hand">
            <Icon name="hand" size={68} />
          </span>
          <span className="art-bubble">Olá, mundo!</span>
          <span className="art-spark">
            <Icon name="spark" size={28} />
          </span>
        </div>
      </div>
      <Feedback success={success} />
      <div className="list-toolbar">
        <h2>
          Professores disponíveis{" "}
          <span className="count">{remote.data?.length ?? "—"}</span>
        </h2>
        <label className="search-field">
          <Icon name="search" />
          <input
            aria-label="Buscar professor ou especialidade"
            placeholder="Buscar nome ou especialidade"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          className="button secondary"
          onClick={remote.refresh}
          disabled={remote.loading}
        >
          Atualizar
        </button>
      </div>
      <RemoteState
        loading={remote.loading}
        error={remote.error}
        retry={remote.refresh}
      />
      {!remote.loading &&
        !remote.error &&
        (filtered?.length ? (
          <div className="teacher-grid">
            {filtered.map((teacher, index) => (
              <article className="teacher-card" key={teacher.id}>
                <div className="teacher-card-top">
                  <span className={`avatar color-${index % 3}`}>
                    {initials(teacher.nome)}
                  </span>
                  <span className="badge">Libras {teacher.nivelLibras}</span>
                </div>
                <h3>{teacher.nome}</h3>
                <p className="experience">
                  {teacher.anosExperiencia === 0
                    ? "Professor de Libras"
                    : `${teacher.anosExperiencia} ${teacher.anosExperiencia === 1 ? "ano" : "anos"} de experiência`}
                </p>
                <p className="teacher-bio">{teacher.biografia}</p>
                <div className="tags">
                  {teacher.especialidades.map((specialty, i) => (
                    <span key={`${specialty}-${i}`}>{specialty}</span>
                  ))}
                </div>
                <div className="teacher-availability">
                  <span className="live-dot" />
                  {teacher.horarios.length}{" "}
                  {teacher.horarios.length === 1
                    ? "horário disponível"
                    : "horários disponíveis"}
                </div>
                <button
                  className="button secondary full"
                  onClick={() => {
                    setSuccess("");
                    setSelected(teacher);
                  }}
                >
                  Escolher dia e horário
                  <Icon name="arrow" size={18} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            icon="people"
            title={
              query
                ? "Nenhum resultado para essa busca."
                : "Novas conexões estão a caminho."
            }
          >
            {query
              ? "Tente outro nome ou especialidade."
              : "Ainda não há professores com nível superior ao seu e horários livres. Volte em breve ou confira seu nível no perfil."}
          </Empty>
        ))}
      {selected && (
        <BookingDialog
          teacher={selected}
          onClose={() => setSelected(null)}
          onBooked={() => {
            setSelected(null);
            setSuccess(
              "Solicitação enviada! Acompanhe o retorno na tela de solicitações.",
            );
            remote.refresh();
          }}
        />
      )}
    </>
  );
}
