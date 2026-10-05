// Interface exposta pelo widget oficial, verificada na versão publicada 7.12.2.
// https://github.com/spbgovbr-vlibras/vlibras-web-browsers/blob/dev/src/widget/providers/sync/use-window-sync.ts
type Player = {
  isLoaded: boolean;
  isPlayingWelcome: boolean;
  isWelcomeFinished: boolean;
  status?: string;
  play: (gloss: string) => void;
  stop: () => void;
  setOpen: (open: boolean) => void;
};
declare global {
  interface Window {
    VLibrasWidget?: {
      open?: () => void;
      path?: string;
      avatar?: string;
      position?: string;
    };
    vlibras?: Player;
  }
}
export const VLIBRAS_SCRIPT = "https://vlibras.gov.br/app/vlibras-plugin.js";
let scriptPromise: Promise<void> | null = null;
let currentRequest = 0;

function loadScript() {
  if (window.VLibrasWidget?.open) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "libras-connect-vlibras";
    script.src = VLIBRAS_SCRIPT;
    script.async = true;
    window.VLibrasWidget = {
      ...window.VLibrasWidget,
      path: "https://vlibras.gov.br/app",
      avatar: "icaro",
      position: "R",
    };
    const timer = window.setTimeout(() => fail(), 20000);
    function cleanup() {
      window.clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
    }
    function fail() {
      cleanup();
      script.remove();
      scriptPromise = null;
      reject(
        new Error(
          "Não foi possível carregar o VLibras. Verifique sua conexão e tente novamente.",
        ),
      );
    }
    script.onload = () => {
      cleanup();
      resolve();
    };
    script.onerror = fail;
    document.body.appendChild(script);
  });
  return scriptPromise;
}
function waitFor<T>(
  read: () => T | undefined,
  signal: AbortSignal,
  request: number,
  timeout: number,
) {
  return new Promise<T>((resolve, reject) => {
    let timer: number;
    const deadline = Date.now() + timeout;
    function finish(value?: T, error?: Error) {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", aborted);
      if (error) reject(error);
      else resolve(value!);
    }
    function aborted() {
      finish(undefined, new DOMException("Tradução cancelada", "AbortError"));
    }
    function check() {
      if (signal.aborted || request !== currentRequest) return aborted();
      const value = read();
      if (value) return finish(value);
      if (Date.now() >= deadline)
        return finish(
          undefined,
          new Error(
            "O avatar do VLibras não ficou pronto. Tente novamente ou recarregue a página.",
          ),
        );
      timer = window.setTimeout(check, 100);
    }
    signal.addEventListener("abort", aborted, { once: true });
    check();
  });
}
export async function showLibras(gloss: string, signal: AbortSignal) {
  const request = ++currentRequest;
  await loadScript();
  const widget = await waitFor(
    () => (window.VLibrasWidget?.open ? window.VLibrasWidget : undefined),
    signal,
    request,
    10000,
  );
  widget.open!();
  const player = await waitFor(
    () => {
      const player = window.vlibras;
      // isPlayingWelcome inicia como true antes da carga. Espere a animação
      // realmente começar (status playing), evitando o timer inicial de 500 ms.
      return player?.isLoaded &&
        typeof player.play === "function" &&
        (player.isWelcomeFinished ||
          (player.isPlayingWelcome && player.status === "playing"))
        ? player
        : undefined;
    },
    signal,
    request,
    90000,
  );
  player.stop();
  player.setOpen(true);
  player.play(gloss);
}
export function closeLibras() {
  currentRequest++;
  window.vlibras?.stop();
  window.vlibras?.setOpen(false);
  const root = document.getElementById("vlibras-app-root");
  if (root) root.dataset.active = "false";
}
