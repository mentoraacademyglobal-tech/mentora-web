import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { one } from "@/lib/relations";
import type { ClassAccess, PersonRel } from "./types";

/**
 * What the signed-in person is in a given class. The database rules decide what they can actually
 * see and change; this tells the page which controls to show.
 */
export async function getClassAccess(
  supabase: SupabaseClient,
  userId: string,
  classId: string,
): Promise<ClassAccess> {
  const [adminRes, teacherRes, enrolRes] = await Promise.all([
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("user_id", userId).in("role", ["admin", "super_admin"]),
    supabase.from("class_teachers").select("teacher_id").eq("class_id", classId).eq("teacher_id", userId),
    supabase.from("enrolments").select("id").eq("class_id", classId).eq("student_id", userId).eq("status", "active"),
  ]);

  const isAdmin = (adminRes.count ?? 0) > 0;
  const isTeacher = (teacherRes.data?.length ?? 0) > 0;
  const isStudent = (enrolRes.data?.length ?? 0) > 0;
  return { isAdmin, isTeacher, isStudent, isManager: isAdmin || isTeacher };
}

export function personLabel(rel: PersonRel): string {
  const p = one(rel);
  if (!p) return "Unknown";
  return p.full_name?.trim() || p.email || "Unknown";
}
