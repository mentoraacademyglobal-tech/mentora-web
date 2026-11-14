import { describe, expect, it } from "vitest";
import {
  currentChapterIndex,
  formatTimestamp,
  parseChapters,
  parseCodes,
  parseTimestamp,
  parseYouTubeId,
  spokenTime,
} from "./recordings";

describe("parseYouTubeId", () => {
  const id = "dQw4w9WgXcQ";
  it("accepts a bare ID", () => expect(parseYouTubeId(id)).toBe(id));
  it("reads watch links", () => {
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=${id}`)).toBe(id);
    expect(parseYouTubeId(`https://youtube.com/watch?v=${id}&t=42s`)).toBe(id);
    expect(parseYouTubeId(`https://m.youtube.com/watch?v=${id}`)).toBe(id);
  });
  it("reads short, embed, live and shorts links", () => {
    expect(parseYouTubeId(`https://youtu.be/${id}?si=abc`)).toBe(id);
    expect(parseYouTubeId(`https://www.youtube.com/embed/${id}`)).toBe(id);
    expect(parseYouTubeId(`https://www.youtube.com/live/${id}`)).toBe(id);
    expect(parseYouTubeId(`https://www.youtube.com/shorts/${id}`)).toBe(id);
  });
  it("accepts a link without https and with spaces around it", () => {
    expect(parseYouTubeId(`  youtu.be/${id}  `)).toBe(id);
  });
  it("rejects other sites, playlists and junk", () => {
    expect(parseYouTubeId("https://vimeo.com/123456789")).toBeNull();
    expect(parseYouTubeId("https://www.youtube.com/playlist?list=PL12345")).toBeNull();
    expect(parseYouTubeId("not a link")).toBeNull();
    expect(parseYouTubeId("https://evil.example/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseYouTubeId("")).toBeNull();
  });
});

describe("timestamps", () => {
  it("parses minutes and hours", () => {
    expect(parseTimestamp("4:12")).toBe(252);
    expect(parseTimestamp("0:00")).toBe(0);
    expect(parseTimestamp("1:05:09")).toBe(3909);
  });
  it("rejects bad values", () => {
    expect(parseTimestamp("4:72")).toBeNull();
    expect(parseTimestamp("412")).toBeNull();
    expect(parseTimestamp("1:2:3:4")).toBeNull();
    expect(parseTimestamp("a:bc")).toBeNull();
  });
  it("formats", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(252)).toBe("4:12");
    expect(formatTimestamp(3909)).toBe("1:05:09");
    expect(formatTimestamp(-5)).toBe("0:00");
  });
  it("speaks times for screen readers", () => {
    expect(spokenTime(0)).toBe("0 seconds");
    expect(spokenTime(61)).toBe("1 minute 1 second");
    expect(spokenTime(3909)).toBe("1 hour 5 minutes 9 seconds");
  });
});

describe("parseChapters", () => {
  it("reads lines in several common styles and sorts them", () => {
    const { chapters, errors } = parseChapters("4:12 - Binary to denary\n0:00 Introduction\n(13:30) Hexadecimal\n27:45: Worked examples");
    expect(errors).toEqual([]);
    expect(chapters).toEqual([
      { start: 0, title: "Introduction" },
      { start: 252, title: "Binary to denary" },
      { start: 810, title: "Hexadecimal" },
      { start: 1665, title: "Worked examples" },
    ]);
  });
  it("reports unreadable lines and duplicate times", () => {
    const { errors } = parseChapters("0:00 Intro\nno time here\n0:00 Again");
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("line 2");
    expect(errors[1]).toContain("line 3");
  });
  it("ignores blank lines", () => {
    expect(parseChapters("\n\n0:00 One\n\n").chapters).toHaveLength(1);
  });
});

describe("currentChapterIndex", () => {
  const chapters = [
    { start: 0, title: "A" },
    { start: 100, title: "B" },
    { start: 200, title: "C" },
  ];
  it("finds the chapter for a time", () => {
    expect(currentChapterIndex(chapters, 0)).toBe(0);
    expect(currentChapterIndex(chapters, 99)).toBe(0);
    expect(currentChapterIndex(chapters, 100)).toBe(1);
    expect(currentChapterIndex(chapters, 5000)).toBe(2);
  });
  it("returns the first chapter before it starts, and -1 with no chapters", () => {
    expect(currentChapterIndex([{ start: 30, title: "X" }], 10)).toBe(0);
    expect(currentChapterIndex([], 10)).toBe(-1);
  });
});

describe("parseCodes", () => {
  it("splits and de-duplicates syllabus codes", () => {
    expect(parseCodes("1.1, 1.2  2.1;1.1")).toEqual({ codes: ["1.1", "1.2", "2.1"], invalid: [] });
  });
  it("accepts objective codes and reports the rest", () => {
    expect(parseCodes("1.1.o2 abc 3")).toEqual({ codes: ["1.1.o2", "3"], invalid: ["abc"] });
  });
});
