import { describe, expect, it } from "vitest";
import { addDays, formatDay, formatLongDate, formatRange, formatTime, todayRange, zonedToUtc } from "./time";

describe("zonedToUtc", () => {
  it("converts Sri Lanka time (UTC+5:30) to UTC", () => {
    expect(zonedToUtc("2026-11-03", "16:00", "Asia/Colombo")?.toISOString()).toBe("2026-11-03T10:30:00.000Z");
  });

  it("handles the day boundary", () => {
    expect(zonedToUtc("2026-11-03", "01:00", "Asia/Colombo")?.toISOString()).toBe("2026-11-02T19:30:00.000Z");
  });

  it("respects daylight saving", () => {
    // New York is UTC-4 in summer and UTC-5 in winter.
    expect(zonedToUtc("2026-07-01", "12:00", "America/New_York")?.toISOString()).toBe("2026-07-01T16:00:00.000Z");
    expect(zonedToUtc("2026-12-01", "12:00", "America/New_York")?.toISOString()).toBe("2026-12-01T17:00:00.000Z");
    expect(zonedToUtc("2026-03-08", "03:00", "America/New_York")?.toISOString()).toBe("2026-03-08T07:00:00.000Z");
  });

  it("rejects dates and times that do not exist", () => {
    expect(zonedToUtc("2026-02-30", "10:00", "Asia/Colombo")).toBeNull();
    expect(zonedToUtc("2026-11-03", "25:00", "Asia/Colombo")).toBeNull();
    expect(zonedToUtc("03/11/2026", "10:00", "Asia/Colombo")).toBeNull();
    expect(zonedToUtc("2026-11-03", "9:00", "Asia/Colombo")).toBeNull();
  });
});

describe("addDays", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(addDays("2026-11-03", 0)).toBe("2026-11-03");
  });
});

describe("formatting", () => {
  const start = "2026-11-03T10:30:00.000Z";
  const end = "2026-11-03T12:00:00.000Z";

  it("shows day and time in the academy time zone", () => {
    expect(formatDay(start, "Asia/Colombo")).toBe("Tue 3 Nov");
    expect(formatTime(start, "Asia/Colombo")).toBe("4:00 pm");
    expect(formatTime("2026-11-03T03:00:00.000Z", "Asia/Colombo")).toBe("8:30 am");
  });

  it("formats a range", () => {
    expect(formatRange(start, end, "Asia/Colombo")).toBe("Tue 3 Nov, 4:00 pm to 5:30 pm");
  });
});

describe("formatLongDate", () => {
  it("writes the full day and month in the academy time zone", () => {
    expect(formatLongDate("2026-11-03T10:30:00.000Z", "Asia/Colombo")).toBe("Tuesday 3 November");
  });
  it("uses the local date even when UTC is still the day before", () => {
    expect(formatLongDate("2026-11-02T19:30:00.000Z", "Asia/Colombo")).toBe("Tuesday 3 November");
  });
});

describe("todayRange", () => {
  it("covers the local day, not the UTC day", () => {
    // 4:00 pm in Colombo on 3 November is 10:30 UTC the same day.
    const { start, end } = todayRange(Date.parse("2026-11-03T10:30:00.000Z"), "Asia/Colombo");
    expect(start.toISOString()).toBe("2026-11-02T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-11-03T18:30:00.000Z");
  });
  it("puts a late-night UTC time on the next local day", () => {
    const { start } = todayRange(Date.parse("2026-11-02T20:00:00.000Z"), "Asia/Colombo");
    expect(start.toISOString()).toBe("2026-11-02T18:30:00.000Z");
  });
});
