import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NodeRow, VersionDetail, VersionSummary } from "./types";

/** All curriculum data is read from Supabase. Never manufacture syllabus versions. */
export async function listVersionsWithCounts(supabase: SupabaseClient): Promise<VersionSummary[]> {
  const { data, error } = await supabase
    .from("syllabus_versions")
    .select("id, label, status, subjects(name, syllabus_code, qualifications(name, boards(name)))")
    .eq("status", "published")
    .order("created_at");
  if (error || !data) return [];
  const versions = data as Omit<VersionSummary, "count">[];
  return Promise.all(versions.map(async version => {
    const { count } = await supabase
      .from("syllabus_nodes")
      .select("id", { count: "exact", head: true })
      .eq("version_id", version.id);
    return { ...version, count: count ?? 0 };
  }));
}

/** Never disclose draft/retired specifications to students. */
export async function getVersion(supabase: SupabaseClient, versionId: string): Promise<VersionDetail | null> {
  const { data } = await supabase
    .from("syllabus_versions")
    .select("id, label, status, subjects(name, syllabus_code)")
    .eq("id", versionId)
    .eq("status", "published")
    .maybeSingle();
  return (data as VersionDetail | null) ?? null;
}

export async function listNodes(supabase: SupabaseClient, versionId: string): Promise<NodeRow[]> {
  const { data } = await supabase
    .from("syllabus_nodes")
    .select("id, parent_id, node_type, code, title, position")
    .eq("version_id", versionId)
    .order("position");
  return (data ?? []) as NodeRow[];
}
