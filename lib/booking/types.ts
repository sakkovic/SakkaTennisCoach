/** Domain types shared by the UI, the data layer and validation. */

export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "completed"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses that hold a slot on the calendar. */
export const ACTIVE_STATUSES: readonly BookingStatus[] = ["pending", "confirmed"];

export const PLAYER_LEVELS = ["beginner", "intermediate", "advanced", "competitive"] as const;
export type PlayerLevel = (typeof PLAYER_LEVELS)[number];

export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "not_required"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PRICING_UNITS = ["per_session", "per_player"] as const;
export type PricingUnit = (typeof PRICING_UNITS)[number];

/** "YYYY-MM-DD" in the coach's timezone */
export type ISODate = string;
/** "HH:mm" 24h, coach's local time */
export type TimeHM = string;

export type Service = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string | null;
  bestFor: string | null;
  includes: string[];
  durationMin: number;
  priceCents: number;
  currency: string;
  pricingUnit: PricingUnit;
  minPlayers: number;
  maxPlayers: number;
  isBookable: boolean;
  isActive: boolean;
  sortOrder: number;
  imagePath: string | null;
  /** Empty = available at every active location */
  locationIds: string[];
  /** Optional French version (falls back to English when empty) */
  nameFr: string | null;
  shortDescriptionFr: string | null;
  descriptionFr: string | null;
  bestForFr: string | null;
  includesFr: string[];
};

/** Lesson pack, e.g. 10 lessons −10% valid 30 days. */
export type Package = {
  id: string;
  name: string;
  description: string | null;
  lessonsCount: number;
  discountPercent: number;
  validityDays: number;
  isActive: boolean;
  sortOrder: number;
  /** Empty = applies to every service */
  serviceIds: string[];
  nameFr: string | null;
  descriptionFr: string | null;
};

/** Pack snapshot stored on a booking. */
export type BookingPackage = {
  id: string | null;
  name: string;
  lessons: number;
  discountPercent: number;
  totalCents: number | null;
};

export type Location = {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string | null;
  mapsUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type AvailabilityRule = {
  id: string;
  /** 0 = Sunday … 6 = Saturday (matches Postgres `extract(dow)`) */
  weekday: number;
  startTime: TimeHM;
  endTime: TimeHM;
  /** null = applies to every location */
  locationId: string | null;
  validFrom: ISODate | null;
  validUntil: ISODate | null;
  isActive: boolean;
};

export type BlockedDate = {
  id: string;
  dateFrom: ISODate;
  dateTo: ISODate;
  /** null start/end = the whole day is blocked */
  startTime: TimeHM | null;
  endTime: TimeHM | null;
  reason: string | null;
};

export type CoachSettings = {
  timezone: string;
  currency: string;
  slotIntervalMin: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  bufferMin: number;
  maxPendingPerEmail: number;
};

export type Booking = {
  id: string;
  reference: string;
  firstName: string;
  lastName: string;
  /** Always present for online bookings; optional for lessons created by the coach. */
  email: string | null;
  phone: string | null;
  playerLevel: PlayerLevel;
  playersCount: number;
  notes: string | null;
  /** "web" = booked online by the player, "admin" = created by the coach */
  source: "web" | "admin";
  /** Player's language — emails are sent in it */
  locale: "en" | "fr";
  /** Set when the lesson belongs to a recurring series */
  seriesId: string | null;
  /** Set when booked as part of a lesson pack (price_cents is then the discounted per-lesson price) */
  package: BookingPackage | null;
  serviceId: string;
  locationId: string;
  serviceName: string;
  locationName: string;
  date: ISODate;
  startTime: TimeHM;
  endTime: TimeHM;
  durationMin: number;
  priceCents: number;
  currency: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  adminNotes: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
};

/** What the public success page is allowed to see — no personal data. */
export type BookingSummary = Pick<
  Booking,
  | "reference"
  | "serviceName"
  | "locationName"
  | "date"
  | "startTime"
  | "endTime"
  | "durationMin"
  | "priceCents"
  | "currency"
  | "status"
  | "playersCount"
  | "package"
>;

export type BookingEvent = {
  id: string;
  bookingId: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  createdAt: string;
};

export type Slot = { start: TimeHM; end: TimeHM };

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: "new" | "read" | "archived";
  createdAt: string;
};

export type NewBookingInput = {
  serviceId: string;
  locationId: string;
  date: ISODate;
  startTime: TimeHM;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  playerLevel: PlayerLevel;
  playersCount: number;
  notes: string | null;
  /** Optional lesson pack requested with this first lesson */
  packageId: string | null;
  locale: "en" | "fr";
};

// ---------------------------------------------------------------------------
// Journey — achievements, photos and news posted by the coach
// ---------------------------------------------------------------------------
export const JOURNEY_KINDS = ["achievement", "photo", "news"] as const;
export type JourneyKind = (typeof JOURNEY_KINDS)[number];

export type JourneyPost = {
  id: string;
  kind: JourneyKind;
  title: string;
  body: string | null;
  /** Public image URL (Supabase Storage, /public, or remote) */
  imageUrl: string;
  imageAlt: string;
  /** Achievement details (optional) */
  playerName: string | null;
  eventName: string | null;
  result: string | null;
  happenedOn: ISODate;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: string;
  /** Optional French version */
  titleFr: string | null;
  bodyFr: string | null;
  resultFr: string | null;
};

/** A lesson the coach creates from the dashboard (possibly recurring). */
export type AdminLessonInput = {
  serviceId: string;
  locationId: string;
  startTime: TimeHM;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  playerLevel: PlayerLevel;
  playersCount: number;
  priceCents: number;
  adminNotes: string | null;
  package: BookingPackage | null;
  /** Language for the player's emails */
  locale: "en" | "fr";
  series: { frequency: "daily" | "weekly" | "monthly"; interval: number; startsOn: ISODate; endsOn: ISODate | null; occurrences: number | null } | null;
};

export type AdminLessonsResult = {
  created: Array<{ date: ISODate; id: string }>;
  skipped: Array<{ date: ISODate; reason: string }>;
};

export type CreateBookingError =
  | "slot_unavailable"
  | "service_unavailable"
  | "invalid_players"
  | "package_unavailable"
  | "rate_limited"
  | "invalid_input"
  | "not_configured"
  | "unknown";

export type CreateBookingResult =
  | { ok: true; id: string; reference: string }
  | { ok: false; error: CreateBookingError };
