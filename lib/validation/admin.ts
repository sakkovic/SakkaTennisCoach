import { z } from "zod";
import { isValidISODate } from "@/lib/booking/time";
import { FREQUENCIES, MAX_OCCURRENCES } from "@/lib/booking/recurrence";
import { BOOKING_STATUSES, JOURNEY_KINDS, PLAYER_LEVELS, PRICING_UNITS } from "@/lib/booking/types";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h).");
const isoDate = z.string().refine(isValidISODate, "Invalid date.");
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only (e.g. private-lesson).");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable();

export const bookingStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(BOOKING_STATUSES),
  reason: z.string().trim().max(500).optional(),
});

export const bookingNotesSchema = z.object({
  id: z.string().min(1),
  adminNotes: z.string().trim().max(2000),
});

export const serviceSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(2, "Name is required.").max(120),
    slug,
    shortDescription: z.string().trim().max(200),
    description: optionalText(2000),
    bestFor: optionalText(200),
    includes: z.array(z.string().trim().min(1).max(120)).max(12),
    durationMin: z.number().int().min(15, "Minimum 15 minutes.").max(480),
    priceCents: z.number().int().min(0, "Price cannot be negative."),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "3-letter currency code, e.g. USD."),
    pricingUnit: z.enum(PRICING_UNITS),
    minPlayers: z.number().int().min(1).max(12),
    maxPlayers: z.number().int().min(1).max(12),
    isBookable: z.boolean(),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(999),
    imagePath: z.string().nullable(),
    locationIds: z.array(z.string()),
    nameFr: optionalText(120),
    shortDescriptionFr: optionalText(200),
    descriptionFr: optionalText(2000),
    bestForFr: optionalText(200),
    includesFr: z.array(z.string().trim().min(1).max(120)).max(12),
  })
  .refine((s) => s.maxPlayers >= s.minPlayers, { message: "Max players must be ≥ min players.", path: ["maxPlayers"] });

export const locationSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name is required.").max(120),
  slug,
  address: z.string().trim().max(300),
  city: optionalText(120),
  mapsUrl: optionalText(500).refine((v) => v === null || /^https?:\/\//.test(v), "Must be a full URL (https://…)."),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

export const availabilityRuleSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: time,
    endTime: time,
    locationId: z.string().nullable(),
    validFrom: isoDate.nullable(),
    validUntil: isoDate.nullable(),
    isActive: z.boolean(),
  })
  .refine((r) => r.endTime > r.startTime, { message: "End time must be after start time.", path: ["endTime"] })
  .refine((r) => !r.validFrom || !r.validUntil || r.validUntil >= r.validFrom, { message: "End date must be after start date.", path: ["validUntil"] });

export const blockedDateSchema = z
  .object({
    dateFrom: isoDate,
    dateTo: isoDate,
    startTime: time.nullable(),
    endTime: time.nullable(),
    reason: optionalText(200),
  })
  .refine((b) => b.dateTo >= b.dateFrom, { message: "End date must be on or after start date.", path: ["dateTo"] })
  .refine((b) => (b.startTime === null) === (b.endTime === null), { message: "Set both times or none (whole day).", path: ["endTime"] })
  .refine((b) => !b.startTime || !b.endTime || b.endTime > b.startTime, { message: "End time must be after start time.", path: ["endTime"] });

/** Lesson created by the coach (one-off or recurring). Email/phone are optional here. */
export const adminLessonSchema = z
  .object({
    serviceId: z.string().min(1, "Choose a lesson type."),
    locationId: z.string().min(1, "Choose a location."),
    date: isoDate,
    startTime: time,
    firstName: z.string().trim().min(1, "First name is required.").max(80),
    lastName: z.string().trim().min(1, "Last name is required.").max(80),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email or leave it empty.")
      .transform((v) => v || null),
    phone: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\+?[\d\s().-]{6,24}$/.test(v), "Enter a valid phone number or leave it empty.")
      .transform((v) => v || null),
    playerLevel: z.enum(PLAYER_LEVELS),
    playersCount: z.number().int().min(1).max(12),
    customPrice: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d+([.,]\d{1,2})?$/.test(v), "Enter a price like 60 or 62.50.")
      .transform((v) => (v === "" ? null : Math.round(Number(v.replace(",", ".")) * 100))),
    adminNotes: optionalText(2000),
    /** Lesson pack: its discount is applied to each lesson ("" = none) */
    packageId: z
      .string()
      .max(64)
      .transform((v) => v || null),
    frequency: z.enum(FREQUENCIES),
    interval: z.number().int().min(1, "At least 1.").max(12, "At most 12."),
    endType: z.enum(["count", "until"]),
    count: z.number().int().min(1, "At least 1 lesson.").max(MAX_OCCURRENCES, `At most ${MAX_OCCURRENCES} lessons.`),
    until: isoDate.nullable(),
    notify: z.boolean(),
    /** Language of the schedule email sent to the player */
    locale: z.enum(["en", "fr"]),
  })
  .refine((l) => l.frequency === "once" || l.endType === "count" || (l.until !== null && l.until >= l.date), {
    message: "End date must be on or after the first lesson.",
    path: ["until"],
  });

export type AdminLessonForm = z.input<typeof adminLessonSchema>;
export type AdminLessonValues = z.output<typeof adminLessonSchema>;

export const journeyPostSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(JOURNEY_KINDS),
  title: z.string().trim().min(2, "Add a title.").max(140),
  body: optionalText(1500),
  imageUrl: z
    .string()
    .trim()
    .min(1, "Upload a photo.")
    .refine((v) => v.startsWith("/") || v.startsWith("https://"), "Upload a photo."),
  imageAlt: z.string().trim().max(300),
  playerName: optionalText(120),
  eventName: optionalText(160),
  result: optionalText(120),
  happenedOn: isoDate,
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  titleFr: optionalText(140),
  bodyFr: optionalText(1500),
  resultFr: optionalText(120),
});

export type JourneyPostForm = z.input<typeof journeyPostSchema>;

export const packageSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name is required.").max(80),
  description: optionalText(300),
  lessonsCount: z.number().int().min(2, "At least 2 lessons.").max(50, "At most 50 lessons."),
  discountPercent: z.number().int("Use a whole number.").min(0).max(90, "At most 90%."),
  validityDays: z.number().int().min(1).max(365),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
  serviceIds: z.array(z.string()),
  nameFr: optionalText(80),
  descriptionFr: optionalText(300),
});

export const settingsSchema = z.object({
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown timezone (use an IANA name such as Europe/Paris)."),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "3-letter currency code."),
  slotIntervalMin: z.number().int().min(5).max(240),
  minNoticeHours: z.number().int().min(0).max(336),
  maxAdvanceDays: z.number().int().min(1).max(365),
  bufferMin: z.number().int().min(0).max(120),
  maxPendingPerEmail: z.number().int().min(1).max(50),
});
