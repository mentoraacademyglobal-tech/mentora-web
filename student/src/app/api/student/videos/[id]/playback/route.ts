import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Video not found." }, { status: 404, headers: NO_STORE });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers: NO_STORE });

  // 1. Verify active, unrevoked entitlement
  const { data: entitlement, error: entErr } = await supabase
    .from("mm_video_entitlements")
    .select("id, organisation_id, expires_at, revoked_at")
    .eq("video_id", id)
    .eq("student_id", user.id)
    .is("revoked_at", null)
    .maybeSingle();

  if (entErr || !entitlement) {
    return NextResponse.json({ error: "You do not have an active entitlement to this on-demand video." }, { status: 403, headers: NO_STORE });
  }

  if (entitlement.expires_at && Date.parse(entitlement.expires_at) < Date.now()) {
    return NextResponse.json({ error: "Access to this on-demand video has expired." }, { status: 403, headers: NO_STORE });
  }

  // 2. Fetch video details
  const { data: video, error: vidErr } = await supabase
    .from("mm_videos")
    .select("id, name, description, subject, video_asset_ref")
    .eq("id", id)
    .maybeSingle();

  if (vidErr || !video) {
    return NextResponse.json({ error: "Video not found." }, { status: 404, headers: NO_STORE });
  }

  // 3. Log playback activity
  await supabase
    .from("mm_student_activity")
    .insert({
      organisation_id: entitlement.organisation_id,
      student_id: user.id,
      action: "vod_view",
      resource_type: "video",
      resource_id: id,
      metadata: { name: video.name, timestamp: new Date().toISOString() },
    })
    .then(() => {}, () => {});

  // Parse video source ID (YouTube, Vimeo, or direct ref)
  let youtubeId: string | null = null;
  const ref = video.video_asset_ref ?? "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(ref)) {
    youtubeId = ref;
  } else {
    const match = ref.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match) youtubeId = match[1];
  }

  return NextResponse.json({
    id: video.id,
    name: video.name,
    description: video.description,
    subject: video.subject,
    youtube_video_id: youtubeId,
    video_asset_ref: youtubeId ? null : ref,
  }, { headers: NO_STORE });
}
