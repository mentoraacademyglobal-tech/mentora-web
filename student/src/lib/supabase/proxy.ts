import { env } from "@/lib/env";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decideAccess } from "./access";

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() checks the session with Supabase, so it cannot be spoofed by a forged cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !['/account-access', '/login', '/register', '/forgot-password', '/reset-password', '/auth/callback'].includes(request.nextUrl.pathname)) {
    const {data: account, error} = await supabase.rpc('mm_portal_access');
    if (error || account?.blocked || !account?.authenticated) {
      const denied = request.nextUrl.pathname.startsWith('/api/')
        ? NextResponse.json({error: 'Account access is unavailable. Contact your academy.'}, {status: 403, headers: {'Cache-Control': 'no-store'}})
        : NextResponse.redirect(new URL('/account-access', request.url));
      response.cookies.getAll().forEach(cookie => denied.cookies.set(cookie));
      return denied;
    }
  }

  const access = decideAccess(request.nextUrl.pathname, request.nextUrl.search, Boolean(user));
  if (access.action === "continue") return response;

  const answer =
    access.action === "unauthorized"
      ? NextResponse.json({ error: "Sign in again to continue." }, { status: 401 })
      : NextResponse.redirect(new URL(access.to, request.url));

  // Keep any refreshed session cookies, otherwise a redirect can quietly sign the person out.
  response.cookies.getAll().forEach((cookie) => answer.cookies.set(cookie));
  return answer;
}
