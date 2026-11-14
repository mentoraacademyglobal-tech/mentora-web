import { describe, expect, it } from "vitest";
import { depthMap, parseOutline, typeForDepth } from "./syllabus";

describe("typeForDepth", () => {
  it("maps depth to node types when the top level is a unit", () => {
    expect(typeForDepth(1, "unit")).toBe("unit");
    expect(typeForDepth(2, "unit")).toBe("topic");
    expect(typeForDepth(3, "unit")).toBe("subtopic");
    expect(typeForDepth(4, "unit")).toBe("objective");
    expect(typeForDepth(6, "unit")).toBe("objective");
  });

  it("maps depth to node types when the top level is a topic", () => {
    expect(typeForDepth(1, "topic")).toBe("topic");
    expect(typeForDepth(2, "topic")).toBe("subtopic");
    expect(typeForDepth(3, "topic")).toBe("objective");
  });
});

describe("parseOutline", () => {
  const outline = `
1 Data representation
1.1 Number systems
- Convert between binary and denary
- Add binary numbers
1.2 Text, sound and images
2 Data transmission
2.1 Types and methods of data transmission
`;

  it("builds the tree with parents, types and sibling order", () => {
    const result = parseOutline(outline, "topic");
    expect(result.errors).toEqual([]);
    const byCode = new Map(result.nodes.map((n) => [n.code, n]));

    expect(byCode.get("1")).toMatchObject({ type: "topic", parentCode: null, siblingIndex: 0 });
    expect(byCode.get("2")).toMatchObject({ type: "topic", parentCode: null, siblingIndex: 1 });
    expect(byCode.get("1.1")).toMatchObject({ type: "subtopic", parentCode: "1", siblingIndex: 0 });
    expect(byCode.get("1.2")).toMatchObject({ siblingIndex: 1 });
    expect(byCode.get("1.1.o1")).toMatchObject({ type: "objective", parentCode: "1.1", siblingIndex: 0 });
    expect(byCode.get("1.1.o2")).toMatchObject({ title: "Add binary numbers", siblingIndex: 1 });
  });

  it("uses unit as the top level when asked", () => {
    const result = parseOutline("1 Unit one\n1.1 Topic\n1.1.1 Subtopic\n1.1.1.1 Objective", "unit");
    expect(result.nodes.map((n) => n.type)).toEqual(["unit", "topic", "subtopic", "objective"]);
  });

  it("accepts a trailing dot after the number", () => {
    const result = parseOutline("1. Algorithms\n1.1. Flowcharts", "topic");
    expect(result.errors).toEqual([]);
    expect(result.nodes.map((n) => n.code)).toEqual(["1", "1.1"]);
  });

  it("reports a missing parent", () => {
    const result = parseOutline("1 Topic\n1.2.1 Orphan", "topic");
    expect(result.errors).toEqual(['Line 2: 1.2.1 needs its parent 1.2 to come first.']);
  });

  it("reports a bullet with nothing above it", () => {
    const result = parseOutline("- Loose point", "topic");
    expect(result.errors[0]).toContain("Line 1");
  });

  it("reports a line it cannot read", () => {
    const result = parseOutline("1 Topic\nRandom words here", "topic");
    expect(result.errors[0]).toContain("Line 2");
  });

  it("reports a code that appears twice in the same outline", () => {
    const result = parseOutline("1 One\n1 Again", "topic");
    expect(result.errors).toEqual(["Line 2: the code 1 appears twice in your outline."]);
  });

  it("skips codes that already exist and still lets children attach to them", () => {
    const result = parseOutline("1 Existing\n1.1 New child", "topic", new Set(["1"]));
    expect(result.errors).toEqual([]);
    expect(result.skipped).toBe(1);
    expect(result.nodes.map((n) => n.code)).toEqual(["1.1"]);
    expect(result.nodes[0].parentCode).toBe("1");
  });

  it("does not reuse objective codes that already exist", () => {
    const result = parseOutline("1.1 Existing heading\n- New point", "topic", new Set(["1", "1.1", "1.1.o1"]));
    expect(result.nodes.map((n) => n.code)).toEqual(["1.1.o2"]);
  });

  it("ignores blank lines and stray spaces", () => {
    const result = parseOutline("\n\n   1   Spaced title  \n\n", "topic");
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].title).toBe("Spaced title");
  });
});

describe("depthMap", () => {
  it("counts depth from the top, using existing depth for known parents", () => {
    const parsed = parseOutline("1.1 Child\n1.1.1 Grandchild", "topic", new Set(["1"])).nodes;
    const depths = depthMap(parsed, () => 1);
    expect(depths.get("1.1")).toBe(2);
    expect(depths.get("1.1.1")).toBe(3);
  });
});
