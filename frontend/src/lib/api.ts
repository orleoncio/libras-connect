const base = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
export const tokenStore = {
  get: () => sessionStorage.getItem("libras-token"),
  set: (token: string) => sessionStorage.setItem("libras-token", token),
  clear: () => sessionStorage.removeItem("libras-token"),
};
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = tokenStore.get();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new Error(
      "Não foi possível conectar à plataforma. Verifique sua conexão e tente novamente.",
      { cause: error },
    );
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token)
      window.dispatchEvent(new Event("session-expired"));
    throw new Error(
      Array.isArray(body.message)
        ? body.message.join(". ")
        : body.message || "Não foi possível concluir esta ação.",
    );
  }
  return body as T;
}
export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
