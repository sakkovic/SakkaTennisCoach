import { diffDays, minutesToTime, timeToMinutes, weekdayOf } from "./time";
import type { AvailabilityRule, BlockedDate, CoachSettings, ISODate, Slot, TimeHM } from "./types";

/**
 * Slot engine — pure and deterministic.
 *
 * This is the TypeScript reference implementation of `public.get_available_slots`
 * in supabase/migrations. Both must follow the same rules:
 *   1. Windows come from active weekly rules for that weekday (+ location, + validity range).
 *   2. Candidate starts step by `slotIntervalMin`; the lesson must fit inside the window.
 *   3. Full-day blocks remove the day; partial blocks remove overlapping slots.
 *   4. Existing pending/confirmed bookings (any location — one coach) remove
 *      overlapping slots, padded by `bufferMin` on both sides.
 *   5. Slots earlier than now + minNoticeHours, or beyond maxAdvanceDays, are removed.
 */

export type BusyInterval = { start: TimeHM; end: TimeHM };

export type SlotQuery = {
  date: ISODate;
  locationId: string;
  durationMin: number;
  rules: AvailabilityRule[];
  blocked: BlockedDate[];
  /** Active bookings on `date` (all locations). */
  busy: BusyInterval[];
  settings: Pick<CoachSettings, "slotIntervalMin" | "minNoticeHours" | "maxAdvanceDays" | "bufferMin">;
  /** Current moment in the coach's timezone. */
  now: { date: ISODate; minutes: number };
};

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

export function rulesForDate(rules: AvailabilityRule[], date: ISODate, locationId: string) {
  const weekday = weekdayOf(date);
  return rules.filter(
    (r) =>
      r.isActive &&
      r.weekday === weekday &&
      (r.locationId === null || r.locationId === locationId) &&
      (r.validFrom === null || r.validFrom <= date) &&
      (r.validUntil === null || r.validUntil >= date),
  );
}

export function isDateInBookingWindow(date: ISODate, now: SlotQuery["now"], maxAdvanceDays: number) {
  const offset = diffDays(date, now.date);
  return offset >= 0 && offset <= maxAdvanceDays;
}

export function computeAvailableSlots(q: SlotQuery): Slot[] {
  const { date, settings, now } = q;
  if (!isDateInBookingWindow(date, now, settings.maxAdvanceDays)) return [];

  const blocks = q.blocked.filter((b) => b.dateFrom <= date && b.dateTo >= date);
  if (blocks.some((b) => b.startTime === null || b.endTime === null)) return [];

  const partialBlocks = blocks.map((b) => [timeToMinutes(b.startTime!), timeToMinutes(b.endTime!)] as const);
  const busy = q.busy.map((b) => [timeToMinutes(b.start) - settings.bufferMin, timeToMinutes(b.end) + settings.bufferMin] as const);

  // Earliest bookable minute on `date`, relative to that day's midnight.
  const earliest = diffDays(now.date, date) * 1440 + now.minutes + settings.minNoticeHours * 60;

  const starts = new Set<number>();
  for (const rule of rulesForDate(q.rules, date, q.locationId)) {
    const windowStart = timeToMinutes(rule.startTime);
    const windowEnd = timeToMinutes(rule.endTime);
    for (let t = windowStart; t + q.durationMin <= windowEnd; t += settings.slotIntervalMin) {
      starts.add(t);
    }
  }

  return [...starts]
    .sort((a, b) => a - b)
    .filter((start) => {
      const end = start + q.durationMin;
      if (start < earliest) return false;
      if (partialBlocks.some(([bs, be]) => overlaps(start, end, bs, be))) return false;
      if (busy.some(([bs, be]) => overlaps(start, end, bs, be))) return false;
      return true;
    })
    .map((start) => ({ start: minutesToTime(start), end: minutesToTime(start + q.durationMin) }));
}
