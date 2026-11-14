import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redeemPendingInvite } from "@/features/identity";
import { safeNext, withParam } from "@/lib/redirect";
import { env } from "@/lib/env";

// Email links (confirm your address, reset your password) arrive here.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next"), "/dashboard");

  const supabase = await createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });
    ok = !error;
  }

  const origin = env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;

  if (!ok) {
    const message = "That link has expired or was already used. Sign in, or ask for a new link.";
    return NextResponse.redirect(new URL(withParam("/login", "error", message), origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await redeemPendingInvite(supabase, user);
  const {error: invitationError} = await supabase.rpc('mm_accept_staff_invitations');
  if (invitationError) return NextResponse.redirect(new URL('/account-access', origin));

  return NextResponse.redirect(new URL(next, origin));
}
