"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import { addDays, DEFAULT_TIMEZONE, zonedToUtc } from "@/lib/time";
import { one } from "@/lib/relations";
import { safeNext, withParam } from "@/lib/redirect";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createClass(formData: FormData) {
  const { supabase, organisationId } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const subjectId = String(formData.get("subject_id") ?? "");
  const term = String(formData.get("term") ?? "").trim();

  if (!name || !subjectId) fail("/admin/classes", "Give the class a name and choose a subject.");

  let { data: version } = await supabase
    .from("syllabus_versions")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!version) {
    const anyVersion = await supabase
      .from("syllabus_versions")
      .select("id")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    version = anyVersion.data;
  }

  if (!version) {
    const { data: newVersion } = await supabase
      .from("syllabus_versions")
      .insert({
        organisation_id: organisationId,
        subject_id: subjectId,
        label: "2026-2027",
        status: "published",
      })
      .select("id")
      .single();
    version = newVersion;
  }

  if (!version) fail("/admin/classes", "Could not assign a syllabus version for this subject.");

  const { data, error } = await supabase
    .from("classes")
    .insert({
      organisation_id: organisationId,
      subject_id: subjectId,
      syllabus_version_id: version.id,
      name,
      term: term || null,
    })
    .select("id")
    .single();

  if (error || !data) fail("/admin/classes", "The class could not be created. Try again.");

  revalidatePath("/admin/classes");
  redirect(`/admin/classes/${data.id}`);
}

export async function assignTeacher(formData: FormData) {
  const { supabase, organisationId } = await requireAdmin();
  const classId = String(formData.get("class_id") ?? "");
  const teacherId = String(formData.get("teacher_id") ?? "");
  const path = `/admin/classes/${classId}`;

  if (!classId || !teacherId) fail(path, "Choose a teacher.");

  const { error } = await supabase.from("class_teachers").upsert(
    { organisation_id: organisationId, class_id: classId, teacher_id: teacherId },
    { onConflict: "class_id,teacher_id" },
  );
  if (error) fail(path, "The teacher could not be assigned. Try again.");

  revalidatePath(path);
  redirect(path);
}

export async function createInvite(formData: FormData) {
  const { supabase, user, organisationId } = await requireAdmin();
  const classId = String(formData.get("class_id") ?? "");
  const role = String(formData.get("role") ?? "student");
  const path = `/admin/classes/${classId}`;

  if (!["student", "teacher"].includes(role)) fail(path, "Choose who the code is for.");

  const uses = Math.min(Math.max(parseInt(String(formData.get("uses") ?? "1"), 10) || 1, 1), 200);
  const days = Math.min(Math.max(parseInt(String(formData.get("days") ?? "14"), 10) || 14, 1), 365);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("invite_codes").insert({
    organisation_id: organisationId,
    role,
    class_id: classId,
    uses_left: uses,
    expires_at: expiresAt,
    created_by: user.id,
  });
  if (error) fail(path, "The invite code could not be created. Try again.");

  revalidatePath(path);
  redirect(path);
}

function back(classId: string, kind: "error" | "notice", message: string): never {
  redirect(`/classes/${classId}?${kind}=${encodeURIComponent(message)}`);
}

const validLink = (value: string) => /^https:\/\/\S+$/i.test(value);

type ClassOrg = {
  id: string;
  organisation_id: string;
  organisations: { timezone: string } | { timezone: string }[] | null;
};

