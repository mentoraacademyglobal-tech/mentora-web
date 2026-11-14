// Helpers for sending people to the right place after signing in or acting.

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/auth/"];

/**
 * Only allows a path on this site. Anything else (another website, a protocol-relative link,
 * a path with line breaks, or an auth page) falls back, so a crafted link cannot send
 * someone elsewhere after they sign in.
 */
export function safeNext(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\r\n\\]/.test(value)) return fallback;
  if (AUTH_PATHS.some((p) => value === p || value.startsWith(`${p}?`) || (p.endsWith("/") && value.startsWith(p)))) {
    return fallback;
  }
  return value;
}

/** Adds or replaces one query parameter on a site path. */
export function withParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://site.invalid");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}
