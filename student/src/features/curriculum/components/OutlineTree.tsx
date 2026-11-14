import { deleteNode } from "../actions";
import SubmitButton from "@/components/ui/SubmitButton";
import { dangerButton } from "@/components/ui/styles";
import type { NodeRow } from "../types";

const TYPE_LABEL: Record<string, string> = {
  unit: "Unit",
  topic: "Topic",
  subtopic: "Subtopic",
  objective: "Objective",
};

type ByParent = Map<string | null, NodeRow[]>;

function Branch({ byParent, parentId, versionId }: { byParent: ByParent; parentId: string | null; versionId: string }) {
  const children = byParent.get(parentId);
  if (!children || children.length === 0) return null;

  return (
    <ul className={parentId ? "ml-3 border-l border-line pl-3" : ""}>
      {children.map((node) => (
        <li key={node.id} className="py-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {node.code ? <span className="font-mono text-sm font-bold">{node.code}</span> : null}
            <span className="text-sm">{node.title}</span>
            <span className="rounded-full bg-mist px-2 py-0.5 text-xs text-slate-text">
              {TYPE_LABEL[node.node_type] ?? node.node_type}
            </span>
            <details className="ml-auto">
              <summary className="cursor-pointer text-xs text-slate-text">Delete</summary>
              <form action={deleteNode} className="mt-2">
                <input type="hidden" name="id" value={node.id} />
                <input type="hidden" name="version_id" value={versionId} />
                <SubmitButton className={dangerButton} pendingText="Deleting">
                  Delete this and everything under it
                </SubmitButton>
              </form>
            </details>
          </div>
          <Branch byParent={byParent} parentId={node.id} versionId={versionId} />
        </li>
      ))}
    </ul>
  );
}

export default function OutlineTree({ nodes, versionId }: { nodes: NodeRow[]; versionId: string }) {
  const byParent: ByParent = new Map();
  for (const n of nodes) {
    const list = byParent.get(n.parent_id) ?? [];
    list.push(n);
    byParent.set(n.parent_id, list);
  }
  return <Branch byParent={byParent} parentId={null} versionId={versionId} />;
}
