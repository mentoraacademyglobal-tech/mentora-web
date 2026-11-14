import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Saves where the student has got to and whether the recording was completed.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return new NextResponse(null, { status: 404 });

  const body = (await request.json().catch(() => null)) as { seconds?: unknown; completed?: unknown } | null;
  const seconds = typeof body?.seconds === "number" && Number.isFinite(body.seconds) ? Math.floor(body.seconds) : null;
  const completed = Boolean(body?.completed);

  if (seconds === null) return new NextResponse(null, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  // Call RPC with completion status support
  const { error } = await supabase.rpc("save_recording_progress", {
    p_recording: id,
    p_seconds: seconds,
    p_completed: completed,
  });

  if (error) return NextResponse.json(
    {error: 'Recording progress could not be saved.'},
    {status: error.code === '42501' || error.code === 'P0001' ? 403 : 500}
  );

  // Audit activity log for completion if marked completed
  if (completed) {
    const { data: rec } = await supabase.from("recordings").select("organisation_id, title").eq("id", id).maybeSingle();
    if (rec?.organisation_id) {
      await supabase
        .from("mm_student_activity")
        .insert({
          organisation_id: rec.organisation_id,
          student_id: user.id,
          action: "recording_completed",
          resource_type: "recording",
          resource_id: id,
          metadata: { title: rec.title, seconds, timestamp: new Date().toISOString() },
        })
        .then(
          () => {},
          () => {}
        );
    }
  }

  return new NextResponse(null, { status: 204 });
}
