import { safeNext } from "@/lib/redirect";

// Pages anyone can open without signing in.
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/auth/callback", "/account-access"];

export type Access =
  | { action: "continue" }
  | { action: "redirect"; to: string }
  | { action: "unauthorized" };

/** Decides what to do with a request. Pure, so every case can be tested. */
export function decideAccess(pathname: string, search: string, signedIn: boolean): Access {
  const params = new URLSearchParams(search);

  if (!signedIn) {
    if (PUBLIC_PATHS.includes(pathname)) return { action: "continue" };
    // Data requests from the player get a clear answer instead of a login page.
    if (pathname.startsWith("/api/")) return { action: "unauthorized" };
    const back = pathname === "/" ? "" : `${pathname}${search}`;
    return { action: "redirect", to: back ? `/login?next=${encodeURIComponent(back)}` : "/login" };
  }

  if (pathname === "/login") {
    return { action: "redirect", to: safeNext(params.get("next")) };
  }

  // Someone who is already signed in opens an invite link: keep the code for the dashboard.
  if (pathname === "/register") {
    const code = params.get("code");
    return { action: "redirect", to: code ? `/dashboard?code=${encodeURIComponent(code)}` : "/dashboard" };
  }

  return { action: "continue" };
}
