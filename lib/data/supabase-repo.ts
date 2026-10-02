import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateReference } from "@/lib/booking/reference";
import { minutesToTime, timeToMinutes, toHM } from "@/lib/booking/time";
import type {
  AdminLessonsResult,
  AvailabilityRule,
  BlockedDate,
  Booking,
  BookingEvent,
  BookingPackage,
  BookingSummary,
  CoachSettings,
  ContactMessage,
  CreateBookingError,
  JourneyPost,
  Location,
  Package,
  Service,
} from "@/lib/booking/types";
import { JOURNEY_IMAGE_TYPES } from "./journey-images";
import type { AdminResult, Repository } from "./repository";

// ---------------------------------------------------------------------------
// Row types (snake_case, as stored in Postgres) and mappers
// ---------------------------------------------------------------------------
type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? null : String(v));

const mapSettings = (r: Row): CoachSettings => ({
  timezone: String(r.timezone),
  currency: String(r.currency).trim(),
  slotIntervalMin: Number(r.slot_interval_min),
  minNoticeHours: Number(r.min_notice_hours),
  maxAdvanceDays: Number(r.max_advance_days),
  bufferMin: Number(r.buffer_min),
  maxPendingPerEmail: Number(r.max_pending_per_email),
});

const mapService = (r: Row): Service => ({
  id: String(r.id),
  slug: String(r.slug),
  name: String(r.name),
  shortDescription: String(r.short_description ?? ""),
  description: str(r.description),
  bestFor: str(r.best_for),
  includes: (r.includes as string[] | null) ?? [],
  durationMin: Number(r.duration_min),
  priceCents: Number(r.price_cents),
  currency: String(r.currency).trim(),
  pricingUnit: r.pricing_unit as Service["pricingUnit"],
  minPlayers: Number(r.min_players),
  maxPlayers: Number(r.max_players),
  isBookable: Boolean(r.is_bookable),
  isActive: Boolean(r.is_active),
  sortOrder: Number(r.sort_order),
  imagePath: str(r.image_path),
  locationIds: ((r.service_locations as Row[] | null) ?? []).map((x) => String(x.location_id)),
  nameFr: str(r.name_fr),
  shortDescriptionFr: str(r.short_description_fr),
  descriptionFr: str(r.description_fr),
  bestForFr: str(r.best_for_fr),
  includesFr: (r.includes_fr as string[] | null) ?? [],
});

const mapLocation = (r: Row): Location => ({
  id: String(r.id),
  slug: String(r.slug),
  name: String(r.name),
  address: String(r.address ?? ""),
  city: str(r.city),
  mapsUrl: str(r.maps_url),
  isActive: Boolean(r.is_active),
  sortOrder: Number(r.sort_order),
});

const mapRule = (r: Row): AvailabilityRule => ({
  id: String(r.id),
  weekday: Number(r.weekday),
  startTime: toHM(String(r.start_time)),
  endTime: toHM(String(r.end_time)),
  locationId: str(r.location_id),
  validFrom: str(r.valid_from),
  validUntil: str(r.valid_until),
  isActive: Boolean(r.is_active),
});

const mapBlocked = (r: Row): BlockedDate => ({
  id: String(r.id),
  dateFrom: String(r.date_from),
  dateTo: String(r.date_to),
  startTime: r.start_time ? toHM(String(r.start_time)) : null,
  endTime: r.end_time ? toHM(String(r.end_time)) : null,
  reason: str(r.reason),
});

