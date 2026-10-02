import { describe, expect, it } from "vitest";
import { checkOccurrence, describeRecurrence, generateOccurrences } from "./recurrence";
import type { AvailabilityRule } from "./types";

describe("generateOccurrences", () => {
  it("returns a single date for one-off lessons", () => {
    expect(generateOccurrences("2030-01-07", { frequency: "once", interval: 1, end: { type: "count", count: 10 } })).toEqual(["2030-01-07"]);
  });

  it("repeats weekly for a number of lessons", () => {
    expect(generateOccurrences("2030-01-07", { frequency: "weekly", interval: 1, end: { type: "count", count: 3 } })).toEqual([
      "2030-01-07",
      "2030-01-14",
      "2030-01-21",
    ]);
  });

  it("repeats every 2 weeks until a date (inclusive)", () => {
    expect(generateOccurrences("2030-01-07", { frequency: "weekly", interval: 2, end: { type: "until", until: "2030-02-04" } })).toEqual([
      "2030-01-07",
      "2030-01-21",
      "2030-02-04",
    ]);
  });

  it("repeats daily across month boundaries", () => {
    expect(generateOccurrences("2030-01-30", { frequency: "daily", interval: 1, end: { type: "count", count: 4 } })).toEqual([
      "2030-01-30",
      "2030-01-31",
      "2030-02-01",
      "2030-02-02",
    ]);
  });

  it("repeats monthly on the same day and skips months without that day", () => {
    expect(generateOccurrences("2030-01-31", { frequency: "monthly", interval: 1, end: { type: "count", count: 3 } })).toEqual([
      "2030-01-31",
      "2030-03-31",
      "2030-05-31",
    ]);
  });

  it("caps at 100 occurrences and one year", () => {
    expect(generateOccurrences("2030-01-01", { frequency: "daily", interval: 1, end: { type: "count", count: 500 } })).toHaveLength(100);
    const weekly = generateOccurrences("2030-01-01", { frequency: "weekly", interval: 1, end: { type: "until", until: "2035-01-01" } });
    expect(weekly.at(-1)! <= "2031-01-02").toBe(true);
  });
});

describe("describeRecurrence", () => {
  it("summarizes weekly series", () => {
    expect(describeRecurrence("2030-01-07", "10:00", { frequency: "weekly", interval: 1, end: { type: "count", count: 10 } })).toBe(
      "Every week on Monday at 10:00 · 10 lessons",
    );
  });
});

describe("checkOccurrence", () => {
  const rules: AvailabilityRule[] = [
    { id: "r", weekday: 1, startTime: "08:00", endTime: "12:00", locationId: null, validFrom: null, validUntil: null, isActive: true },
  ];
  const base = { date: "2030-01-07", start: "09:00", end: "10:00", locationId: "loc", today: "2030-01-01", bookings: [], blocked: [], rules };

  it("is ok inside weekly hours", () => expect(checkOccurrence(base).status).toBe("ok"));
  it("allows (but flags) times outside weekly hours", () => expect(checkOccurrence({ ...base, start: "13:00", end: "14:00" }).status).toBe("outside_hours"));
  it("detects overlapping bookings", () => {
    const r = checkOccurrence({ ...base, bookings: [{ date: "2030-01-07", startTime: "09:30", endTime: "10:30", label: "Emma Dubois" }] });
    expect(r.status).toBe("conflict");
    expect(r.detail).toContain("Emma Dubois");
  });
  it("allows back-to-back lessons", () =>
    expect(checkOccurrence({ ...base, bookings: [{ date: "2030-01-07", startTime: "10:00", endTime: "11:00", label: "X" }] }).status).toBe("ok"));
  it("detects blocked days and partial blocks", () => {
    expect(checkOccurrence({ ...base, blocked: [{ id: "b", dateFrom: "2030-01-07", dateTo: "2030-01-07", startTime: null, endTime: null, reason: "Holiday" }] }).status).toBe("blocked");
    expect(checkOccurrence({ ...base, blocked: [{ id: "b", dateFrom: "2030-01-07", dateTo: "2030-01-07", startTime: "11:00", endTime: "12:00", reason: null }] }).status).toBe("ok");
  });
  it("rejects past dates", () => expect(checkOccurrence({ ...base, today: "2030-01-08" }).status).toBe("past"));
});
