import { useSyncExternalStore } from "react";
const subscribe = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};
export const navigate = (path: string) => {
  window.location.hash = path;
};
export const useRoute = () =>
  useSyncExternalStore(subscribe, () => window.location.hash.slice(1) || "/");