const mapBooking = (r: Row): Booking => ({
  id: String(r.id),
  reference: String(r.reference),
  firstName: String(r.first_name),
  lastName: String(r.last_name),
  email: str(r.email),
  phone: str(r.phone),
  playerLevel: r.player_level as Booking["playerLevel"],
  playersCount: Number(r.players_count),
  notes: str(r.notes),
  source: r.source === "admin" ? "admin" : "web",
  locale: r.locale === "fr" ? "fr" : "en",
  seriesId: str(r.series_id),
  package: mapPackageSnapshot(r),
  serviceId: String(r.service_id),
  locationId: String(r.location_id),
  serviceName: String(r.service_name),
  locationName: String(r.location_name),
  date: String(r.booking_date),
  startTime: toHM(String(r.start_time)),
  endTime: toHM(String(r.end_time)),
  durationMin: Number(r.duration_min),
  priceCents: Number(r.price_cents),
  currency: String(r.currency).trim(),
  status: r.status as Booking["status"],
  paymentStatus: r.payment_status as Booking["paymentStatus"],
  adminNotes: str(r.admin_notes),
  cancellationReason: str(r.cancellation_reason),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

/** Pack snapshot columns on bookings / booking summaries. */
const mapPackageSnapshot = (r: Row): BookingPackage | null =>
  r.package_name
    ? {
        id: str(r.package_id),
        name: String(r.package_name),
        lessons: Number(r.package_lessons),
        discountPercent: Number(r.package_discount_percent),
        totalCents: r.package_total_cents == null ? null : Number(r.package_total_cents),
      }
    : null;

const mapPackage = (r: Row): Package => ({
  id: String(r.id),
  name: String(r.name),
  description: str(r.description),
  lessonsCount: Number(r.lessons_count),
  discountPercent: Number(r.discount_percent),
  validityDays: Number(r.validity_days),
  isActive: Boolean(r.is_active),
  sortOrder: Number(r.sort_order),
  serviceIds: ((r.package_services as Row[] | null) ?? []).map((x) => String(x.service_id)),
  nameFr: str(r.name_fr),
  descriptionFr: str(r.description_fr),
});

const mapJourney = (r: Row): JourneyPost => ({
  id: String(r.id),
  kind: r.kind as JourneyPost["kind"],
  title: String(r.title),
  body: str(r.body),
  imageUrl: String(r.image_url),
  imageAlt: String(r.image_alt ?? ""),
  playerName: str(r.player_name),
  eventName: str(r.event_name),
  result: str(r.result),
  happenedOn: String(r.happened_on),
  isPublished: Boolean(r.is_published),
  isFeatured: Boolean(r.is_featured),
  createdAt: String(r.created_at),
  titleFr: str(r.title_fr),
  bodyFr: str(r.body_fr),
  resultFr: str(r.result_fr),
});

const mapContact = (r: Row): ContactMessage => ({
  id: String(r.id),
  name: String(r.name),
  email: String(r.email),
  phone: str(r.phone),
  message: String(r.message),
  status: r.status as ContactMessage["status"],
  createdAt: String(r.created_at),
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
function adminError(error: PostgrestError | null, fallback = "Something went wrong. Please try again."): AdminResult {
  if (!error) return { ok: true };
  console.error("[supabase]", error.code, error.message);
  if (error.code === "23505") return { ok: false, error: "That value is already in use (slug must be unique)." };
  if (error.code === "23503") return { ok: false, error: "This item is referenced by bookings. Deactivate it instead." };
  if (error.code === "23P01") return { ok: false, error: "This time now overlaps another active booking." };
  if (error.code === "23514") return { ok: false, error: "Some values are invalid. Please check the form." };
  if (error.code === "42501") return { ok: false, error: "You are not allowed to do this." };
  return { ok: false, error: fallback };
}

function bookingError(error: PostgrestError): CreateBookingError {
  const known: CreateBookingError[] = ["slot_unavailable", "service_unavailable", "invalid_players", "package_unavailable", "rate_limited"];
  const match = known.find((k) => error.message?.includes(k));
  if (match) return match;
  if (error.code === "23P01") return "slot_unavailable";
  if (error.code === "23514" || error.code === "22P02") return "invalid_input";
  console.error("[create_booking]", error.code, error.message);
  return "unknown";
}

const db = createSupabaseServerClient;

/** Strip characters that have meaning in PostgREST filter syntax. */
const sanitizeSearch = (q: string) => q.replace(/[,()*%\\]/g, " ").trim();

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------
export const supabaseRepository: Repository = {
  async getSettings() {
    const supabase = await db();
    const { data, error } = await supabase.from("coach_settings").select("*").eq("id", 1).single();
    if (error || !data) throw new Error(`Could not load coach settings: ${error?.message}`);
    return mapSettings(data);
  },

  async listServices(opts) {
    const supabase = await db();
    let query = supabase.from("services").select("*, service_locations(location_id)").order("sort_order");
    if (!opts?.includeInactive) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapService);
  },

  async listLocations(opts) {
    const supabase = await db();
    let query = supabase.from("locations").select("*").order("sort_order");
    if (!opts?.includeInactive) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapLocation);
  },

  async getAvailableDates(serviceId, locationId, from, to) {
    const supabase = await db();
    const { data, error } = await supabase.rpc("get_available_dates", {
      p_service_id: serviceId,
      p_location_id: locationId,
      p_from: from,
      p_to: to,
    });
    if (error) throw new Error(error.message);
    return ((data as string[] | null) ?? []).map(String);
  },

  async getAvailableSlots(serviceId, locationId, date) {
    const supabase = await db();
    const { data, error } = await supabase.rpc("get_available_slots", {
      p_service_id: serviceId,
      p_location_id: locationId,
      p_date: date,
    });
    if (error) throw new Error(error.message);
    return ((data as Row[] | null) ?? []).map((r) => ({ start: toHM(String(r.slot_start)), end: toHM(String(r.slot_end)) }));
  },

  async createBooking(input) {
    const supabase = await db();
    const { data, error } = await supabase.rpc("create_booking", {
      p_service_id: input.serviceId,
      p_location_id: input.locationId,
      p_date: input.date,
      p_start_time: input.startTime,
      p_first_name: input.firstName,
      p_last_name: input.lastName,
      p_email: input.email,
      p_phone: input.phone,
      p_player_level: input.playerLevel,
      p_players_count: input.playersCount,
      p_notes: input.notes,
      p_package_id: input.packageId,
      p_locale: input.locale,
    });
    if (error) return { ok: false, error: bookingError(error) };
    const row = (data as Row[] | null)?.[0];
    if (!row) return { ok: false, error: "unknown" };
    return { ok: true, id: String(row.booking_id), reference: String(row.booking_reference) };
  },

  async getBookingSummary(reference) {
    const supabase = await db();
    const { data, error } = await supabase.rpc("get_booking_summary", { p_reference: reference });
    const r = (data as Row[] | null)?.[0];
    if (error || !r) return null;
    const summary: BookingSummary = {
      reference: String(r.reference),
      serviceName: String(r.service_name),
      locationName: String(r.location_name),
      date: String(r.booking_date),
      startTime: toHM(String(r.start_time)),
      endTime: toHM(String(r.end_time)),
      durationMin: Number(r.duration_min),
      priceCents: Number(r.price_cents),
      currency: String(r.currency).trim(),
      status: r.status as BookingSummary["status"],
      playersCount: Number(r.players_count),
      package: mapPackageSnapshot(r),
    };
    return summary;
  },

  async createContactMessage(input) {
    const supabase = await db();
    const { error } = await supabase.from("contact_messages").insert({
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
    });
    return adminError(error);
  },

  // ---- Admin ----------------------------------------------------------------
  async listBookings(filter) {
    const supabase = await db();
    const past = filter.scope === "past";
    let query = supabase
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: !past })
      .order("start_time", { ascending: !past });
    if (filter.status && filter.status !== "all") query = query.eq("status", filter.status);
    if (filter.scope === "upcoming") query = query.gte("booking_date", filter.today);
    if (past) query = query.lt("booking_date", filter.today);
    if (filter.from) query = query.gte("booking_date", filter.from);
    if (filter.to) query = query.lte("booking_date", filter.to);
    if (filter.seriesId) query = query.eq("series_id", filter.seriesId);
    const q = filter.search ? sanitizeSearch(filter.search) : "";
    if (q) {
      query = query.or(
        ["first_name", "last_name", "email", "phone", "reference"].map((c) => `${c}.ilike.*${q}*`).join(","),
      );
    }
    if (filter.limit) query = query.limit(filter.limit);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapBooking);
  },

  async getBooking(id) {
    const supabase = await db();
    const { data } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
    return data ? mapBooking(data) : null;
  },

  async getBookingEvents(bookingId) {
    const supabase = await db();
    const { data } = await supabase.from("booking_events").select("*").eq("booking_id", bookingId).order("created_at");
    return (data ?? []).map(
      (r): BookingEvent => ({
        id: String(r.id),
        bookingId: String(r.booking_id),
        fromStatus: r.from_status ?? null,
        toStatus: r.to_status,
        createdAt: String(r.created_at),
      }),
    );
  },

  async updateBookingStatus(id, status, reason) {
    const supabase = await db();
    const patch: Row = { status };
    if (status === "cancelled") patch.cancellation_reason = reason ?? null;
    const { error } = await supabase.from("bookings").update(patch).eq("id", id);
    return adminError(error);
  },

  async updateBookingNotes(id, adminNotes) {
    const supabase = await db();
    const { error } = await supabase.from("bookings").update({ admin_notes: adminNotes }).eq("id", id);
    return adminError(error);
  },

  async createAdminLessons(input, dates) {
    const supabase = await db();
    const result: AdminLessonsResult = { created: [], skipped: [] };

    const [{ data: service }, { data: location }] = await Promise.all([
      supabase.from("services").select("id, name, duration_min, currency").eq("id", input.serviceId).single(),
      supabase.from("locations").select("id, name").eq("id", input.locationId).single(),
    ]);
    if (!service || !location) return { created: [], skipped: dates.map((date) => ({ date, reason: "Service or location not found" })) };

    let seriesId: string | null = null;
    if (input.series) {
      const { data: series, error } = await supabase
        .from("booking_series")
        .insert({
          frequency: input.series.frequency,
          interval_count: input.series.interval,
          starts_on: input.series.startsOn,
          ends_on: input.series.endsOn,
          occurrences: input.series.occurrences,
        })
        .select("id")
        .single();
      if (error || !series) {
        console.error("[supabase] series", error);
        return { created: [], skipped: dates.map((date) => ({ date, reason: "Could not create the series" })) };
      }
      seriesId = String(series.id);
    }

    const endTime = minutesToTime(timeToMinutes(input.startTime) + Number(service.duration_min));
    for (const date of dates) {
      let attempt = 0;
      while (attempt < 3) {
        attempt++;
        const { data, error } = await supabase
          .from("bookings")
          .insert({
            reference: generateReference(),
            first_name: input.firstName,
            last_name: input.lastName,
            email: input.email,
            phone: input.phone,
            player_level: input.playerLevel,
            players_count: input.playersCount,
            service_id: input.serviceId,
            location_id: input.locationId,
            booking_date: date,
            start_time: input.startTime,
            end_time: endTime,
            service_name: service.name,
            location_name: location.name,
            duration_min: service.duration_min,
            price_cents: input.priceCents,
            currency: service.currency,
            status: "confirmed",
            confirmed_at: new Date().toISOString(),
            source: "admin",
            locale: input.locale,
            series_id: seriesId,
            admin_notes: input.adminNotes,
            package_id: input.package?.id ?? null,
            package_name: input.package?.name ?? null,
            package_lessons: input.package?.lessons ?? null,
            package_discount_percent: input.package?.discountPercent ?? null,
            package_total_cents: input.package?.totalCents ?? null,
          })
          .select("id")
          .single();
        if (!error && data) {
          result.created.push({ date, id: String(data.id) });
          break;
        }
        if (error?.code === "23505" && attempt < 3) continue; // reference collision — retry
        result.skipped.push({ date, reason: error?.code === "23P01" ? "Overlaps another lesson" : "Could not be saved" });
        if (error?.code !== "23P01") console.error("[supabase] admin lesson", error);
        break;
      }
    }
    return result;
  },

  async cancelSeries(seriesId, fromDate, reason) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", cancellation_reason: reason })
      .eq("series_id", seriesId)
      .gte("booking_date", fromDate)
      .in("status", ["pending", "confirmed"])
      .select("id");
    if (error) return adminError(error);
    return { ok: true, count: data?.length ?? 0 };
  },

  async getDashboardStats(today) {
    const supabase = await db();
    const base = () => supabase.from("bookings").select("id", { count: "exact", head: true });
    const [todayRes, upcomingRes, pendingRes, completedRes] = await Promise.all([
      base().eq("booking_date", today).in("status", ["pending", "confirmed"]),
      base().gte("booking_date", today).in("status", ["pending", "confirmed"]),
      base().eq("status", "pending"),
      base().eq("status", "completed"),
    ]);
    return {
      today: todayRes.count ?? 0,
      upcoming: upcomingRes.count ?? 0,
      pending: pendingRes.count ?? 0,
      completed: completedRes.count ?? 0,
    };
  },

  async saveService(input) {
    const supabase = await db();
    const row = {
      slug: input.slug,
      name: input.name,
      short_description: input.shortDescription,
      description: input.description,
      best_for: input.bestFor,
      includes: input.includes,
      duration_min: input.durationMin,
      price_cents: input.priceCents,
      currency: input.currency,
      pricing_unit: input.pricingUnit,
      min_players: input.minPlayers,
      max_players: input.maxPlayers,
      is_bookable: input.isBookable,
      is_active: input.isActive,
      sort_order: input.sortOrder,
      image_path: input.imagePath,
      name_fr: input.nameFr,
      short_description_fr: input.shortDescriptionFr,
      description_fr: input.descriptionFr,
      best_for_fr: input.bestForFr,
      includes_fr: input.includesFr,
    };
    const { data, error } = input.id
      ? await supabase.from("services").update(row).eq("id", input.id).select("id").single()
      : await supabase.from("services").insert(row).select("id").single();
    if (error || !data) return adminError(error);

    const serviceId = String(data.id);
    const { error: delError } = await supabase.from("service_locations").delete().eq("service_id", serviceId);
    if (delError) return adminError(delError);
    if (input.locationIds.length > 0) {
      const { error: insError } = await supabase
        .from("service_locations")
        .insert(input.locationIds.map((location_id) => ({ service_id: serviceId, location_id })));
      if (insError) return adminError(insError);
    }
    return { ok: true, id: serviceId };
  },

  async deleteService(id) {
    const supabase = await db();
    const { error } = await supabase.from("services").delete().eq("id", id);
    return adminError(error);
  },

  async saveLocation(input) {
    const supabase = await db();
    const row = {
      slug: input.slug,
      name: input.name,
      address: input.address,
      city: input.city,
      maps_url: input.mapsUrl,
      is_active: input.isActive,
      sort_order: input.sortOrder,
    };
    const { data, error } = input.id
      ? await supabase.from("locations").update(row).eq("id", input.id).select("id").single()
      : await supabase.from("locations").insert(row).select("id").single();
    if (error || !data) return adminError(error);
    return { ok: true, id: String(data.id) };
  },

  async deleteLocation(id) {
    const supabase = await db();
    const { error } = await supabase.from("locations").delete().eq("id", id);
    return adminError(error);
  },

  async listAvailabilityRules() {
    const supabase = await db();
    const { data, error } = await supabase.from("availability_rules").select("*").order("weekday").order("start_time");
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRule);
  },

  async createAvailabilityRule(input) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("availability_rules")
      .insert({
        weekday: input.weekday,
        start_time: input.startTime,
        end_time: input.endTime,
        location_id: input.locationId,
        valid_from: input.validFrom,
        valid_until: input.validUntil,
        is_active: input.isActive,
      })
      .select("id")
      .single();
    if (error || !data) return adminError(error);
    return { ok: true, id: String(data.id) };
  },

  async setAvailabilityRuleActive(id, isActive) {
    const supabase = await db();
    const { error } = await supabase.from("availability_rules").update({ is_active: isActive }).eq("id", id);
    return adminError(error);
  },

  async deleteAvailabilityRule(id) {
    const supabase = await db();
    const { error } = await supabase.from("availability_rules").delete().eq("id", id);
    return adminError(error);
  },

  async listBlockedDates(fromDate) {
    const supabase = await db();
    let query = supabase.from("blocked_dates").select("*").order("date_from");
    if (fromDate) query = query.gte("date_to", fromDate);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapBlocked);
  },

  async createBlockedDate(input) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("blocked_dates")
      .insert({
        date_from: input.dateFrom,
        date_to: input.dateTo,
        start_time: input.startTime,
        end_time: input.endTime,
        reason: input.reason,
      })
      .select("id")
      .single();
    if (error || !data) return adminError(error);
    return { ok: true, id: String(data.id) };
  },

  async deleteBlockedDate(id) {
    const supabase = await db();
    const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
    return adminError(error);
  },

  async updateSettings(input) {
    const supabase = await db();
    const { error } = await supabase
      .from("coach_settings")
      .update({
        timezone: input.timezone,
        currency: input.currency,
        slot_interval_min: input.slotIntervalMin,
        min_notice_hours: input.minNoticeHours,
        max_advance_days: input.maxAdvanceDays,
        buffer_min: input.bufferMin,
        max_pending_per_email: input.maxPendingPerEmail,
      })
      .eq("id", 1);
    return adminError(error);
  },

  async listPackages(opts) {
    const supabase = await db();
    let query = supabase.from("packages").select("*, package_services(service_id)").order("sort_order").order("lessons_count");
    if (!opts?.includeInactive) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapPackage);
  },

  async savePackage(input) {
    const supabase = await db();
    const row = {
      name: input.name,
      description: input.description,
      lessons_count: input.lessonsCount,
      discount_percent: input.discountPercent,
      validity_days: input.validityDays,
      is_active: input.isActive,
      sort_order: input.sortOrder,
      name_fr: input.nameFr,
      description_fr: input.descriptionFr,
    };
    const { data, error } = input.id
      ? await supabase.from("packages").update(row).eq("id", input.id).select("id").single()
      : await supabase.from("packages").insert(row).select("id").single();
    if (error || !data) return adminError(error);
    const packageId = String(data.id);
    const { error: delError } = await supabase.from("package_services").delete().eq("package_id", packageId);
    if (delError) return adminError(delError);
    if (input.serviceIds.length > 0) {
      const { error: insError } = await supabase
        .from("package_services")
        .insert(input.serviceIds.map((service_id) => ({ package_id: packageId, service_id })));
      if (insError) return adminError(insError);
    }
    return { ok: true, id: packageId };
  },

  async deletePackage(id) {
    const supabase = await db();
    const { error } = await supabase.from("packages").delete().eq("id", id);
    return adminError(error);
  },

  async listJourneyPosts(opts) {
    const supabase = await db();
    let query = supabase
      .from("journey_posts")
      .select("*")
      .order("is_featured", { ascending: false })
      .order("happened_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (!opts?.includeUnpublished) query = query.eq("is_published", true);
    if (opts?.limit) query = query.limit(opts.limit);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapJourney);
  },

  async saveJourneyPost(input) {
    const supabase = await db();
    const row = {
      kind: input.kind,
      title: input.title,
      body: input.body,
      image_url: input.imageUrl,
      image_alt: input.imageAlt,
      player_name: input.playerName,
      event_name: input.eventName,
      result: input.result,
      happened_on: input.happenedOn,
      is_published: input.isPublished,
      is_featured: input.isFeatured,
      title_fr: input.titleFr,
      body_fr: input.bodyFr,
      result_fr: input.resultFr,
    };
    const { data, error } = input.id
      ? await supabase.from("journey_posts").update(row).eq("id", input.id).select("id").single()
      : await supabase.from("journey_posts").insert(row).select("id").single();
    if (error || !data) return adminError(error);
    return { ok: true, id: String(data.id) };
  },

  async deleteJourneyPost(id) {
    const supabase = await db();
    const { data, error } = await supabase.from("journey_posts").delete().eq("id", id).select("image_url").single();
    if (error) return adminError(error);
    // Best-effort cleanup of the uploaded image.
    const marker = "/storage/v1/object/public/journey/";
    const url = String(data?.image_url ?? "");
    if (url.includes(marker)) await supabase.storage.from("journey").remove([url.split(marker)[1]]);
    return { ok: true };
  },

  async uploadJourneyImage(file) {
    const supabase = await db();
    const ext = JOURNEY_IMAGE_TYPES[file.type];
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("journey").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (error) {
      console.error("[supabase] upload", error);
      return { ok: false, error: "Upload failed. Please try again." };
    }
    return { ok: true, url: supabase.storage.from("journey").getPublicUrl(path).data.publicUrl };
  },

  async listContactMessages() {
    const supabase = await db();
    const { data, error } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapContact);
  },

  async setContactMessageStatus(id, status) {
    const supabase = await db();
    const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
    return adminError(error);
  },
};
