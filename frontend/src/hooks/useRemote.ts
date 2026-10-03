import { useEffect, useState } from "react";
import { api } from "../lib/api";
export function useRemote<T>(path: string, revision = 0) {
  const [tick, setTick] = useState(0);
  const key = `${path}:${tick}:${revision}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>(
    { key: "" },
  );
  useEffect(() => {
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setState({ key, error: error.message });
      });
    return () => controller.abort();
  }, [path, key]);
  return {
    data: state.key === key ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    loading: state.key !== key,
    refresh: () => setTick((value) => value + 1),
  };
}
