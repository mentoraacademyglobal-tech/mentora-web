import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

const createThreadSchema = z.object({
  name: z.string().trim().min(3).max(180),
  description: z.string().trim().min(5).max(3000),
  course_id: z.string().uuid().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data: member } = await supabase
    .from("memberships")
    .select("organisation_id")
    .eq("user_id", user.id)
    .eq("role", "student")
    .limit(1)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Active student membership required" }, { status: 403 });

  const rawJson = await request.json().catch(() => ({}));
  const parsed = createThreadSchema.safeParse(rawJson);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid thread input" }, { status: 400 });
  }

  const { name, description, course_id } = parsed.data;

  // If scoped to a course, verify active enrollment
  if (course_id) {
    const { data: enrolment } = await supabase
      .from("enrolments")
      .select("id")
      .eq("class_id", course_id)
      .eq("student_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!enrolment) {
      return NextResponse.json({ error: "You can only post discussions in your enrolled classes." }, { status: 403 });
    }
  }

  const { data: thread, error: threadErr } = await supabase
    .from("mm_forum_threads")
    .insert({
      organisation_id: member.organisation_id,
      name,
      description,
      course_id: course_id || null,
      student_id: user.id,
      status: "active",
    })
    .select("id, name")
    .single();

  if (threadErr) return NextResponse.json({ error: threadErr.message }, { status: 400 });

  // Audit activity log
  await supabase
    .from("mm_student_activity")
    .insert({
      organisation_id: member.organisation_id,
      student_id: user.id,
      action: "forum_thread_create",
      resource_type: "forum_thread",
      resource_id: thread.id,
      metadata: { name: thread.name, timestamp: new Date().toISOString() },
    })
    .then(() => {}, () => {});

  return NextResponse.json({ success: true, thread });
}
