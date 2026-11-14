// Pure helpers for recordings: YouTube links, chapter lists, timestamps, syllabus codes.

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Accepts a bare video ID or any common YouTube link and returns the 11 character ID. */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (VIDEO_ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\./, "");
  let candidate: string | null = null;

  if (host === "youtu.be") {
    candidate = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.pathname === "/watch") candidate = url.searchParams.get("v");
    else if (["embed", "live", "shorts", "v"].includes(parts[0] ?? "")) candidate = parts[1] ?? null;
  }

  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

/** "4:12" or "1:05:09" to seconds. */
export function parseTimestamp(text: string): number | null {
  const parts = text.trim().split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d{1,2}$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.slice(1).some((n) => n > 59)) return null;
  return nums.length === 3 ? nums[0] * 3600 + nums[1] * 60 + nums[2] : nums[0] * 60 + nums[1];
}

export function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** Spoken form for screen readers, for example "4 minutes 12 seconds". */
export function spokenTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const out: string[] = [];
  if (h) out.push(`${h} ${h === 1 ? "hour" : "hours"}`);
  if (m) out.push(`${m} ${m === 1 ? "minute" : "minutes"}`);
  if (sec || out.length === 0) out.push(`${sec} ${sec === 1 ? "second" : "seconds"}`);
  return out.join(" ");
}

export type Chapter = { start: number; title: string };

const CHAPTER_LINE = /^\(?(\d{1,2}(?::\d{2}){1,2})\)?\s*[-\u2013:|]?\s*(.+)$/;

/** One chapter per line, for example "4:12 Binary to denary". */
export function parseChapters(text: string): { chapters: Chapter[]; errors: string[] } {
  const chapters: Chapter[] = [];
  const errors: string[] = [];

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const match = CHAPTER_LINE.exec(line);
    const start = match ? parseTimestamp(match[1]) : null;
    const title = match ? match[2].trim() : "";
    if (!match || start === null || !title) {
      errors.push(`Chapter line ${i + 1}: start with a time like 4:12, then the title.`);
      return;
    }
    if (title.length > 200) {
      errors.push(`Chapter line ${i + 1}: the title is longer than 200 characters.`);
      return;
    }
    if (chapters.some((c) => c.start === start)) {
      errors.push(`Chapter line ${i + 1}: another chapter already starts at ${formatTimestamp(start)}.`);
      return;
    }
    chapters.push({ start, title });
  });

  chapters.sort((a, b) => a.start - b.start);
  return { chapters, errors };
}

/** Index of the chapter playing at this time, or -1 if there are no chapters. */
export function currentChapterIndex(chapters: Chapter[], seconds: number): number {
  let index = -1;
  for (let i = 0; i < chapters.length; i += 1) {
    if (chapters[i].start <= seconds) index = i;
    else break;
  }
  return chapters.length > 0 && index === -1 ? 0 : index;
}

/** Splits "1.1, 1.2 2.1" into valid syllabus codes and the entries that are not codes. */
export function parseCodes(text: string): { codes: string[]; invalid: string[] } {
  const seen = new Set<string>();
  const invalid: string[] = [];
  for (const token of text.split(/[\s,;]+/).filter(Boolean)) {
    if (/^\d+(\.\d+)*(\.o\d+)?$/.test(token)) seen.add(token);
    else invalid.push(token);
  }
  return { codes: [...seen], invalid };
}
