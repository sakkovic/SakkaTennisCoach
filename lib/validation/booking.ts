import { z } from "zod";
import { isValidISODate } from "@/lib/booking/time";
import { PLAYER_LEVELS } from "@/lib/booking/types";
import { en } from "@/lib/i18n/dictionaries/en";
import type { Dictionary } from "@/lib/i18n/config-types";

/**
 * Shared by the booking form (client, in the visitor's language) and the
 * createBooking server action (re-validation; messages there are not shown).
 */
type Messages = Dictionary["validation"];

export const makeEmailSchema = (m: Messages) =>
  z.string().trim().toLowerCase().min(1, m.emailRequired).pipe(z.email(m.emailInvalid));

export const makePlayerDetailsSchema = (m: Messages) =>
  z.object({
    firstName: z.string().trim().min(1, m.firstName).max(80, m.nameTooLong),
    lastName: z.string().trim().min(1, m.lastName).max(80, m.nameTooLong),
    email: makeEmailSchema(m),
    phone: z.string().trim().min(1, m.phoneRequired).regex(/^\+?[\d\s().-]{6,24}$/, m.phoneInvalid),
    playerLevel: z.enum(PLAYER_LEVELS, { error: m.level }),
    playersCount: z.number().int().min(1).max(12),
    notes: z.string().trim().max(1000, m.notesTooLong).optional(),
    consent: z.literal(true, { error: m.consent }),
    /** Honeypot — real users never see or fill this field. */
    website: z.string().max(0).optional(),
  });

export const playerDetailsSchema = makePlayerDetailsSchema(en.validation);

export type PlayerDetails = z.output<typeof playerDetailsSchema>;
export type PlayerDetailsInput = z.input<typeof playerDetailsSchema>;

export const bookingRequestSchema = playerDetailsSchema.extend({
  serviceId: z.string().min(1).max(64),
  locationId: z.string().min(1).max(64),
  date: z.string().refine(isValidISODate, "Invalid date."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time."),
  /** Optional lesson pack requested with this first lesson */
  packageId: z.string().min(1).max(64).nullish(),
  /** Visitor's language — stored on the booking for emails */
  locale: z.enum(["en", "fr"]).default("en"),
});

export type BookingRequest = z.output<typeof bookingRequestSchema>;

export const availabilityQuerySchema = z.object({
  service: z.string().min(1).max(64),
  location: z.string().min(1).max(64),
  date: z.string().refine(isValidISODate).optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
});
