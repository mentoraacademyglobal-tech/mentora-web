"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { parseChapters, parseCodes, parseYouTubeId } from "./recordings";

function back(classId: string, kind: "error" | "notice", message: string): never {
  redirect(`/classes/${classId}/recordings?${kind}=${encodeURIComponent(message)}`);
}

type ClassRow = { id: string; organisation_id: string; syllabus_version_id: string };

export async function addRecording(formData: FormData) {
  const { supabase, user } = await requireUser();
  const classId = String(formData.get("class_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const link = String(formData.get("link") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const minutesText = String(formData.get("minutes") ?? "").trim();
  const chaptersText = String(formData.get("chapters") ?? "");
  const codesText = String(formData.get("codes") ?? "");
  const sessionId = String(formData.get("session_id") ?? "") || null;
  const publish = formData.get("publish") === "on";

  if (!classId) redirect("/dashboard");
  if (!title) back(classId, "error", "Give the recording a title.");
  if (title.length > 200) back(classId, "error", "The title is longer than 200 characters.");

  const videoId = parseYouTubeId(link);
  if (!videoId) back(classId, "error", "That is not a YouTube link. Paste the link of the unlisted video.");

  const parsed = parseChapters(chaptersText);
  if (parsed.errors.length > 0) back(classId, "error", parsed.errors.slice(0, 2).join(" "));

  const { codes, invalid } = parseCodes(codesText);
  if (invalid.length > 0) {
    back(classId, "error", `These are not syllabus codes: ${invalid.slice(0, 3).join(", ")}. Use codes like 1.1 or 2.3.`);
  }

  let durationSeconds: number | null = null;
  if (minutesText) {
    const minutes = Number(minutesText);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 600) {
      back(classId, "error", "The length must be a number of minutes between 1 and 600.");
    }
    durationSeconds = Math.round(minutes * 60);
  }

  const { data } = await supabase
    .from("classes")
    .select("id, organisation_id, syllabus_version_id")
    .eq("id", classId)
    .maybeSingle();
  const cls = data as ClassRow | null;
  if (!cls) back(classId, "error", "That class was not found.");

  const { data: created, error } = await supabase
    .from("recordings")
    .insert({
      organisation_id: cls.organisation_id,
      class_id: classId,
      session_id: sessionId,
      title,
      description: description || null,
      duration_seconds: durationSeconds,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !created) back(classId, "error", "You cannot add recordings to this class.");

  const recordingId = created.id as string;
  const undo = async (message: string): Promise<never> => {
    await supabase.from("recordings").delete().eq("id", recordingId);
    return back(classId, "error", message);
  };

  const { error: sourceError } = await supabase
    .from("recording_sources")
    .insert({ recording_id: recordingId, organisation_id: cls.organisation_id, youtube_video_id: videoId });
  if (sourceError) await undo("The video could not be saved. Try again.");

  if (parsed.chapters.length > 0) {
    const { error: chapterError } = await supabase.from("recording_chapters").insert(
      parsed.chapters.map((c) => ({
        organisation_id: cls.organisation_id,
        recording_id: recordingId,
        start_seconds: c.start,
        title: c.title,
      })),
    );
    if (chapterError) await undo("The chapters could not be saved. Try again.");
  }

  let unknown: string[] = [];
  if (codes.length > 0) {
    const { data: nodes } = await supabase
      .from("syllabus_nodes")
      .select("id, code")
      .eq("version_id", cls.syllabus_version_id)
      .in("code", codes);
    const found = (nodes ?? []) as { id: string; code: string }[];
    unknown = codes.filter((code) => !found.some((n) => n.code === code));

    if (found.length > 0) {
      const { error: tagError } = await supabase.from("recording_nodes").insert(
        found.map((n) => ({ recording_id: recordingId, node_id: n.id, organisation_id: cls.organisation_id })),
      );
      if (tagError) await undo("The syllabus tags could not be saved. Try again.");
    }
  }

  if (publish) {
    await supabase
      .from("recordings")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", recordingId);
  }

  revalidatePath(`/classes/${classId}/recordings`);
  const skipped = unknown.length > 0 ? ` These codes are not in the syllabus and were skipped: ${unknown.join(", ")}.` : "";
  back(classId, "notice", `${publish ? "Published" : "Saved as a draft"}.${skipped}`);
}

export async function setRecordingStatus(formData: FormData) {
  const { supabase } = await requireUser();
  const classId = String(formData.get("class_id") ?? "");
  const recordingId = String(formData.get("recording_id") ?? "");
  const publish = formData.get("status") === "published";

  if (!classId) redirect("/dashboard");

  const { data, error } = await supabase
    .from("recordings")
    .update(publish ? { status: "published", published_at: new Date().toISOString() } : { status: "draft", published_at: null })
    .eq("id", recordingId)
    .eq("class_id", classId)
    .select("id");

  if (error || !data || data.length === 0) back(classId, "error", "You cannot change this recording.");

  revalidatePath(`/classes/${classId}/recordings`);
  revalidatePath(`/classes/${classId}/recordings/${recordingId}`);
  redirect(`/classes/${classId}/recordings/${recordingId}`);
}

export async function deleteRecording(formData: FormData) {
  const { supabase } = await requireUser();
  const classId = String(formData.get("class_id") ?? "");
  const recordingId = String(formData.get("recording_id") ?? "");

  if (!classId) redirect("/dashboard");

  const { data, error } = await supabase.from("recordings").delete().eq("id", recordingId).eq("class_id", classId).select("id");
  if (error || !data || data.length === 0) back(classId, "error", "You cannot delete this recording.");

  revalidatePath(`/classes/${classId}/recordings`);
  back(classId, "notice", "Recording deleted. The video stays on YouTube until you remove it there.");
}