export async function createSessions(formData: FormData) {
  const { supabase, user } = await requireUser();
  const classId = String(formData.get("class_id") ?? "");
  const title = String(formData.get("title") ?? "").trim() || "Lesson";
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const repeat = Math.min(Math.max(parseInt(String(formData.get("repeat") ?? "1"), 10) || 1, 1), 40);
  const link = String(formData.get("link") ?? "").trim();

  if (!classId) redirect("/dashboard");
  if (link && !validLink(link)) back(classId, "error", "The class link must start with https://");

  const { data } = await supabase
    .from("classes")
    .select("id, organisation_id, organisations(timezone)")
    .eq("id", classId)
    .maybeSingle();
  const cls = data as ClassOrg | null;
  if (!cls) back(classId, "error", "That class was not found.");

  const timeZone = one(cls.organisations)?.timezone ?? DEFAULT_TIMEZONE;

  const rows = [];
  for (let i = 0; i < repeat; i += 1) {
    const day = addDays(date, i * 7);
    const startsAt = zonedToUtc(day, start, timeZone);
    const endsAt = zonedToUtc(day, end, timeZone);
    if (!startsAt || !endsAt) back(classId, "error", "Check the date and times.");
    if (endsAt <= startsAt) back(classId, "error", "The class must end after it starts.");
    rows.push({
      organisation_id: cls.organisation_id,
      class_id: classId,
      title,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      created_by: user.id,
    });
  }

  const { data: created, error } = await supabase.from("sessions").insert(rows).select("id");
  if (error || !created) {
    back(classId, "error", "You cannot schedule sessions for this class, or the details are not valid.");
  }

  if (link) {
    const { error: linkError } = await supabase.from("session_meetings").insert(
      created.map((s: { id: string }) => ({
        session_id: s.id,
        organisation_id: cls.organisation_id,
        join_url: link,
      })),
    );
    if (linkError) {
      back(classId, "error", "The sessions were scheduled, but the class link could not be saved. Add it again below.");
    }
  }

  revalidatePath(`/classes/${classId}`);
  back(classId, "notice", `Scheduled ${created.length} ${created.length === 1 ? "session" : "sessions"}.`);
}

export async function setUpcomingLink(formData: FormData) {
  const { supabase } = await requireUser();
  const classId = String(formData.get("class_id") ?? "");
  const link = String(formData.get("link") ?? "").trim();

  if (!classId) redirect("/dashboard");
  if (!validLink(link)) back(classId, "error", "The class link must start with https://");

  const { data } = await supabase
    .from("classes")
    .select("id, organisation_id, organisations(timezone)")
    .eq("id", classId)
    .maybeSingle();
  const cls = data as ClassOrg | null;
  if (!cls) back(classId, "error", "That class was not found.");

  const { data: upcoming } = await supabase
    .from("sessions")
    .select("id")
    .eq("class_id", classId)
    .eq("status", "scheduled")
    .gte("ends_at", new Date().toISOString());

  if (!upcoming || upcoming.length === 0) {
    back(classId, "error", "There are no upcoming sessions to update.");
  }

  const { error } = await supabase.from("session_meetings").upsert(
    upcoming.map((s: { id: string }) => ({
      session_id: s.id,
      organisation_id: cls.organisation_id,
      join_url: link,
    })),
    { onConflict: "session_id" },
  );
  if (error) back(classId, "error", "The link could not be saved. Try again.");

  revalidatePath(`/classes/${classId}`);
  back(classId, "notice", `Class link saved for ${upcoming.length} upcoming ${upcoming.length === 1 ? "session" : "sessions"}.`);
}

export async function cancelSession(formData: FormData) {
  const { supabase } = await requireUser();
  const classId = String(formData.get("class_id") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");

  if (!classId) redirect("/dashboard");

  const { data, error } = await supabase
    .from("sessions")
    .update({ status: "cancelled" })
    .eq("id", sessionId)
    .eq("class_id", classId)
    .select("id");

  if (error || !data || data.length === 0) {
    back(classId, "error", "You cannot cancel this session.");
  }

  revalidatePath(`/classes/${classId}`);
  back(classId, "notice", "Session cancelled.");
}

export async function joinSession(formData: FormData) {
  const { supabase } = await requireUser();
  const classId = String(formData.get("class_id") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");

  if (!classId) redirect("/dashboard");
  // Stay on the page they pressed Join from, so a "too early" message does not move them elsewhere.
  const returnTo = safeNext(String(formData.get("return_to") ?? ""), `/classes/${classId}`);

  const { data, error } = await supabase.rpc("join_session", { p_session: sessionId });

  if (error || typeof data !== "string") {
    // P0001 errors come from our own checks and are written for the person to read.
    const message = error?.code === "P0001" ? error.message : "We could not open the class. Try again in a moment.";
    redirect(withParam(returnTo, "error", message));
  }

  redirect(data);
}
