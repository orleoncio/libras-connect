import { useState } from "react";
import type { FormEvent } from "react";
import { api, json } from "../lib/api";
import { dateKey, dayLabel, rangeLabel } from "../lib/date";
import { useNow } from "../hooks/useNow";
import { useRemote } from "../hooks/useRemote";
import type { Slot } from "../types";
import { Empty, Feedback, PageHeading, RemoteState } from "../components/ui";
import Icon from "../components/Icon";
export default function Availability() {
  const now = useNow();
  const remote = useRemote<Slot[]>("/professores/me/horarios");
  const [entries, setEntries] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const value = String(new FormData(form).get("inicio"));
    const instant = `${value}:00-03:00`;
    if (new Date(instant).getTime() <= now) {
      setError("Escolha um horário futuro.");
      return;
    }
    if (entries.includes(instant)) {
      setError("Esse horário já está na sua lista.");
      return;
    }
    setEntries((previous) => [...previous, instant].sort());
    form.reset();
  }
  async function save() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api(
        "/professores/me/horarios",
        json("POST", { horarios: entries.map((inicio) => ({ inicio })) }),
      );
      setEntries([]);
      setSuccess(
        "Horários publicados! Agora os alunos podem solicitar uma aula.",
      );
      remote.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const future =
    remote.data?.filter((slot) => new Date(slot.inicio).getTime() > now) || [];
  return (
    <>
      <PageHeading
        librasId="horarios"
        eyebrow="ABRA ESPAÇO PARA NOVAS CONEXÕES"
        description="Adicione períodos de uma hora. Publique horários de uma mesma semana por vez."
      />
      <div className="availability-layout">
        <section className="panel">
          <div className="section-heading">
            <span className="soft-icon">
              <Icon name="plus" />
            </span>
            <div>
              <h2>Adicionar disponibilidade</h2>
              <p className="muted">
                Datas concretas, sem repetição automática.
              </p>
            </div>
          </div>
          <Feedback error={error} success={success} />
          <form onSubmit={add} className="availability-form">
            <label>
              Dia e horário de início
              <input
                type="datetime-local"
                name="inicio"
                required
                step="60"
                min={`${dateKey(new Date(now))}T00:00`}
              />
            </label>
            <p className="muted">
              Horário de Brasília. O período termina uma hora depois.
            </p>
            <button
              className="button secondary"
              disabled={busy || entries.length >= 168}
            >
              <Icon name="plus" />
              Adicionar à lista
            </button>
          </form>
          {entries.length > 0 && (
            <>
              <div className="draft-list">
                {entries.map((entry) => (
                  <div key={entry}>
                    <div>
                      <strong className="capitalize">{dayLabel(entry)}</strong>
                      <p>
                        {rangeLabel(
                          entry,
                          new Date(
                            new Date(entry).getTime() + 3600000,
                          ).toISOString(),
                        )}
                      </p>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`Remover ${dayLabel(entry)} ${rangeLabel(entry, new Date(new Date(entry).getTime() + 3600000).toISOString())}`}
                      disabled={busy}
                      onClick={() =>
                        setEntries((items) =>
                          items.filter((item) => item !== entry),
                        )
                      }
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="button primary full"
                disabled={busy}
                onClick={save}
              >
                {busy
                  ? "Publicando…"
                  : `Publicar ${entries.length} ${entries.length === 1 ? "horário" : "horários"}`}
                <Icon name="arrow" />
              </button>
            </>
          )}
        </section>
        <section className="panel">
          <div className="section-heading">
            <span className="soft-icon">
              <Icon name="clock" />
            </span>
            <div>
              <h2>Horários publicados</h2>
              <p className="muted">Seus próximos períodos de atendimento.</p>
            </div>
            <button
              className="button secondary small"
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
            (future.length ? (
              <div className="published-list">
                {future.map((slot) => (
                  <div key={slot.id}>
                    <div>
                      <strong className="capitalize">
                        {dayLabel(slot.inicio)}
                      </strong>
                      <p className="muted">
                        {rangeLabel(slot.inicio, slot.fim)}
                      </p>
                    </div>
                    <span
                      className={`status ${slot.livre ? "aceita" : "pendente"}`}
                    >
                      {slot.livre ? "Livre" : "Reservado"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon="clock" title="Sua agenda está aberta.">
                Adicione seu primeiro horário para começar a receber
                solicitações.
              </Empty>
            ))}
        </section>
      </div>
    </>
  );
}
