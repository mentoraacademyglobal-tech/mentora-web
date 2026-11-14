import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ClassDetail,
  ClassSummary,
  InviteRow,
  OrgTeacher,
  SessionRow,
  StudentRow,
  SubjectOption,
  TeacherRow,
  UpcomingSession,
} from "./types";

export async function listVisibleClasses(supabase: SupabaseClient): Promise<ClassSummary[]> {
  const { data } = await supabase
    .from("classes")
    .select("id, name, term, rate_per_lesson, discount_amount, subjects(name, syllabus_code)")
    .order("name");
  return (data ?? []) as ClassSummary[];
}

export async function getClass(supabase: SupabaseClient, classId: string): Promise<ClassDetail | null> {
  const { data } = await supabase
    .from("classes")
    .select("id, name, term, subjects(name, syllabus_code), organisations(timezone)")
    .eq("id", classId)
    .maybeSingle();
  return (data as ClassDetail | null) ?? null;
}

export async function countClasses(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase.from("classes").select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function listSubjectOptions(supabase: SupabaseClient): Promise<SubjectOption[]> {
  const { data } = await supabase
    .from("subjects")
    .select("id, name, syllabus_code, qualifications(name, boards(name))")
    .order("name");
  return (data ?? []) as SubjectOption[];
}

export async function listClassSessions(supabase: SupabaseClient, classId: string): Promise<SessionRow[]> {
  const { data } = await supabase
    .from("sessions")
    .select("id, title, starts_at, ends_at, status, join_opens_minutes")
    .eq("class_id", classId)
    .order("starts_at");
  return (data ?? []) as SessionRow[];
}

/** Scheduled sessions still to come (or just finished), soonest first. */
export async function listUpcomingSessions(
  supabase: SupabaseClient,
  nowIso: string,
  limit: number,
  classIds?: string[],
): Promise<UpcomingSession[]> {
  if (classIds && classIds.length === 0) return [];
  let query = supabase
    .from("sessions")
    .select("id, title, starts_at, ends_at, join_opens_minutes, class_id, classes(name)")
    .eq("status", "scheduled")
    .gte("ends_at", nowIso);
  if (classIds) query = query.in("class_id", classIds);
  const { data } = await query.order("starts_at").limit(limit);
  return (data ?? []) as UpcomingSession[];
}

/** Recent scheduled sessions of a class, newest first. Used to link a recording to its session. */
export async function listRecentSessions(supabase: SupabaseClient, classId: string, limit: number) {
  const { data } = await supabase
    .from("sessions")
    .select("id, title, starts_at, ends_at")
    .eq("class_id", classId)
    .eq("status", "scheduled")
    .order("starts_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as { id: string; title: string; starts_at: string; ends_at: string }[];
}

export async function getMyClassIds(supabase: SupabaseClient, userId: string) {
  const [{ data: enrolments }, { data: teaching }] = await Promise.all([
    supabase.from("enrolments").select("class_id").eq("student_id", userId).eq("status", "active"),
    supabase.from("class_teachers").select("class_id").eq("teacher_id", userId),
  ]);

  const enrolled = new Set(((enrolments ?? []) as { class_id: string }[]).map((e) => e.class_id));
  const taught = new Set(((teaching ?? []) as { class_id: string }[]).map((t) => t.class_id));

  return { enrolled, taught };
}

export async function getClassAccess(supabase: SupabaseClient, userId: string, classId: string) {
  const { data: member } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"])
    .limit(1)
    .maybeSingle();
  const isAdmin = Boolean(member);

  const [{ data: teaching }, { data: enrolled }] = await Promise.all([
    supabase.from("class_teachers").select("class_id").eq("class_id", classId).eq("teacher_id", userId).maybeSingle(),
    supabase
      .from("enrolments")
      .select("class_id")
      .eq("class_id", classId)
      .eq("student_id", userId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const isTeacher = Boolean(teaching);
  const isStudent = Boolean(enrolled);
  const isManager = isAdmin || isTeacher;

  return { isAdmin, isManager, isTeacher, isStudent };
}

export async function getManagerSessionExtras(
  supabase: SupabaseClient,
  upcoming: SessionRow[],
  past: SessionRow[],
) {
  const upcomingIds = upcoming.map((s) => s.id);
  const pastIds = past.map((s) => s.id);

  const [{ data: links }, { data: joins }] = await Promise.all([
    upcomingIds.length > 0
      ? supabase.from("sessions").select("id").in("id", upcomingIds).not("join_url", "is", null)
      : Promise.resolve({ data: [] }),
    pastIds.length > 0
      ? supabase.from("session_joins").select("session_id").in("session_id", pastIds)
      : Promise.resolve({ data: [] }),
  ]);

  const linked = new Set(((links ?? []) as { id: string }[]).map((l) => l.id));
  const joinedCount = new Map<string, number>();
  for (const row of ((joins ?? []) as { session_id: string }[])) {
    joinedCount.set(row.session_id, (joinedCount.get(row.session_id) ?? 0) + 1);
  }

  return { linked, joinedCount };
}

export async function getAdminClassDetail(supabase: SupabaseClient, classId: string) {
  const [{ data: teachers }, { data: students }, { data: orgTeachers }, { data: invites }] = await Promise.all([
    supabase.from("class_teachers").select("teacher_id, profiles(full_name, email)").eq("class_id", classId),
    supabase
      .from("enrolments")
      .select("id, student_id, started_on, status, profiles(full_name, email)")
      .eq("class_id", classId)
      .eq("status", "active")
      .order("started_on", { ascending: false }),
    supabase
      .from("memberships")
      .select("user_id, profiles(full_name, email)")
      .in("role", ["teacher", "admin", "super_admin"]),
    supabase
      .from("invites")
      .select("id, code, role, uses_left, expires_at")
      .eq("class_id", classId)
      .is("redeemed_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const classTeachers = (teachers ?? []) as TeacherRow[];
  return {
    classTeachers,
    enrolled: (students ?? []) as StudentRow[],
    availableTeachers: ((orgTeachers ?? []) as OrgTeacher[]).filter(
      (t) => !classTeachers.some((ct) => ct.teacher_id === t.user_id),
    ),
    invites: (invites ?? []) as InviteRow[],
  };
}

export const getRoster = getAdminClassDetail;

export type LinkedTeacher = {
  class_id: string;
  profiles: { full_name: string; email: string | null } | { full_name: string; email: string | null }[] | null;
  classes: { name: string } | { name: string }[] | null;
};

/** Teachers of the classes the signed-in person can see. */
export async function listMyTeachers(supabase: SupabaseClient): Promise<LinkedTeacher[]> {
  const { data } = await supabase.from("class_teachers").select("class_id, profiles(full_name, email), classes(name)");
  return (data ?? []) as LinkedTeacher[];
}

export type ClassStudent = {
  id: string;
  status: string;
  student_id: string;
  profiles: { full_name: string; email: string | null } | { full_name: string; email: string | null }[] | null;
  classes: { name: string } | { name: string }[] | null;
};

/** Students in the classes the signed-in person teaches (admins see all). */
export async function listClassStudents(supabase: SupabaseClient): Promise<ClassStudent[]> {
  const { data } = await supabase
    .from("enrolments")
    .select("id, status, student_id, profiles(full_name, email), classes(name)")
    .order("started_on", { ascending: false });
  return (data ?? []) as ClassStudent[];
}
