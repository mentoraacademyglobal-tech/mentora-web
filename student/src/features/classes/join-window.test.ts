import { describe, expect, it } from "vitest";
import { GRACE_MS, joinState } from "./join-window";

const start = Date.parse("2026-11-03T10:30:00.000Z");
const end = Date.parse("2026-11-03T12:00:00.000Z");
const base = {
  startsAt: new Date(start).toISOString(),
  endsAt: new Date(end).toISOString(),
  opensMinutes: 10,
};
const minute = 60 * 1000;

describe("joinState", () => {
  it("makes a student wait until the join window opens", () => {
    const state = joinState({ ...base, now: start - 30 * minute, isStudent: true, isManager: false });
    expect(state.canJoin).toBe(false);
    expect(state.waitingUntil).toBe(start - 10 * minute);
  });

  it("lets a student join from 10 minutes before until 30 minutes after the end", () => {
    const at = (now: number) => joinState({ ...base, now, isStudent: true, isManager: false }).canJoin;
    expect(at(start - 10 * minute)).toBe(true);
    expect(at(start - 10 * minute - 1)).toBe(false);
    expect(at(end)).toBe(true);
    expect(at(end + GRACE_MS)).toBe(true);
    expect(at(end + GRACE_MS + 1)).toBe(false);
  });

  it("does not tell a student to wait once the class is over", () => {
    expect(joinState({ ...base, now: end + GRACE_MS + minute, isStudent: true, isManager: false }).waitingUntil).toBeNull();
  });

  it("lets a teacher or admin join early", () => {
    const state = joinState({ ...base, now: start - 5 * 60 * minute, isStudent: false, isManager: true });
    expect(state.canJoin).toBe(true);
    expect(state.waitingUntil).toBeNull();
  });

  it("never lets someone with no place in the class join", () => {
    const state = joinState({ ...base, now: start, isStudent: false, isManager: false });
    expect(state.canJoin).toBe(false);
    expect(state.waitingUntil).toBeNull();
  });
});
