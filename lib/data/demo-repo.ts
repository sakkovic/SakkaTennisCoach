import "server-only";
import { computePrice } from "@/lib/booking/money";
import { packageAppliesTo, packPricing } from "@/lib/booking/packages";
import { generateReference } from "@/lib/booking/reference";
import { computeAvailableSlots } from "@/lib/booking/slots";
import { addDays, diffDays, minutesToTime, nowInTimeZone, timeToMinutes } from "@/lib/booking/time";
import {
  ACTIVE_STATUSES,
  type AvailabilityRule,
  type BlockedDate,
  type Booking,
  type BookingEvent,
  type CoachSettings,
  type ContactMessage,
  type JourneyPost,
  type Location,
  type Package,
  type Service,
} from "@/lib/booking/types";
import { demoJourney, demoLocations, demoPackages, demoRules, demoServices, demoSettings } from "./demo-seed";
import { JOURNEY_IMAGE_TYPES } from "./journey-images";
import type { Repository } from "./repository";

/**
 * In-memory repository for local development (no Supabase needed).
 * Data lives for the lifetime of the dev server process.
 * Enforces the same rules as the Postgres functions, including double-booking prevention.
 */

type Store = {
  settings: CoachSettings;
  services: Service[];
  locations: Location[];
  rules: AvailabilityRule[];
  blocked: BlockedDate[];
  bookings: Booking[];
  events: BookingEvent[];
  contact: ContactMessage[];
  journey?: JourneyPost[];
  packages?: Package[];
};

/** Lesson packs (lazily seeded so an already-running dev store picks them up). */
function packages(s: Store): Package[] {
  if (!s.packages) s.packages = structuredClone(demoPackages);
  return s.packages;
}

/** Journey posts (lazily seeded so an already-running dev store picks them up). */
function journey(s: Store): JourneyPost[] {
  if (!s.journey) s.journey = structuredClone(demoJourney);
  return s.journey;
}

const globalStore = globalThis as unknown as { __sskDemoStore?: Store };

function store(): Store {
  if (!globalStore.__sskDemoStore) {
    globalStore.__sskDemoStore = {
      settings: structuredClone(demoSettings),
      services: structuredClone(demoServices),
      locations: structuredClone(demoLocations),
      rules: structuredClone(demoRules),
      blocked: [],
      bookings: [],
      events: [],
      contact: [],
    };
    seedSampleBookings(globalStore.__sskDemoStore);
  }
  return globalStore.__sskDemoStore;
}

const uid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

function makeReference(existing: Booking[]) {
  let ref: string;
  do ref = generateReference();
  while (existing.some((b) => b.reference === ref));
  return ref;
}

function logEvent(s: Store, bookingId: string, from: Booking["status"] | null, to: Booking["status"]) {
  s.events.push({ id: uid(), bookingId, fromStatus: from, toStatus: to, createdAt: nowIso() });
}

function serviceAllowedAt(service: Service, locationId: string) {
  return service.locationIds.length === 0 || service.locationIds.includes(locationId);
}

function slotsFor(s: Store, serviceId: string, locationId: string, date: string) {
  const service = s.services.find((x) => x.id === serviceId && x.isActive && x.isBookable);
  const location = s.locations.find((x) => x.id === locationId && x.isActive);
  if (!service || !location || !serviceAllowedAt(service, locationId)) return [];
  return computeAvailableSlots({
    date,
    locationId,
    durationMin: service.durationMin,
    rules: s.rules,
    blocked: s.blocked,
    busy: s.bookings
      .filter((b) => b.date === date && ACTIVE_STATUSES.includes(b.status))
      .map((b) => ({ start: b.startTime, end: b.endTime })),
    settings: s.settings,
    now: nowInTimeZone(s.settings.timezone),
  });
}

const overlaps = (a: Booking, date: string, start: string, end: string) =>
  a.date === date && ACTIVE_STATUSES.includes(a.status) && timeToMinutes(a.startTime) < timeToMinutes(end) && timeToMinutes(start) < timeToMinutes(a.endTime);

const sortBookings = (a: Booking, b: Booking) => (a.date + a.startTime).localeCompare(b.date + b.startTime);

