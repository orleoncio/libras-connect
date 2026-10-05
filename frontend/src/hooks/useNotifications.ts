import { useCallback, useEffect, useRef, useState } from "react";
import { api, json } from "../lib/api";
import type { AppNotification } from "../types";
export function useNotifications() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    items: AppNotification[];
    loading: boolean;
    error: string;
  }>({ items: [], loading: true, error: "" });
  const [latest, setLatest] = useState<AppNotification | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    async function load() {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      try {
        const items = await api<AppNotification[]>("/notificacoes", {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const previous = seen.current;
        const next =
          previous &&
          items.find((item) => !item.lidaEm && !previous.has(item.id));
        if (next) setLatest(next);
        seen.current = new Set(items.map((item) => item.id));
        setState({ items, loading: false, error: "" });
      } catch (err) {
        if (!controller.signal.aborted)
          setState((previous) => ({
            ...previous,
            loading: false,
            error: (err as Error).message,
          }));
      } finally {
        inFlight = false;
      }
    }
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 10000);
    const visible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [revision]);
  async function markRead(id: string) {
    try {
      const data = await api<{ lidaEm: string }>(
        `/notificacoes/${id}/lida`,
        json("PATCH"),
      );
      setState((previous) => ({
        ...previous,
        items: previous.items.map((item) =>
          item.id === id ? { ...item, lidaEm: data.lidaEm } : item,
        ),
      }));
      setLatest((previous) => (previous?.id === id ? null : previous));
      refresh();
    } catch (err) {
      setState((previous) => ({ ...previous, error: (err as Error).message }));
    }
  }
  return {
    ...state,
    latest,
    refresh,
    markRead,
    dismiss: () => setLatest(null),
    unread: state.items.filter((item) => !item.lidaEm).length,
  };
}
