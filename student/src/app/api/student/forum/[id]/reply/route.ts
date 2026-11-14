import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const replySchema = z.object({
  content: z.string().trim().min(2, "Reply cannot be empty").max(3000, "Reply is too long"),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 });

  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data: member } = await supabase
    .from("memberships")
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Active academy membership required" }, { status: 403 });

  // 1. Verify thread access
  const { data: thread, error: threadErr } = await supabase
    .from("mm_forum_threads")
    .select("id, name, course_id, status, organisation_id")
    .eq("id", id)
    .eq("organisation_id", member.organisation_id)
    .maybeSingle();

  if (threadErr || !thread) return NextResponse.json({ error: "Discussion thread not found" }, { status: 404 });
  if (thread.status !== "active") return NextResponse.json({ error: "This discussion thread is closed" }, { status: 403 });

  if (thread.course_id) {
    const { data: enrolment } = await supabase
      .from("enrolments")
      .select("id")
      .eq("class_id", thread.course_id)
      .eq("student_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!enrolment && member.role === "student") {
      return NextResponse.json({ error: "You can only reply to discussions in your enrolled classes." }, { status: 403 });
    }
  }

  // 2. Validate content
  const rawJson = await request.json().catch(() => ({}));
  const parsed = replySchema.safeParse(rawJson);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid reply" }, { status: 400 });
  }

  // 3. Insert post
  const { data: post, error: postErr } = await supabase
    .from("mm_forum_posts")
    .insert({
      organisation_id: thread.organisation_id,
      thread_id: thread.id,
      author_id: user.id,
      author_role: member.role || "student",
      content: parsed.data.content,
      status: "active",
    })
    .select("id, content, created_at, author_role")
    .single();

  if (postErr) return NextResponse.json({ error: postErr.message }, { status: 400 });

  // 4. Log activity
  await supabase
    .from("mm_student_activity")
    .insert({
      organisation_id: thread.organisation_id,
      student_id: user.id,
      action: "forum_post_create",
      resource_type: "forum_post",
      resource_id: post.id,
      metadata: { thread_id: thread.id, thread_name: thread.name, timestamp: new Date().toISOString() },
    })
    .then(() => {}, () => {});

  return NextResponse.json({ success: true, post });
}
