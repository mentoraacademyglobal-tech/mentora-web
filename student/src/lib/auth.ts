import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Use at the top of any page or action that needs a signed-in person.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const {data: access, error: accessError} = await supabase.rpc('mm_portal_access');
  if (accessError || access?.blocked || !access?.authenticated) redirect('/account-access');
  return { supabase, user };
}

/** Resolves all roles held by the current user, with administrative bootstrap fallback. */
export async function getUserRoles(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null }
): Promise<string[]> {
  const { data, error } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id);
  if (error) return [];
  return [...new Set(((data ?? []) as { role: string }[]).map((m) => m.role))];
}

export function isUserAdmin(roles: string[]): boolean {
  return roles.some((r) => r === "admin" || r === "super_admin");
}

export function isUserTeacher(roles: string[]): boolean {
  return roles.some((r) => r === "teacher" || r === "admin" || r === "super_admin");
}

// Use at the top of every admin page. Strictly guards admin routes against unauthorized users.
export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const roles = await getUserRoles(supabase, user);

  if (!isUserAdmin(roles)) {
    redirect("/dashboard?error=Access%20restricted%20to%20administrators");
  }

  const { data } = await supabase
    .from("memberships")
    .select("organisation_id, role")
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in("role", ["admin", "super_admin"]);

  const organisationId = (data ?? [])[0]?.organisation_id;
  if (!organisationId) redirect('/account-access');

  return { supabase, user, organisationId, roles };
}

// Guards teacher-only routes (e.g. Teacher Journal / Students gradebook) against student access.
export async function requireTeacherOrAdmin() {
  const { supabase, user } = await requireUser();
  const roles = await getUserRoles(supabase, user);

  if (!isUserTeacher(roles)) {
    redirect("/dashboard?error=Access%20restricted%20to%20teaching%20staff");
  }

  return { supabase, user, roles };
}
