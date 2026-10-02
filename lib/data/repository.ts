import type {
  AdminLessonInput,
  AdminLessonsResult,
  AvailabilityRule,
  BlockedDate,
  Booking,
  BookingEvent,
  BookingStatus,
  BookingSummary,
  CoachSettings,
  ContactMessage,
  CreateBookingResult,
  ISODate,
  JourneyPost,
  Location,
  NewBookingInput,
  Package,
  Service,
  Slot,
} from "@/lib/booking/types";

/**
 * Data access contract. Two implementations:
 *  - supabase-repo.ts — production (RLS + Postgres functions)
 *  - demo-repo.ts     — in-memory, local development only
 * Pages, route handlers and server actions only ever talk to this interface.
 */

export type AdminResult = { ok: true; id?: string } | { ok: false; error: string };

export type BookingFilter = {
  status?: BookingStatus | "all";
  scope?: "upcoming" | "past" | "all";
  search?: string;
  from?: ISODate;
  to?: ISODate;
  limit?: number;
  seriesId?: string;
  /** "today" in the coach's timezone — used for upcoming/past scopes */
  today: ISODate;
};

export type DashboardStats = {
  today: number;
  upcoming: number;
  pending: number;
  completed: number;
};

export type ServiceInput = Omit<Service, "id"> & { id?: string };
export type LocationInput = Omit<Location, "id"> & { id?: string };
export type AvailabilityRuleInput = Omit<AvailabilityRule, "id">;
export type BlockedDateInput = Omit<BlockedDate, "id">;
export type PackageInput = Omit<Package, "id"> & { id?: string };
export type JourneyPostInput =Omit<JourneyPost, "id" | "createdAt"> & { id?: string };
export type ContactInput ={ name: string; email: string; phone: string | null; message: string };

export interface Repository {
  // ---- Public -------------------------------------------------------------
  getSettings(): Promise<CoachSettings>;
  listServices(opts?: { includeInactive?: boolean }): Promise<Service[]>;
  listLocations(opts?: { includeInactive?: boolean }): Promise<Location[]>;
  getAvailableDates(serviceId: string, locationId: string, from: ISODate, to: ISODate): Promise<ISODate[]>;
  getAvailableSlots(serviceId: string, locationId: string, date: ISODate): Promise<Slot[]>;
  createBooking(input: NewBookingInput): Promise<CreateBookingResult>;
  getBookingSummary(reference: string): Promise<BookingSummary | null>;
  createContactMessage(input: ContactInput): Promise<AdminResult>;

  // ---- Admin (caller must be authorized) ----------------------------------
  listBookings(filter: BookingFilter): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>;
  getBookingEvents(bookingId: string): Promise<BookingEvent[]>;
  updateBookingStatus(id: string, status: BookingStatus, reason?: string | null): Promise<AdminResult>;
  updateBookingNotes(id: string, adminNotes: string | null): Promise<AdminResult>;
  /** Creates confirmed lessons on the given dates; overlapping dates are skipped, never double-booked. */
  createAdminLessons(input: AdminLessonInput, dates: ISODate[]): Promise<AdminLessonsResult>;
  /** Cancels every pending/confirmed lesson of a series on or after `fromDate`. */
  cancelSeries(seriesId: string, fromDate: ISODate, reason: string | null): Promise<AdminResult & { count?: number }>;
  getDashboardStats(today: ISODate): Promise<DashboardStats>;

  saveService(input: ServiceInput): Promise<AdminResult>;
  deleteService(id: string): Promise<AdminResult>;
  saveLocation(input: LocationInput): Promise<AdminResult>;
  deleteLocation(id: string): Promise<AdminResult>;

  listAvailabilityRules(): Promise<AvailabilityRule[]>;
  createAvailabilityRule(input: AvailabilityRuleInput): Promise<AdminResult>;
  setAvailabilityRuleActive(id: string, isActive: boolean): Promise<AdminResult>;
  deleteAvailabilityRule(id: string): Promise<AdminResult>;

  listBlockedDates(fromDate?: ISODate): Promise<BlockedDate[]>;
  createBlockedDate(input: BlockedDateInput): Promise<AdminResult>;
  deleteBlockedDate(id: string): Promise<AdminResult>;

  updateSettings(input: CoachSettings): Promise<AdminResult>;

  // ---- Lesson packs --------------------------------------------------------
  listPackages(opts?: { includeInactive?: boolean }): Promise<Package[]>;
  savePackage(input: PackageInput): Promise<AdminResult>;
  deletePackage(id: string): Promise<AdminResult>;

  // ---- Journey (achievements / photos / news) -------------------------------
  /** order "featured" (default): featured first, then newest. "recent": newest first, ignoring the featured flag. */
  listJourneyPosts(opts?: { includeUnpublished?: boolean; limit?: number; order?: "featured" | "recent" }): Promise<JourneyPost[]>;
  saveJourneyPost(input: JourneyPostInput): Promise<AdminResult>;
  deleteJourneyPost(id: string): Promise<AdminResult>;
  uploadJourneyImage(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }>;

  listContactMessages(): Promise<ContactMessage[]>;
  setContactMessageStatus(id: string, status: ContactMessage["status"]): Promise<AdminResult>;
}
