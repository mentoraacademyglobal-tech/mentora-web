import type { SupabaseClient } from "@supabase/supabase-js";

const FRIENDLY = ["not valid", "expired", "already been used"];

export async function redeemInvite(
  supabase: SupabaseClient,
  code: string,
): Promise<{ error?: string }> {
  const cleaned = code.trim();
  if (!cleaned) return { error: "Enter your invite code." };

  const { error } = await supabase.rpc("redeem_invite", { p_code: cleaned });
  if (error) {
    const known = FRIENDLY.some((text) => error.message.includes(text));
    return { error: known ? error.message : "We could not use that code. Check it and try again." };
  }
  return {};
}

/** If someone signed up with an invite code but could not use it yet (email not confirmed), use it now. */
export async function redeemPendingInvite(
  supabase: SupabaseClient,
  user: { user_metadata?: Record<string, unknown> } | null,
): Promise<{ error?: string } | null> {
  const pending = user?.user_metadata?.invite_code;
  if (typeof pending !== "string" || !pending) return null;

  const { count } = await supabase.from("memberships").select("id", { count: "exact", head: true });
  if (count) return null;

  return redeemInvite(supabase, pending);
}
