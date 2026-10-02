import { describe, expect, it } from "vitest";
import { packageAppliesTo, packPricing, validityLabel } from "./packages";

describe("packPricing", () => {
  it("10 lessons −10% on a $60 lesson", () => {
    expect(packPricing(6000, { lessonsCount: 10, discountPercent: 10 })).toEqual({
      perLessonCents: 5400,
      totalCents: 54000,
      fullCents: 60000,
      savingsCents: 6000,
    });
  });

  it("5 lessons −5% on a $60 lesson", () => {
    expect(packPricing(6000, { lessonsCount: 5, discountPercent: 5 })).toMatchObject({ perLessonCents: 5700, totalCents: 28500, savingsCents: 1500 });
  });

  it("rounds per-lesson price to the cent (same as SQL round)", () => {
    expect(packPricing(4550, { lessonsCount: 5, discountPercent: 5 }).perLessonCents).toBe(4323); // 4322.5 → 4323
  });
});

describe("packageAppliesTo", () => {
  it("applies to all services when none are listed", () => expect(packageAppliesTo({ serviceIds: [], isActive: true }, "svc")).toBe(true));
  it("respects the service list and active flag", () => {
    expect(packageAppliesTo({ serviceIds: ["a"], isActive: true }, "b")).toBe(false);
    expect(packageAppliesTo({ serviceIds: [], isActive: false }, "a")).toBe(false);
  });
});

describe("validityLabel", () => {
  it("formats common durations", () => {
    expect(validityLabel(30)).toBe("valid 1 month");
    expect(validityLabel(60)).toBe("valid 2 months");
    expect(validityLabel(14)).toBe("valid 2 weeks");
    expect(validityLabel(10)).toBe("valid 10 days");
  });
});
