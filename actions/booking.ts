"use server";

import { after } from "next/server";
import { z } from "zod";
import { getRepository } from "@/lib/data";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { isBookingEnabled } from "@/lib/env";
import type { Booking, CreateBookingError } from "@/lib/booking/types";
import { sendBookingRequestEmails } from "@/lib/notifications/email";
import { bookingRequestSchema, type BookingRequest } from "@/lib/validation/booking";

export type CreateBookingState =
  | { ok: true; reference: string }
  | { ok: false; code: CreateBookingError; message: string; fieldErrors?: Record<string, string[] | undefined> };



export async function createBookingAction(payload: unknown): Promise<CreateBookingState> {
  const lang = (payload as { locale?: string } | null)?.locale;
  const messages = getDictionary(hasLocale(lang) ? lang : "en").booking.errors;
  const parsed = bookingRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: messages.invalid_input,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const data = parsed.data;
  // Honeypot filled → silently reject bots.
  if (data.website) return { ok: false, code: "invalid_input", message: messages.invalid_input };
  if (!isBookingEnabled) return { ok: false, code: "not_configured", message: messages.not_configured };

  const repo = getRepository();
  const result = await repo.createBooking({
    serviceId: data.serviceId,
    locationId: data.locationId,
    date: data.date,
    startTime: data.startTime,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    playerLevel: data.playerLevel,
    playersCount: data.playersCount,
    notes: data.notes || null,
    packageId: data.packageId ?? null,
    locale: data.locale,
  });

  if (!result.ok) return { ok: false, code: result.error, message: messages[result.error] };

  // Emails after the response is sent — never slow down or fail the booking.
  after(async () => {
    const booking = await buildBookingForEmail(result.id, result.reference, data);
    if (booking) await sendBookingRequestEmails(booking);
  });

  return { ok: true, reference: result.reference };
}

/** Public clients can't read bookings (RLS), so rebuild the snapshot for emails. */
async function buildBookingForEmail(id: string, reference: string, data: BookingRequest): Promise<Booking | null> {
  const repo = getRepository();
  const summary = await repo.getBookingSummary(reference);
  if (!summary) return null;
  const now = new Date().toISOString();
  return {
    id,
    reference,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    playerLevel: data.playerLevel,
    playersCount: data.playersCount,
    notes: data.notes || null,
    source: "web",
    locale: data.locale,
    seriesId: null,
    package: summary.package,
    serviceId: data.serviceId,
    locationId: data.locationId,
    serviceName: summary.serviceName,
    locationName: summary.locationName,
    date: summary.date,
    startTime: summary.startTime,
    endTime: summary.endTime,
    durationMin: summary.durationMin,
    priceCents: summary.priceCents,
    currency: summary.currency,
    status: summary.status,
    paymentStatus: "unpaid",
    adminNotes: null,
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
  };
}
