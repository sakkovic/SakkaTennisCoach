import type { Package, Service } from "./types";

/**
 * Lesson-pack pricing. Keep in sync with create_booking() in
 * supabase/migrations/20261002000000_lesson_packs.sql (same rounding).
 */
export function discountedLessonCents(baseLessonCents: number, discountPercent: number): number {
  return Math.round((baseLessonCents * (100 - discountPercent)) / 100);
}

export function packPricing(baseLessonCents: number, pkg: Pick<Package, "lessonsCount" | "discountPercent">) {
  const perLessonCents = discountedLessonCents(baseLessonCents, pkg.discountPercent);
  const totalCents = perLessonCents * pkg.lessonsCount;
  const fullCents = baseLessonCents * pkg.lessonsCount;
  return { perLessonCents, totalCents, fullCents, savingsCents: fullCents - totalCents };
}

export function packageAppliesTo(pkg: Pick<Package, "serviceIds" | "isActive">, serviceId: string): boolean {
  return pkg.isActive && (pkg.serviceIds.length === 0 || pkg.serviceIds.includes(serviceId));
}

export function packagesFor(packages: Package[], service: Pick<Service, "id">): Package[] {
  return packages.filter((p) => packageAppliesTo(p, service.id)).sort((a, b) => a.sortOrder - b.sortOrder || a.lessonsCount - b.lessonsCount);
}

export function validityLabel(days: number, lang: "en" | "fr" = "en"): string {
  if (lang === "fr") {
    if (days === 30 || days === 31) return "valable 1 mois";
    if (days % 30 === 0) return `valable ${days / 30} mois`;
    if (days % 7 === 0) return `valable ${days / 7} semaine${days === 7 ? "" : "s"}`;
    return `valable ${days} jours`;
  }
  if (days === 30 || days === 31) return "valid 1 month";
  if (days % 30 === 0) return `valid ${days / 30} months`;
  if (days % 7 === 0) return `valid ${days / 7} week${days === 7 ? "" : "s"}`;
  return `valid ${days} days`;
}
