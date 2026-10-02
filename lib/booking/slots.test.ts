import { describe, expect, it } from "vitest";
import { computeAvailableSlots, type SlotQuery } from "./slots";
import type { AvailabilityRule } from "./types";

// 2030-01-07 is a Monday (weekday 1)
const MONDAY = "2030-01-07";

const rule = (over: Partial<AvailabilityRule> = {}): AvailabilityRule => ({
  id: "r1",
  weekday: 1,
  startTime: "08:00",
  endTime: "12:00",
  locationId: null,
  validFrom: null,
  validUntil: null,
  isActive: true,
  ...over,
});

const base = (over: Partial<SlotQuery> = {}): SlotQuery => ({
  date: MONDAY,
  locationId: "loc-a",
  durationMin: 60,
  rules: [rule()],
  blocked: [],
  busy: [],
  settings: { slotIntervalMin: 60, minNoticeHours: 0, maxAdvanceDays: 60, bufferMin: 0 },
  now: { date: "2030-01-01", minutes: 9 * 60 },
  ...over,
});

const starts = (q: SlotQuery) => computeAvailableSlots(q).map((s) => s.start);

describe("computeAvailableSlots", () => {
  it("generates slots that fit inside the availability window", () => {
    expect(starts(base())).toEqual(["08:00", "09:00", "10:00", "11:00"]);
  });

  it("respects the slot interval and lesson duration", () => {
    const q = base({ durationMin: 90, settings: { ...base().settings, slotIntervalMin: 30 } });
    expect(starts(q)).toEqual(["08:00", "08:30", "09:00", "09:30", "10:00", "10:30"]);
  });

  it("returns nothing on a weekday without rules", () => {
    expect(starts(base({ date: "2030-01-08" }))).toEqual([]);
  });

  it("merges multiple windows on the same day", () => {
    const q = base({ rules: [rule(), rule({ id: "r2", startTime: "16:00", endTime: "18:00" })] });
    expect(starts(q)).toEqual(["08:00", "09:00", "10:00", "11:00", "16:00", "17:00"]);
  });

  it("filters location-specific rules", () => {
    const q = base({ rules: [rule({ locationId: "loc-b" })] });
    expect(starts(q)).toEqual([]);
    expect(starts({ ...q, locationId: "loc-b" })).toHaveLength(4);
  });

  it("honours rule validity ranges", () => {
    expect(starts(base({ rules: [rule({ validFrom: "2030-02-01" })] }))).toEqual([]);
    expect(starts(base({ rules: [rule({ validUntil: "2030-01-06" })] }))).toEqual([]);
  });

  it("removes overlapping existing bookings (any location)", () => {
    const q = base({ busy: [{ start: "09:00", end: "10:00" }] });
    expect(starts(q)).toEqual(["08:00", "10:00", "11:00"]);
  });

  it("applies the buffer around existing bookings", () => {
    const q = base({
      busy: [{ start: "09:00", end: "10:00" }],
      settings: { ...base().settings, bufferMin: 15, slotIntervalMin: 30 },
    });
    // 08:00-09:00 ends exactly at 09:00 but buffer pushes busy to 08:45-10:15
    expect(starts(q)).toEqual(["10:30", "11:00"]);
  });

  it("blocks whole days", () => {
    const q = base({ blocked: [{ id: "b", dateFrom: "2030-01-06", dateTo: "2030-01-08", startTime: null, endTime: null, reason: null }] });
    expect(starts(q)).toEqual([]);
  });

  it("blocks partial days", () => {
    const q = base({ blocked: [{ id: "b", dateFrom: MONDAY, dateTo: MONDAY, startTime: "10:30", endTime: "12:00", reason: null }] });
    expect(starts(q)).toEqual(["08:00", "09:00"]);
  });

  it("enforces minimum notice on the same day", () => {
    const q = base({ now: { date: MONDAY, minutes: 8 * 60 + 10 }, settings: { ...base().settings, minNoticeHours: 1 } });
    // earliest = 09:10 → 10:00 onwards
    expect(starts(q)).toEqual(["10:00", "11:00"]);
  });

  it("enforces minimum notice across midnight", () => {
    const q = base({ now: { date: "2030-01-06", minutes: 23 * 60 }, settings: { ...base().settings, minNoticeHours: 10 } });
    // earliest = Monday 09:00
    expect(starts(q)).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("rejects past dates and dates beyond the booking window", () => {
    expect(starts(base({ now: { date: "2030-01-08", minutes: 0 } }))).toEqual([]);
    expect(starts(base({ settings: { ...base().settings, maxAdvanceDays: 3 } }))).toEqual([]);
  });

  it("ignores inactive rules", () => {
    expect(starts(base({ rules: [rule({ isActive: false })] }))).toEqual([]);
  });
});
