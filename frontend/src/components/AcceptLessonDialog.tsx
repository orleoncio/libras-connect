import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Booking } from "../types";
import { api, json } from "../lib/api";
import { meetLink } from "../lib/meet";
import { dayLabel, rangeLabel } from "../lib/date";
import { Feedback } from "./ui";
import Icon from "./Icon";
export default function AcceptLessonDialog({
  booking,
  onClose,
  onAccepted,
}: {
  booking: Booking;
  onClose: () => void;
  onAccepted: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = meetLink(link);
    if (!url) {
      setError(
        "Informe um link válido do Google Meet, como https://meet.google.com/abc-defg-hij.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(
        `/solicitacoes/${booking.id}/aceitar`,
        json("PATCH", { linkMeet: url }),
      );
      onAccepted();
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
      aria-labelledby="accept-title"
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
      <p className="eyebrow">PREPARE SEU ENCONTRO</p>
      <h2 id="accept-title">Confirmar aula com {booking.alunoNome}.</h2>
      <p className="muted capitalize">
        {dayLabel(booking.inicio)} · {rangeLabel(booking.inicio, booking.fim)}
      </p>
      <div className="booking-note">
        <Icon name="video" />
        <p>
          Crie uma reunião no{" "}
          <a
            href="https://meet.google.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Meet
          </a>{" "}
          e cole o link abaixo. Ele será enviado ao aluno quando você iniciar a
          aula pelo calendário.
        </p>
      </div>
      <form onSubmit={submit} className="meet-form">
        <label>
          Link do Google Meet
          <input
            type="url"
            name="linkMeet"
            required
            maxLength={2048}
            placeholder="https://meet.google.com/abc-defg-hij"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            disabled={busy}
          />
        </label>
        <Feedback error={error} />
        <button className="button primary full" disabled={busy}>
          {busy ? "Confirmando…" : "Confirmar aula e salvar link"}
          <Icon name="check" />
        </button>
      </form>
    </dialog>
  );
}
