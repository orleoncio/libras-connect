import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { librasTitles } from "../lib/libras";
import type { LibrasTitleId } from "../lib/libras";
import { closeLibras, showLibras } from "../lib/vlibras";

export default function LibrasButton({ titleId }: { titleId: LibrasTitleId }) {
  const { title, gloss } = librasTitles[titleId];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(
    () => () => {
      active.current?.abort();
    },
    [],
  );
  async function show() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    try {
      await showLibras(gloss, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted && (error as Error).name !== "AbortError")
        setError((error as Error).message);
    } finally {
      if (active.current === controller && !controller.signal.aborted)
        setBusy(false);
    }
  }
  function cancel() {
    active.current?.abort();
    active.current = null;
    closeLibras();
    setBusy(false);
    window.requestAnimationFrame(() => trigger.current?.focus());
  }
  return (
    <div className="libras-action">
      <button
        ref={trigger}
        type="button"
        className="libras-button vlibras-links"
        aria-label={`Ver em Libras: ${title}`}
        title="Ver título em Libras com VLibras"
        aria-busy={busy}
        disabled={busy}
        onClick={() => void show()}
      >
        <Icon name="eye" size={21} />
        <span>Libras</span>
      </button>
      {busy && (
        <div className="libras-progress">
          <span role="status">Carregando avatar do VLibras…</span>
          <button
            type="button"
            className="text-button vlibras-links"
            onClick={cancel}
          >
            Cancelar tradução
          </button>
        </div>
      )}
      {error && (
        <div className="libras-error notice error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="button secondary small vlibras-links"
            onClick={() => void show()}
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
