import { describe, expect, it } from "vitest";
import { safeNext, withParam } from "./redirect";
import { decideAccess } from "./supabase/access";

describe("safeNext", () => {
  it("allows paths on this site, with queries", () => {
    expect(safeNext("/classes/abc")).toBe("/classes/abc");
    expect(safeNext("/classes/abc/recordings?topic=1.1")).toBe("/classes/abc/recordings?topic=1.1");
  });
  it("falls back for empty values", () => {
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext("")).toBe("/dashboard");
    expect(safeNext(undefined, "/x")).toBe("/x");
  });
  it("refuses other websites and tricks", () => {
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("/\\evil.example")).toBe("/dashboard");
    expect(safeNext("javascript:alert(1)")).toBe("/dashboard");
    expect(safeNext("/ok\r\nSet-Cookie: x=1")).toBe("/dashboard");
  });
  it("never bounces back to an auth page", () => {
    expect(safeNext("/login")).toBe("/dashboard");
    expect(safeNext("/login?next=/x")).toBe("/dashboard");
    expect(safeNext("/register?code=ABC")).toBe("/dashboard");
    expect(safeNext("/auth/callback?code=1")).toBe("/dashboard");
    expect(safeNext("/reset-password")).toBe("/reset-password");
  });
});

describe("withParam", () => {
  it("adds and replaces a parameter", () => {
    expect(withParam("/dashboard", "error", "Oops, try again")).toBe("/dashboard?error=Oops%2C+try+again");
    expect(withParam("/classes/1?x=1", "error", "a")).toBe("/classes/1?x=1&error=a");
    expect(withParam("/classes/1?error=old", "error", "new")).toBe("/classes/1?error=new");
  });
});

describe("decideAccess", () => {
  it("lets signed-out people open the public pages", () => {
    for (const path of ["/login", "/register", "/forgot-password", "/auth/callback"]) {
      expect(decideAccess(path, "", false)).toEqual({ action: "continue" });
    }
  });

  it("sends signed-out people to login and remembers where they were going", () => {
    expect(decideAccess("/classes/abc", "", false)).toEqual({
      action: "redirect",
      to: "/login?next=%2Fclasses%2Fabc",
    });
    expect(decideAccess("/classes/abc/recordings", "?topic=1.1", false)).toEqual({
      action: "redirect",
      to: `/login?next=${encodeURIComponent("/classes/abc/recordings?topic=1.1")}`,
    });
  });

  it("does not add a return address for the home page", () => {
    expect(decideAccess("/", "", false)).toEqual({ action: "redirect", to: "/login" });
  });

  it("answers data requests with 401 instead of a login page", () => {
    expect(decideAccess("/api/recordings/1/playback", "", false)).toEqual({ action: "unauthorized" });
  });

  it("sends signed-in people away from the login page, to where they were going", () => {
    expect(decideAccess("/login", "", true)).toEqual({ action: "redirect", to: "/dashboard" });
    expect(decideAccess("/login", "?next=%2Fclasses%2Fabc", true)).toEqual({ action: "redirect", to: "/classes/abc" });
    expect(decideAccess("/login", "?next=https%3A%2F%2Fevil.example", true)).toEqual({ action: "redirect", to: "/dashboard" });
  });

  it("keeps the invite code when a signed-in person opens a register link", () => {
    expect(decideAccess("/register", "?code=A1B2C-D3E4F", true)).toEqual({
      action: "redirect",
      to: "/dashboard?code=A1B2C-D3E4F",
    });
    expect(decideAccess("/register", "", true)).toEqual({ action: "redirect", to: "/dashboard" });
  });

  it("lets signed-in people use everything else", () => {
    expect(decideAccess("/dashboard", "", true)).toEqual({ action: "continue" });
    expect(decideAccess("/reset-password", "", true)).toEqual({ action: "continue" });
    expect(decideAccess("/api/recordings/1/playback", "", true)).toEqual({ action: "continue" });
  });
});
