import type { ISODate, TimeHM } from "./types";

/**
 * Timezone-safe date helpers. Calendar dates are plain "YYYY-MM-DD" strings and
 * times are "HH:mm" in the coach's local time, so we never shift a lesson by
 * accident when server/browser timezones differ. Date objects are only used in UTC.
 */

export function timeToMinutes(time: TimeHM): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): TimeHM {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Normalizes "HH:mm:ss" (Postgres `time`) to "HH:mm". */
export function toHM(time: string): TimeHM {
  return time.slice(0, 5);
}

function toUTCDate(date: ISODate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTCDate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = toUTCDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUTCDate(d);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTCDate(a).getTime() - toUTCDate(b).getTime()) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(date: ISODate): number {
  return toUTCDate(date).getUTCDay();
}

export function isValidISODate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return fromUTCDate(toUTCDate(date)) === date;
}

export function monthOf(date: ISODate): string {
  return date.slice(0, 7);
}

export function firstOfMonth(month: string): ISODate {
  return `${month}-01`;
}

export function lastOfMonth(month: string): ISODate {
  const [y, m] = month.split("-").map(Number);
  return fromUTCDate(new Date(Date.UTC(y, m, 0)));
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return fromUTCDate(d).slice(0, 7);
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: ISODate): ISODate {
  const wd = weekdayOf(date);
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

/** Current date and minutes-since-midnight in a given IANA timezone. */
export function nowInTimeZone(timeZone: string, now: Date = new Date()): { date: ISODate; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

// ---------------------------------------------------------------------------
// Display formatting (always UTC-anchored to avoid timezone drift)
// ---------------------------------------------------------------------------

type Lang = "en" | "fr";
const tag = (lang: Lang) => (lang === "fr" ? "fr-FR" : "en-GB");
/** French Intl output is lowercase ("vendredi 2 octobre"); capitalize for UI labels. */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function formatDateLong(date: ISODate, lang: Lang = "en"): string {
  return cap(new Intl.DateTimeFormat(tag(lang), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(toUTCDate(date)));
}

export function formatDateShort(date: ISODate, lang: Lang = "en"): string {
  return cap(new Intl.DateTimeFormat(tag(lang), { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(toUTCDate(date)));
}

export function formatDayMonth(date: ISODate, lang: Lang = "en"): string {
  return new Intl.DateTimeFormat(tag(lang), { day: "numeric", month: "short", timeZone: "UTC" }).format(toUTCDate(date));
}

export function formatMonthYear(month: string, lang: Lang = "en"): string {
  return cap(new Intl.DateTimeFormat(tag(lang), { month: "long", year: "numeric", timeZone: "UTC" }).format(toUTCDate(firstOfMonth(month))));
}

export function formatWeekdayShort(date: ISODate, lang: Lang = "en"): string {
  return cap(new Intl.DateTimeFormat(tag(lang), { weekday: "short", timeZone: "UTC" }).format(toUTCDate(date)));
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}