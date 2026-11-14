import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MembershipRow } from "./types";

export async function getProfileName(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return data?.full_name?.trim() || null;
}

export async function listMyMemberships(supabase: SupabaseClient): Promise<MembershipRow[]> {
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from("memberships").select("role, organisations(name, timezone)").eq('user_id', user.id).eq('status', 'active');
  return (data ?? []) as MembershipRow[];
}

export async function countMembersByRole(supabase: SupabaseClient, role: string): Promise<number> {
  const { count } = await supabase.from("memberships").select("id", { count: "exact", head: true }).eq("role", role);
  return count ?? 0;
}

export type PersonMembership = {
  id: string;
  role: string;
  profiles: { full_name: string; email: string | null } | { full_name: string; email: string | null }[] | null;
};

export async function listPeople(supabase: SupabaseClient): Promise<PersonMembership[]> {
  const { data } = await supabase
    .from("memberships")
    .select("id, role, profiles(full_name, email)")
    .order("created_at", { ascending: false });
  return (data ?? []) as PersonMembership[];
}

export type Child = { id: string; name: string };

/** The children linked to the signed-in parent. */
export async function listMyChildren(supabase: SupabaseClient, parentId: string): Promise<Child[]> {
  const { data: links } = await supabase
    .from("guardianships")
    .select("student_id")
    .eq("parent_id", parentId)
    .eq("verified", true);
  const ids = ((links ?? []) as { student_id: string }[]).map((l) => l.student_id);
  if (ids.length === 0) return [];

  const { data: people } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
  return ((people ?? []) as { id: string; full_name: string; email: string | null }[]).map((p) => ({
    id: p.id,
    name: p.full_name?.trim() || p.email || "Your child",
  }));
}
