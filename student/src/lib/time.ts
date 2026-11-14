// Date and time helpers. The academy has one time zone (default Sri Lanka) and all
// session times are entered and shown in it, whatever the viewer's device says.

export const DEFAULT_TIMEZONE = "Asia/Colombo";

function offsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return (asUtc - Math.floor(utcMs / 1000) * 1000) / 60000;
}

/** Turns a wall-clock date (YYYY-MM-DD) and time (HH:mm) in a time zone into the exact moment. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;

  const [y, mo, day, h, mi] = [d[1], d[2], d[3], t[1], t[2]].map(Number);
  const check = new Date(Date.UTC(y, mo - 1, day));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== day) return null;
  if (h > 23 || mi > 59) return null;

  const guess = Date.UTC(y, mo - 1, day, h, mi);
  const first = guess - offsetMinutes(guess, timeZone) * 60000;
  const second = guess - offsetMinutes(first, timeZone) * 60000;
  return new Date(second);
}

/** Adds whole days to a YYYY-MM-DD date. Done on the calendar date, so daylight saving cannot shift it. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

function partsIn(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, ...options }).formatToParts(new Date(iso));
  return (type: string) => parts.find((p) => p.type === type)?.value ?? "";
}

export function formatDay(iso: string, timeZone: string): string {
  const get = partsIn(iso, timeZone, { weekday: "short", day: "numeric", month: "short" });
  return `${get("weekday")} ${get("day")} ${get("month")}`;
}

export function formatTime(iso: string, timeZone: string): string {
  const get = partsIn(iso, timeZone, { hour: "numeric", minute: "2-digit", hour12: true });
  return `${get("hour")}:${get("minute")} ${get("dayPeriod").toLowerCase()}`;
}

export function formatRange(startIso: string, endIso: string, timeZone: string): string {
  return `${formatDay(startIso, timeZone)}, ${formatTime(startIso, timeZone)} to ${formatTime(endIso, timeZone)}`;
}

/** "Tuesday 3 November", in the academy time zone. */
export function formatLongDate(iso: string, timeZone: string): string {
  const get = partsIn(iso, timeZone, { weekday: "long", day: "numeric", month: "long" });
  return `${get("weekday")} ${get("day")} ${get("month")}`;
}

/** The start of today and of tomorrow in a time zone, as exact moments. */
export function todayRange(nowMilliseconds: number, timeZone: string): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(nowMilliseconds));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const today = `${get("year")}-${get("month")}-${get("day")}`;
  const start = zonedToUtc(today, "00:00", timeZone) as Date;
  const end = zonedToUtc(addDays(today, 1), "00:00", timeZone) as Date;
  return { start, end };
}

/** Current time in milliseconds. Kept in one place so pages do not call Date.now() while rendering. */
export function nowMs(): number {
  return Date.now();
}
