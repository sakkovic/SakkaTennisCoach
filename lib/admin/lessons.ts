import "server-only";
import { getRepository } from "@/lib/data";
import { computePrice } from "@/lib/booking/money";
import { checkOccurrence, describeRecurrence, generateOccurrences, type OccurrenceCheck, type Recurrence } from "@/lib/booking/recurrence";
import { minutesToTime, nowInTimeZone, timeToMinutes } from "@/lib/booking/time";
import { discountedLessonCents } from "@/lib/booking/packages";
import { ACTIVE_STATUSES, type BookingPackage, type Location, type Service } from "@/lib/booking/types";
import type { AdminLessonValues } from "@/lib/validation/admin";

export type LessonPlan =
  | {
      ok: true;
      service: Service;
      location: Location;
      endTime: string;
      priceCents: number;
      package: BookingPackage | null;
      recurrence: Recurrence;
      summary: string;
      checks: OccurrenceCheck[];
    }
  | { ok: false; error: string; field?: string };

export function toRecurrence(v: AdminLessonValues): Recurrence {
  return {
    frequency: v.frequency,
    interval: v.interval,
    end: v.endType === "until" && v.until ? { type: "until", until: v.until } : { type: "count", count: v.count },
  };
}

/**
 * Expands a lesson request into dates and checks each one against existing
 * bookings, blocked dates and weekly hours. Used for both the preview and the
 * actual creation, so what the coach sees is exactly what gets saved.
 */
export async function planLessons(v: AdminLessonValues): Promise<LessonPlan> {
  const repo = getRepository();
  const [services, locations, settings, packages] = await Promise.all([
    repo.listServices(),
    repo.listLocations(),
    repo.getSettings(),
    repo.listPackages({ includeInactive: true }),
  ]);

  const service = services.find((s) => s.id === v.serviceId);
  if (!service) return { ok: false, error: "This lesson type is not available.", field: "serviceId" };
  const location = locations.find((l) => l.id === v.locationId);
  if (!location) return { ok: false, error: "This location is not available.", field: "locationId" };
  if (service.locationIds.length > 0 && !service.locationIds.includes(location.id)) {
    return { ok: false, error: `${service.name} is not offered at ${location.name}.`, field: "locationId" };
  }
  if (v.playersCount < service.minPlayers || v.playersCount > service.maxPlayers) {
    return { ok: false, error: `${service.name} is for ${service.minPlayers}–${service.maxPlayers} players.`, field: "playersCount" };
  }
  // Packs that were deactivated later still apply to lessons the coach schedules for them.
  const pkg = v.packageId ? packages.find((p) => p.id === v.packageId) : null;
  if (v.packageId && (!pkg || (pkg.serviceIds.length > 0 && !pkg.serviceIds.includes(service.id)))) {
    return { ok: false, error: "This lesson pack doesn't apply to this lesson type.", field: "packageId" };
  }
  const endMinutes = timeToMinutes(v.startTime) + service.durationMin;
  if (endMinutes > 24 * 60) return { ok: false, error: "The lesson must end before midnight.", field: "startTime" };
  const endTime = minutesToTime(endMinutes);

  const recurrence = toRecurrence(v);
  const dates = generateOccurrences(v.date, recurrence);
  const today = nowInTimeZone(settings.timezone).date;

  const [bookings, blocked, rules] = await Promise.all([
    repo.listBookings({ today, scope: "all", from: dates[0], to: dates.at(-1) }),
    repo.listBlockedDates(dates[0]),
    repo.listAvailabilityRules(),
  ]);
  const active = bookings
    .filter((b) => ACTIVE_STATUSES.includes(b.status))
    .map((b) => ({ date: b.date, startTime: b.startTime, endTime: b.endTime, label: `${b.firstName} ${b.lastName}` }));

  const checks = dates.map((date) =>
    checkOccurrence({ date, start: v.startTime, end: endTime, locationId: location.id, today, bookings: active, blocked, rules }),
  );

  const baseCents = computePrice(service.priceCents, service.pricingUnit, v.playersCount);
  return {
    ok: true,
    service,
    location,
    endTime,
    priceCents: v.customPrice ?? (pkg ? discountedLessonCents(baseCents, pkg.discountPercent) : baseCents),
    package: pkg ? { id: pkg.id, name: pkg.name, lessons: pkg.lessonsCount, discountPercent: pkg.discountPercent, totalCents: null } : null,
    recurrence,
    summary: describeRecurrence(v.date, v.startTime, recurrence),
    checks,
  };
}
