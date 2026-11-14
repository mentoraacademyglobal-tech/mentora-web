// Turns a pasted syllabus outline into a tree of nodes. Pure functions, no database access.

export type NodeType = "unit" | "topic" | "subtopic" | "objective";
export type TopLevel = "unit" | "topic";

export type ParsedNode = {
  code: string;
  title: string;
  type: NodeType;
  parentCode: string | null;
  /** Position among siblings created by this import, starting at 0. */
  siblingIndex: number;
  line: number;
};

export type ParseResult = {
  nodes: ParsedNode[];
  errors: string[];
  /** Lines whose code already exists in this syllabus version. */
  skipped: number;
};

const CODED = /^(\d+(?:\.\d+)*)\.?\s+(.+)$/;
const BULLET = /^[-*\u2022]\s+(.+)$/;

const MAX_LINES = 2000;
const MAX_TITLE = 300;

export function typeForDepth(depth: number, topLevel: TopLevel): NodeType {
  const order: NodeType[] =
    topLevel === "unit" ? ["unit", "topic", "subtopic", "objective"] : ["topic", "subtopic", "objective"];
  return order[Math.min(Math.max(depth, 1) - 1, order.length - 1)];
}

/**
 * Line formats:
 *   1 Data representation          a numbered heading, depth from the dots in the number
 *   1.1 Number systems
 *   1.1.1 Binary and denary
 *   - Convert between binary and denary   a bullet, stored as an objective under the last numbered line
 */
export function parseOutline(
  text: string,
  topLevel: TopLevel,
  existingCodes: Set<string> = new Set(),
): ParseResult {
  const lines = text.split(/\r?\n/);
  const errors: string[] = [];
  const nodes: ParsedNode[] = [];
  const known = new Set(existingCodes);
  const siblingCounts = new Map<string, number>();
  const objectiveCounts = new Map<string, number>();
  let lastCoded: string | null = null;
  let skipped = 0;

  if (lines.length > MAX_LINES) {
    return { nodes: [], errors: [`The outline has more than ${MAX_LINES} lines. Import it in parts.`], skipped: 0 };
  }

  const nextSibling = (parent: string | null) => {
    const key = parent ?? "";
    const index = siblingCounts.get(key) ?? 0;
    siblingCounts.set(key, index + 1);
    return index;
  };

  lines.forEach((raw, i) => {
    const line = i + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;

    const coded = CODED.exec(trimmed);
    if (coded) {
      const code = coded[1];
      const title = coded[2].trim();
      if (title.length > MAX_TITLE) {
        errors.push(`Line ${line}: the title is longer than ${MAX_TITLE} characters.`);
        return;
      }
      const parts = code.split(".");
      const parentCode = parts.length > 1 ? parts.slice(0, -1).join(".") : null;

      if (known.has(code)) {
        if (nodes.some((n) => n.code === code)) {
          errors.push(`Line ${line}: the code ${code} appears twice in your outline.`);
        } else {
          skipped += 1;
        }
        lastCoded = code;
        return;
      }
      if (parentCode && !known.has(parentCode)) {
        errors.push(`Line ${line}: ${code} needs its parent ${parentCode} to come first.`);
        return;
      }

      known.add(code);
      nodes.push({
        code,
        title,
        type: typeForDepth(parts.length, topLevel),
        parentCode,
        siblingIndex: nextSibling(parentCode),
        line,
      });
      lastCoded = code;
      return;
    }

    const bullet = BULLET.exec(trimmed);
    if (bullet) {
      if (!lastCoded) {
        errors.push(`Line ${line}: a bullet needs a numbered heading above it.`);
        return;
      }
      const title = bullet[1].trim();
      if (title.length > MAX_TITLE) {
        errors.push(`Line ${line}: the title is longer than ${MAX_TITLE} characters.`);
        return;
      }
      let n = (objectiveCounts.get(lastCoded) ?? 0) + 1;
      while (known.has(`${lastCoded}.o${n}`) && existingCodes.has(`${lastCoded}.o${n}`)) n += 1;
      objectiveCounts.set(lastCoded, n);
      const code = `${lastCoded}.o${n}`;
      known.add(code);
      nodes.push({
        code,
        title,
        type: "objective",
        parentCode: lastCoded,
        siblingIndex: nextSibling(lastCoded),
        line,
      });
      return;
    }

    errors.push(`Line ${line}: could not read "${trimmed.slice(0, 40)}". Start with a number like 1.2 or a dash.`);
  });

  return { nodes, errors, skipped };
}

/** Depth of each parsed node (1 for top level), used to insert parents before children. */
export function depthMap(nodes: ParsedNode[], existingDepth: (code: string) => number): Map<string, number> {
  const depths = new Map<string, number>();
  for (const node of nodes) {
    const parentDepth = node.parentCode ? (depths.get(node.parentCode) ?? existingDepth(node.parentCode)) : 0;
    depths.set(node.code, parentDepth + 1);
  }
  return depths;
}
