"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { depthMap, parseOutline, type TopLevel } from "./syllabus";

function back(versionId: string, kind: "error" | "notice", message: string): never {
  redirect(`/admin/syllabus/${versionId}?${kind}=${encodeURIComponent(message)}`);
}

type ExistingNode = { id: string; code: string | null; parent_id: string | null };

export async function importOutline(formData: FormData) {
  const { supabase, organisationId } = await requireAdmin();
  const versionId = String(formData.get("version_id") ?? "");
  const text = String(formData.get("outline") ?? "");
  const topLevel: TopLevel = formData.get("top_level") === "unit" ? "unit" : "topic";

  if (!versionId) redirect("/admin/syllabus");
  if (!text.trim()) back(versionId, "error", "Paste your outline first.");

  const { data: existing } = await supabase
    .from("syllabus_nodes")
    .select("id, code, parent_id")
    .eq("version_id", versionId);
  const existingNodes = (existing ?? []) as ExistingNode[];

  const codeToId = new Map<string, string>();
  const idToParent = new Map<string, string | null>();
  const childCount = new Map<string | null, number>();
  for (const n of existingNodes) {
    if (n.code) codeToId.set(n.code, n.id);
    idToParent.set(n.id, n.parent_id);
    childCount.set(n.parent_id, (childCount.get(n.parent_id) ?? 0) + 1);
  }

  const result = parseOutline(text, topLevel, new Set(codeToId.keys()));
  if (result.errors.length > 0) {
    const shown = result.errors.slice(0, 3).join(" ");
    const more = result.errors.length > 3 ? ` And ${result.errors.length - 3} more problems.` : "";
    back(versionId, "error", `Nothing was imported. ${shown}${more}`);
  }
  if (result.nodes.length === 0) {
    back(versionId, "notice", `Nothing new to add. ${result.skipped} lines already existed.`);
  }

  // Depth of an existing parent, found by walking up its parents.
  const existingDepth = (code: string) => {
    let depth = 1;
    const id = codeToId.get(code);
    let parent = id ? idToParent.get(id) : null;
    while (parent) {
      depth += 1;
      parent = idToParent.get(parent) ?? null;
    }
    return depth;
  };

  const depths = depthMap(result.nodes, existingDepth);
  const maxDepth = Math.max(...depths.values());

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const level = result.nodes.filter((n) => depths.get(n.code) === depth);
    if (level.length === 0) continue;

    const rows = level.map((n) => {
      const parentId = n.parentCode ? (codeToId.get(n.parentCode) ?? null) : null;
      return {
        organisation_id: organisationId,
        version_id: versionId,
        parent_id: parentId,
        node_type: n.type,
        code: n.code,
        title: n.title,
        position: (childCount.get(parentId) ?? 0) + n.siblingIndex,
      };
    });

    const { data: inserted, error } = await supabase
      .from("syllabus_nodes")
      .insert(rows)
      .select("id, code");

    if (error || !inserted) {
      back(versionId, "error", "The import stopped part way. Check the outline tree below, then try the rest again.");
    }
    for (const row of inserted as { id: string; code: string }[]) codeToId.set(row.code, row.id);
  }

  revalidatePath(`/admin/syllabus/${versionId}`);
  const skippedNote = result.skipped > 0 ? ` ${result.skipped} lines already existed and were skipped.` : "";
  back(versionId, "notice", `Added ${result.nodes.length} points.${skippedNote}`);
}

export async function addNode(formData: FormData) {
  const { supabase, organisationId } = await requireAdmin();
  const versionId = String(formData.get("version_id") ?? "");
  const parentId = String(formData.get("parent_id") ?? "") || null;
  const nodeType = String(formData.get("node_type") ?? "");
  const code = String(formData.get("code") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();

  if (!versionId) redirect("/admin/syllabus");
  if (!title) back(versionId, "error", "Give the point a title.");
  if (!["unit", "topic", "subtopic", "objective"].includes(nodeType)) {
    back(versionId, "error", "Choose what kind of point this is.");
  }

  let query = supabase
    .from("syllabus_nodes")
    .select("id", { count: "exact", head: true })
    .eq("version_id", versionId);
  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);
  const { count } = await query;

  const { error } = await supabase.from("syllabus_nodes").insert({
    organisation_id: organisationId,
    version_id: versionId,
    parent_id: parentId,
    node_type: nodeType,
    code,
    title,
    position: count ?? 0,
  });
  if (error) back(versionId, "error", "The point could not be added. Try again.");

  revalidatePath(`/admin/syllabus/${versionId}`);
  back(versionId, "notice", "Point added.");
}

export async function deleteNode(formData: FormData) {
  const { supabase } = await requireAdmin();
  const versionId = String(formData.get("version_id") ?? "");
  const id = String(formData.get("id") ?? "");

  if (!versionId) redirect("/admin/syllabus");
  const { error } = await supabase.from("syllabus_nodes").delete().eq("id", id).eq("version_id", versionId);
  if (error) back(versionId, "error", "The point could not be deleted. Try again.");

  revalidatePath(`/admin/syllabus/${versionId}`);
  back(versionId, "notice", "Deleted, along with everything under it.");
}
