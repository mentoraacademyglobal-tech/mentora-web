import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { one } from "@/lib/relations";
import type { ChapterRow, NodeTag, RecentRecording, RecordingDetail, RecordingRow } from "./types";

const LIST_COLUMNS =
  "id, title, description, duration_seconds, status, created_at, recording_nodes(syllabus_nodes(code, title))";

export async function listClassRecordings(supabase: SupabaseClient, classId: string): Promise<RecordingRow[]> {
  const { data } = await supabase
    .from("recordings")
    .select(LIST_COLUMNS)
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  return (data ?? []) as RecordingRow[];
}

/** Where the signed-in person got to in each recording, in seconds. */
export async function getMyProgress(supabase: SupabaseClient): Promise<Map<string, number>> {
  const { data } = await supabase.from("recording_progress").select("recording_id, last_position_seconds");
  return new Map(
    ((data ?? []) as { recording_id: string; last_position_seconds: number }[]).map((p) => [
      p.recording_id,
      p.last_position_seconds,
    ]),
  );
}

export async function getRecording(
  supabase: SupabaseClient,
  classId: string,
  recordingId: string,
): Promise<RecordingDetail | null> {
  const { data } = await supabase
    .from("recordings")
    .select(
      `${LIST_COLUMNS}, class_id, classes(name, term, organisations(timezone))`,
    )
    .eq("id", recordingId)
    .eq("class_id", classId)
    .maybeSingle();
  return (data as RecordingDetail | null) ?? null;
}

export async function listChapters(supabase: SupabaseClient, recordingId: string) {
  const { data } = await supabase
    .from("recording_chapters")
    .select("start_seconds, title")
    .eq("recording_id", recordingId)
    .order("start_seconds");
  return ((data ?? []) as ChapterRow[]).map((c) => ({ start: c.start_seconds, title: c.title }));
}

export async function listRecentPublished(
  supabase: SupabaseClient,
  limit: number,
  classIds?: string[],
  recordingIds?: string[],
): Promise<RecentRecording[]> {
  if (classIds && classIds.length === 0 && (!recordingIds || recordingIds.length === 0)) return [];
  let query = supabase.from("recordings")
    .select("id, title, class_id, classes(name)")
    .eq("status", "published");

  if (classIds && classIds.length > 0 && recordingIds && recordingIds.length > 0) {
    query = query.or(`class_id.in.(${classIds.join(",")}),id.in.(${recordingIds.join(",")})`);
  } else if (classIds && classIds.length > 0) {
    query = query.in("class_id", classIds);
  } else if (recordingIds && recordingIds.length > 0) {
    query = query.in("id", recordingIds);
  }
  const { data } = await query.order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as RecentRecording[];
}

export function tagsOf(recording: RecordingRow): NodeTag[] {
  return (recording.recording_nodes ?? [])
    .map((t) => one(t.syllabus_nodes))
    .filter((n): n is NodeTag => Boolean(n));
}

/** Does a recording match a typed syllabus code? "1" matches 1, 1.1, 1.2.3 and so on. */
export function matchesTopic(recording: RecordingRow, code: string): boolean {
  return tagsOf(recording).some((t) => t.code === code || (t.code ?? "").startsWith(`${code}.`));
}
