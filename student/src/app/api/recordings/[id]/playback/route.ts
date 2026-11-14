import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

// Releases the video ID only to someone allowed to watch this recording, with audit logging.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Recording not found." }, { status: 404, headers: NO_STORE });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in again to watch." }, { status: 401, headers: NO_STORE });

  const { data, error } = await supabase.rpc("get_recording_playback", { p_recording: id });
  if (error || !data) {
    const message = error?.code === "P0001" ? error.message : "The lesson could not be loaded.";
    return NextResponse.json({ error: message }, { status: 403, headers: NO_STORE });
  }

  // Audit activity log for recording view
  const { data: rec } = await supabase.from("recordings").select("organisation_id, title").eq("id", id).maybeSingle();
  if (rec?.organisation_id) {
    await supabase
      .from("mm_student_activity")
      .insert({
        organisation_id: rec.organisation_id,
        student_id: user.id,
        action: "recording_view",
        resource_type: "recording",
        resource_id: id,
        metadata: { title: rec.title, timestamp: new Date().toISOString() },
      })
      .then(
        () => {},
        () => {}
      );
  }

  return NextResponse.json(data, { headers: NO_STORE });
}