export const demoRepository: Repository = {
  // ---- Public ---------------------------------------------------------------
  async getSettings() {
    return { ...store().settings };
  },

  async listServices(opts) {
    return store()
      .services.filter((s) => opts?.includeInactive || s.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async listLocations(opts) {
    return store()
      .locations.filter((l) => opts?.includeInactive || l.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getAvailableDates(serviceId, locationId, from, to) {
    const s = store();
    const days = Math.min(diffDays(to, from), 62);
    const out: string[] = [];
    for (let i = 0; i <= days; i++) {
      const date = addDays(from, i);
      if (slotsFor(s, serviceId, locationId, date).length > 0) out.push(date);
    }
    return out;
  },

  async getAvailableSlots(serviceId, locationId, date) {
    return slotsFor(store(), serviceId, locationId, date);
  },

  async createBooking(input) {
    const s = store();
    const service = s.services.find((x) => x.id === input.serviceId && x.isActive && x.isBookable);
    if (!service) return { ok: false, error: "service_unavailable" };
    if (input.playersCount < service.minPlayers || input.playersCount > service.maxPlayers) {
      return { ok: false, error: "invalid_players" };
    }
    const pkg = input.packageId ? packages(s).find((p) => p.id === input.packageId) : null;
    if (input.packageId && (!pkg || !packageAppliesTo(pkg, service.id))) return { ok: false, error: "package_unavailable" };
    const email = input.email.trim().toLowerCase();
    const dayAgo = Date.now() - 86_400_000;
    const recentPending = s.bookings.filter((b) => b.email === email && b.status === "pending" && Date.parse(b.createdAt) > dayAgo).length;
    if (recentPending >= s.settings.maxPendingPerEmail) return { ok: false, error: "rate_limited" };

    const available = slotsFor(s, input.serviceId, input.locationId, input.date);
    if (!available.some((slot) => slot.start === input.startTime)) return { ok: false, error: "slot_unavailable" };

    const endTime = minutesToTime(timeToMinutes(input.startTime) + service.durationMin);
    // Mirrors the exclusion constraint
    if (s.bookings.some((b) => overlaps(b, input.date, input.startTime, endTime))) return { ok: false, error: "slot_unavailable" };

    const location = s.locations.find((l) => l.id === input.locationId)!;
    const baseCents = computePrice(service.priceCents, service.pricingUnit, input.playersCount);
    const pricing = pkg ? packPricing(baseCents, pkg) : null;
    const booking: Booking = {
      id: uid(),
      reference: makeReference(s.bookings),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      phone: input.phone.trim(),
      playerLevel: input.playerLevel,
      playersCount: input.playersCount,
      notes: input.notes?.trim() || null,
      source: "web",
      locale: input.locale,
      seriesId: null,
      package: pkg && pricing ? { id: pkg.id, name: pkg.name, lessons: pkg.lessonsCount, discountPercent: pkg.discountPercent, totalCents: pricing.totalCents } : null,
      serviceId: service.id,
      locationId: location.id,
      serviceName: service.name,
      locationName: location.name,
      date: input.date,
      startTime: input.startTime,
      endTime,
      durationMin: service.durationMin,
      priceCents: pricing?.perLessonCents ?? baseCents,
      currency: service.currency,
      status: "pending",
      paymentStatus: "unpaid",
      adminNotes: null,
      cancellationReason: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    s.bookings.push(booking);
    logEvent(s, booking.id, null, "pending");
    return { ok: true, id: booking.id, reference: booking.reference };
  },

  async getBookingSummary(reference) {
    const b = store().bookings.find((x) => x.reference === reference.toUpperCase());
    if (!b) return null;
    const { serviceName, locationName, date, startTime, endTime, durationMin, priceCents, currency, status, playersCount } = b;
    return { reference: b.reference, serviceName, locationName, date, startTime, endTime, durationMin, priceCents, currency, status, playersCount, package: b.package ?? null };
  },

  async createContactMessage(input) {
    store().contact.unshift({ id: uid(), ...input, status: "new", createdAt: nowIso() });
    return { ok: true };
  },

  // ---- Admin ----------------------------------------------------------------
  async listBookings(filter) {
    const q = filter.search?.trim().toLowerCase();
    let rows = store().bookings.filter((b) => {
      if (filter.status && filter.status !== "all" && b.status !== filter.status) return false;
      if (filter.scope === "upcoming" && b.date < filter.today) return false;
      if (filter.scope === "past" && b.date >= filter.today) return false;
      if (filter.from && b.date < filter.from) return false;
      if (filter.to && b.date > filter.to) return false;
      if (filter.seriesId && b.seriesId !== filter.seriesId) return false;
      if (q && ![b.firstName, b.lastName, b.email, b.phone, b.reference].some((v) => v?.toLowerCase().includes(q))) return false;
      return true;
    });
    rows = rows.sort(sortBookings);
    if (filter.scope === "past") rows.reverse();
    return filter.limit ? rows.slice(0, filter.limit) : rows;
  },

  async getBooking(id) {
    return store().bookings.find((b) => b.id === id) ?? null;
  },

  async getBookingEvents(bookingId) {
    return store().events.filter((e) => e.bookingId === bookingId);
  },

  async updateBookingStatus(id, status, reason) {
    const s = store();
    const b = s.bookings.find((x) => x.id === id);
    if (!b) return { ok: false, error: "Booking not found." };
    if (b.status === status) return { ok: true };
    if (ACTIVE_STATUSES.includes(status) && !ACTIVE_STATUSES.includes(b.status)) {
      if (s.bookings.some((o) => o.id !== id && overlaps(o, b.date, b.startTime, b.endTime))) {
        return { ok: false, error: "This time now overlaps another active booking." };
      }
    }
    logEvent(s, b.id, b.status, status);
    b.status = status;
    if (status === "cancelled") b.cancellationReason = reason ?? null;
    b.updatedAt = nowIso();
    return { ok: true };
  },

  async updateBookingNotes(id, adminNotes) {
    const b = store().bookings.find((x) => x.id === id);
    if (!b) return { ok: false, error: "Booking not found." };
    b.adminNotes = adminNotes;
    b.updatedAt = nowIso();
    return { ok: true };
  },

  async createAdminLessons(input, dates) {
    const s = store();
    const service = s.services.find((x) => x.id === input.serviceId);
    const location = s.locations.find((x) => x.id === input.locationId);
    if (!service || !location) return { created: [], skipped: dates.map((date) => ({ date, reason: "Service or location not found" })) };

    const seriesId = input.series ? uid() : null;
    const endTime = minutesToTime(timeToMinutes(input.startTime) + service.durationMin);
    const result: Awaited<ReturnType<Repository["createAdminLessons"]>> = { created: [], skipped: [] };

    for (const date of dates) {
      // Mirrors the exclusion constraint: never double-book.
      if (s.bookings.some((b) => overlaps(b, date, input.startTime, endTime))) {
        result.skipped.push({ date, reason: "Overlaps another lesson" });
        continue;
      }
      const booking: Booking = {
        id: uid(),
        reference: makeReference(s.bookings),
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        playerLevel: input.playerLevel,
        playersCount: input.playersCount,
        notes: null,
        source: "admin",
        locale: input.locale,
        seriesId,
        package: input.package,
        serviceId: service.id,
        locationId: location.id,
        serviceName: service.name,
        locationName: location.name,
        date,
        startTime: input.startTime,
        endTime,
        durationMin: service.durationMin,
        priceCents: input.priceCents,
        currency: service.currency,
        status: "confirmed",
        paymentStatus: "unpaid",
        adminNotes: input.adminNotes,
        cancellationReason: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      s.bookings.push(booking);
      logEvent(s, booking.id, null, "confirmed");
      result.created.push({ date, id: booking.id });
    }
    return result;
  },

  async cancelSeries(seriesId, fromDate, reason) {
    const s = store();
    let count = 0;
    for (const b of s.bookings) {
      if (b.seriesId === seriesId && b.date >= fromDate && ACTIVE_STATUSES.includes(b.status)) {
        logEvent(s, b.id, b.status, "cancelled");
        b.status = "cancelled";
        b.cancellationReason = reason;
        b.updatedAt = nowIso();
        count++;
      }
    }
    return { ok: true, count };
  },

  async getDashboardStats(today) {
    const all = store().bookings;
    return {
      today: all.filter((b) => b.date === today && ACTIVE_STATUSES.includes(b.status)).length,
      upcoming: all.filter((b) => b.date >= today && ACTIVE_STATUSES.includes(b.status)).length,
      pending: all.filter((b) => b.status === "pending").length,
      completed: all.filter((b) => b.status === "completed").length,
    };
  },

  async saveService(input) {
    const s = store();
    if (s.services.some((x) => x.slug === input.slug && x.id !== input.id)) return { ok: false, error: "Another service already uses this slug." };
    if (input.id) {
      const i = s.services.findIndex((x) => x.id === input.id);
      if (i < 0) return { ok: false, error: "Service not found." };
      s.services[i] = { ...s.services[i], ...input, id: input.id };
      return { ok: true, id: input.id };
    }
    const id = uid();
    s.services.push({ ...input, id });
    return { ok: true, id };
  },

  async deleteService(id) {
    const s = store();
    if (s.bookings.some((b) => b.serviceId === id)) return { ok: false, error: "This service has bookings. Deactivate it instead." };
    s.services = s.services.filter((x) => x.id !== id);
    return { ok: true };
  },

  async saveLocation(input) {
    const s = store();
    if (s.locations.some((x) => x.slug === input.slug && x.id !== input.id)) return { ok: false, error: "Another location already uses this slug." };
    if (input.id) {
      const i = s.locations.findIndex((x) => x.id === input.id);
      if (i < 0) return { ok: false, error: "Location not found." };
      s.locations[i] = { ...s.locations[i], ...input, id: input.id };
      return { ok: true, id: input.id };
    }
    const id = uid();
    s.locations.push({ ...input, id });
    return { ok: true, id };
  },

  async deleteLocation(id) {
    const s = store();
    if (s.bookings.some((b) => b.locationId === id)) return { ok: false, error: "This location has bookings. Deactivate it instead." };
    s.locations = s.locations.filter((x) => x.id !== id);
    s.rules = s.rules.filter((r) => r.locationId !== id);
    s.services.forEach((svc) => (svc.locationIds = svc.locationIds.filter((l) => l !== id)));
    return { ok: true };
  },

  async listAvailabilityRules() {
    return [...store().rules].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
  },

  async createAvailabilityRule(input) {
    const id = uid();
    store().rules.push({ ...input, id });
    return { ok: true, id };
  },

  async setAvailabilityRuleActive(id, isActive) {
    const r = store().rules.find((x) => x.id === id);
    if (!r) return { ok: false, error: "Rule not found." };
    r.isActive = isActive;
    return { ok: true };
  },

  async deleteAvailabilityRule(id) {
    const s = store();
    s.rules = s.rules.filter((r) => r.id !== id);
    return { ok: true };
  },

  async listBlockedDates(fromDate) {
    return store()
      .blocked.filter((b) => !fromDate || b.dateTo >= fromDate)
      .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom));
  },

  async createBlockedDate(input) {
    const id = uid();
    store().blocked.push({ ...input, id });
    return { ok: true, id };
  },

  async deleteBlockedDate(id) {
    const s = store();
    s.blocked = s.blocked.filter((b) => b.id !== id);
    return { ok: true };
  },

  async updateSettings(input) {
    store().settings = { ...input };
    return { ok: true };
  },

  async listPackages(opts) {
    return packages(store())
      .filter((p) => opts?.includeInactive || p.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.lessonsCount - b.lessonsCount);
  },

  async savePackage(input) {
    const list = packages(store());
    if (input.id) {
      const i = list.findIndex((p) => p.id === input.id);
      if (i < 0) return { ok: false, error: "Pack not found." };
      list[i] = { ...list[i], ...input, id: input.id };
      return { ok: true, id: input.id };
    }
    const id = uid();
    list.push({ ...input, id });
    return { ok: true, id };
  },

  async deletePackage(id) {
    const s = store();
    s.packages = packages(s).filter((p) => p.id !== id);
    return { ok: true };
  },

  async listJourneyPosts(opts) {
    const posts = journey(store()).filter((p) => opts?.includeUnpublished || p.isPublished);
    const sorted = posts.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.happenedOn.localeCompare(a.happenedOn));
    return opts?.limit ? sorted.slice(0, opts.limit) : sorted;
  },

  async saveJourneyPost(input) {
    const posts = journey(store());
    if (input.id) {
      const i = posts.findIndex((p) => p.id === input.id);
      if (i < 0) return { ok: false, error: "Post not found." };
      posts[i] = { ...posts[i], ...input, id: input.id };
      return { ok: true, id: input.id };
    }
    const id = uid();
    posts.push({ ...input, id, createdAt: nowIso() });
    return { ok: true, id };
  },

  async deleteJourneyPost(id) {
    const s = store();
    s.journey = journey(s).filter((p) => p.id !== id);
    return { ok: true };
  },

  async uploadJourneyImage(file) {
    // Demo mode only (local dev): save into /public/uploads so next/image can serve it.
    const { mkdir, writeFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const ext = JOURNEY_IMAGE_TYPES[file.type];
    const name = `${uid()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "journey");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    return { ok: true, url: `/uploads/journey/${name}` };
  },

  async listContactMessages() {
    return [...store().contact];
  },

  async setContactMessageStatus(id, status) {
    const m = store().contact.find((x) => x.id === id);
    if (!m) return { ok: false, error: "Message not found." };
    m.status = status;
    return { ok: true };
  },
};

/** A few realistic bookings so the admin dashboard isn't empty in demo mode. */
function seedSampleBookings(s: Store) {
  const now = nowInTimeZone(s.settings.timezone);
  const samples: Array<{ offset: number; start: string; service: string; location: string; status: Booking["status"]; first: string; last: string; level: Booking["playerLevel"]; players?: number }> = [
    { offset: -3, start: "09:00", service: "svc-private", location: "loc-hammam-sousse", status: "completed", first: "Lina", last: "Haddad", level: "intermediate" },
    { offset: -1, start: "17:00", service: "svc-competition", location: "loc-hammam-sousse", status: "completed", first: "Omar", last: "Benali", level: "competitive" },
    { offset: 0, start: "18:00", service: "svc-private", location: "loc-hammam-sousse", status: "confirmed", first: "Sofia", last: "Martin", level: "beginner" },
    { offset: 1, start: "08:00", service: "svc-semi", location: "loc-hammam-sousse", status: "confirmed", first: "Karim", last: "Nassar", level: "advanced", players: 2 },
    { offset: 2, start: "16:30", service: "svc-private", location: "loc-hammam-sousse", status: "pending", first: "Emma", last: "Dubois", level: "intermediate" },
    { offset: 3, start: "10:00", service: "svc-group", location: "loc-hammam-sousse", status: "pending", first: "Yousef", last: "Khalil", level: "beginner", players: 4 },
    { offset: 5, start: "17:00", service: "svc-junior", location: "loc-hammam-sousse", status: "confirmed", first: "Adam", last: "Laurent", level: "beginner" },
    { offset: 6, start: "09:30", service: "svc-private", location: "loc-hammam-sousse", status: "cancelled", first: "Nora", last: "Salem", level: "advanced" },
  ];

  for (const x of samples) {
    const date = addDays(now.date, x.offset);
    const service = s.services.find((v) => v.id === x.service)!;
    const location = s.locations.find((l) => l.id === x.location)!;
    const players = x.players ?? 1;
    const booking: Booking = {
      id: uid(),
      reference: makeReference(s.bookings),
      firstName: x.first,
      lastName: x.last,
      email: `${x.first}.${x.last}@example.com`.toLowerCase(),
      phone: "+216 20 000 000",
      playerLevel: x.level,
      playersCount: players,
      notes: x.offset === 2 ? "Would like to work on my backhand and serve consistency." : null,
      source: "web",
      locale: "en",
      seriesId: null,
      package: null,
      serviceId: service.id,
      locationId: location.id,
      serviceName: service.name,
      locationName: location.name,
      date,
      startTime: x.start,
      endTime: minutesToTime(timeToMinutes(x.start) + service.durationMin),
      durationMin: service.durationMin,
      priceCents: computePrice(service.priceCents, service.pricingUnit, players),
      currency: service.currency,
      status: x.status,
      paymentStatus: "unpaid",
      adminNotes: null,
      cancellationReason: x.status === "cancelled" ? "Player unavailable" : null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    s.bookings.push(booking);
    logEvent(s, booking.id, null, x.status);
  }
}
