import { describe, expect, it } from "vitest";
import { portalOf } from "./roles";

describe("portalOf", () => {
  it("gives each single role its own portal", () => {
    expect(portalOf(["student"])).toBe("student");
    expect(portalOf(["teacher"])).toBe("teacher");
    expect(portalOf(["parent"])).toBe("parent");
    expect(portalOf(["admin"])).toBe("admin");
    expect(portalOf(["super_admin"])).toBe("admin");
  });
  it("gives people with several roles the most powerful portal", () => {
    expect(portalOf(["student", "teacher"])).toBe("teacher");
    expect(portalOf(["teacher", "admin"])).toBe("admin");
    expect(portalOf(["parent", "student"])).toBe("student");
  });
  it("has a fallback for someone with no role yet", () => {
    expect(portalOf([])).toBe("none");
    expect(portalOf(["unknown"])).toBe("none");
  });
});
