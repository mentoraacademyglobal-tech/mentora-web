import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid tute ID" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  // 1. Fetch tute
  const { data: tute, error: tuteErr } = await supabase
    .from("mm_tutes")
    .select("id, name, file_path, class_id, organisation_id, status")
    .eq("id", id)
    .maybeSingle();

  if (tuteErr || !tute) return NextResponse.json({ error: "Study tute not found" }, { status: 404 });
  if (!tute.file_path) return NextResponse.json({ error: "No digital download file is available for this tute" }, { status: 404 });

  const {data: authorized, error: accessError} = await supabase.rpc('mm_can_download_tute', {p_tute: id});
  if (accessError || authorized !== true) return NextResponse.json({error: 'An active digital purchase or class enrollment is required.'}, {status: 403});

  // 3. Log download activity
  await supabase
    .from("mm_student_activity")
    .insert({
      organisation_id: tute.organisation_id,
      student_id: user.id,
      action: "tute_download",
      resource_type: "tute",
      resource_id: id,
      metadata: { name: tute.name, timestamp: new Date().toISOString() },
    })
    .then(() => {}, () => {});

  // 4. Generate signed storage URL
  const { data: signed, error: signError } = await supabase.storage
    .from("mentora-manager-media")
    .createSignedUrl(tute.file_path, 60);

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: "File download token generation failed" }, { status: 403 });
  }

  return NextResponse.redirect(new URL(signed.signedUrl), { status: 302 });
}
