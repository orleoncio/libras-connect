export function meetLink(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.hostname !== "meet.google.com" ||
      url.port ||
      url.username ||
      url.password ||
      !/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/i.test(url.pathname)
    )
      return null;
    return `https://meet.google.com${url.pathname.replace(/\/$/, "").toLowerCase()}`;
  } catch {
    return null;
  }
}
