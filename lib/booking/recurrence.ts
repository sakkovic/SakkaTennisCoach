import { addDays, addMonths, diffDays, firstOfMonth, lastOfMonth, timeToMinutes, WEEKDAYS, weekdayOf } from "./time";
import type { AvailabilityRule, BlockedDate, ISODate, TimeHM } from "./types";
import { rulesForDate } from "./slots";

/**
 * Recurring lessons created by the coach (admin). Pure functions, unit-tested.
 */

export const FREQUENCIES = ["once", "daily", "weekly", "monthly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export type Recurrence = {
  frequency: Frequency;
  /** every N days / weeks / months */
  interval: number;
  end: { type: "count"; count: number } | { type: "until"; until: ISODate };
};

/** Hard limits so a typo can't create thousands of lessons. */
export const MAX_OCCURRENCES = 100;
export const MAX_SPAN_DAYS = 366;

export function generateOccurrences(start: ISODate, r: Recurrence): ISODate[] {
  if (r.frequency === "once") return [start];

  const limit = r.end.type === "count" ? Math.min(r.end.count, MAX_OCCURRENCES) : MAX_OCCURRENCES;
  const until = r.end.type === "until" ? r.end.until : addDays(start, MAX_SPAN_DAYS);
  const hardStop = addDays(start, MAX_SPAN_DAYS);
  const stop = until < hardStop ? until : hardStop;
  const step = Math.max(1, r.interval);
  const dates: ISODate[] = [];

  if (r.frequency === "monthly") {
    const day = Number(start.slice(8, 10));
    // Iterate months; skip months that don't have this day (e.g. the 31st).
    for (let k = 0; dates.length < limit && k < 13 * 12; k++) {
      const month = addMonths(start.slice(0, 7), k * step);
      const candidate = `${month}-${String(day).padStart(2, "0")}`;
      if (candidate > stop) break;
      if (day <= Number(lastOfMonth(month).slice(8, 10)) && candidate >= firstOfMonth(start.slice(0, 7))) dates.push(candidate);
    }
    return dates;
  }

  const daysPerStep = r.frequency === "daily" ? step : step * 7;
  for (let d = start; d <= stop && dates.length < limit; d = addDays(d, daysPerStep)) dates.push(d);
  return dates;
}

export function describeRecurrence(start: ISODate, time: TimeHM, r: Recurrence): string {
  const every = (unit: string) => (r.interval > 1 ? `Every ${r.interval} ${unit}s` : `Every ${unit}`);
  const base =
    r.frequency === "once"
      ? "One lesson"
      : r.frequency === "daily"
        ? every("day")
        : r.frequency === "weekly"
          ? `${r.interval > 1 ? `Every ${r.interval} weeks` : "Every week"} on ${WEEKDAYS[weekdayOf(start)]}`
          : `${every("month")} on day ${Number(start.slice(8, 10))}`;
  if (r.frequency === "once") return `${base} at ${time}`;
  const end = r.end.type === "count" ? `${r.end.count} lessons` : `until ${r.end.until}`;
  return `${base} at ${time} · ${end}`;
}

// ---------------------------------------------------------------------------
// Conflict check for one occurrence
// ---------------------------------------------------------------------------

export type OccurrenceStatus = "ok" | "outside_hours" | "conflict" | "blocked" | "past";

export type OccurrenceCheck = { date: ISODate; status: OccurrenceStatus; detail?: string };

export type ExistingBooking = { date: ISODate; startTime: TimeHM; endTime: TimeHM; label: string };

/** Statuses that will be created. "outside_hours" is allowed — the coach decides. */
export const CREATABLE: readonly OccurrenceStatus[] = ["ok", "outside_hours"];

export function checkOccurrence(input: {
  date: ISODate;
  start: TimeHM;
  end: TimeHM;
  locationId: string;
  today: ISODate;
  /** Active (pending/confirmed) bookings, all locations */
  bookings: ExistingBooking[];
  blocked: BlockedDate[];
  rules: AvailabilityRule[];
}): OccurrenceCheck {
  const { date } = input;
  const s = timeToMinutes(input.start);
  const e = timeToMinutes(input.end);

  if (diffDays(date, input.today) < 0) return { date, status: "past", detail: "Date is in the past" };

  const clash = input.bookings.find((b) => b.date === date && timeToMinutes(b.startTime) < e && s < timeToMinutes(b.endTime));
  if (clash) return { date, status: "conflict", detail: `Overlaps ${clash.label} (${clash.startTime}–${clash.endTime})` };

  const block = input.blocked.find(
    (b) =>
      b.dateFrom <= date &&
      b.dateTo >= date &&
      (b.startTime === null || (timeToMinutes(b.startTime) < e && s < timeToMinutes(b.endTime!))),
  );
  if (block) return { date, status: "blocked", detail: block.reason ? `Blocked: ${block.reason}` : "Blocked time" };

  const inHours = rulesForDate(input.rules, date, input.locationId).some(
    (r) => timeToMinutes(r.startTime) <= s && e <= timeToMinutes(r.endTime),
  );
  if (!inHours) return { date, status: "outside_hours", detail: "Outside your weekly hours" };

  return { date, status: "ok" };
}
