"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { planLessons } from "@/lib/admin/lessons";
import { coachToday } from "@/lib/admin/today";
import { requireAdmin } from "@/lib/auth/admin";
import { CREATABLE, type OccurrenceCheck } from "@/lib/booking/recurrence";
import { getRepository, type AdminResult } from "@/lib/data";
import { validateJourneyImage } from "@/lib/data/journey-images";
import { sendBookingStatusEmail, sendLessonsScheduledEmail } from "@/lib/notifications/email";
import { clearOutbox } from "@/lib/notifications/outbox";
import {
  adminLessonSchema,
  journeyPostSchema,
  packageSchema,
  type AdminLessonForm,
  type JourneyPostForm,
  availabilityRuleSchema,
  blockedDateSchema,
  bookingNotesSchema,
  bookingStatusSchema,
  locationSchema,
  serviceSchema,
  settingsSchema,
} from "@/lib/validation/admin";

/**
 * Admin Server Actions. Every action:
 *  1. re-checks admin authorization on the server (never trust the UI),
 *  2. validates input with Zod,
 *  3. writes through the repository (RLS enforces admin-only access in Supabase),
 *  4. revalidates affected pages.
 */

export type ActionResult = AdminResult & { fieldErrors?: Record<string, string[] | undefined> };

function invalid(error: z.ZodError): ActionResult {
  const flat = z.flattenError(error);
  const first = flat.formErrors[0] ?? Object.values(flat.fieldErrors).flat()[0] ?? "Please check the form.";
  return { ok: false, error: String(first), fieldErrors: flat.fieldErrors as Record<string, string[] | undefined> };
}

function refreshAdmin() {
  revalidatePath("/admin", "layout");
}

/** Public pages live under app/[lang] — refresh both languages. */
function refreshPublicCatalog() {
  revalidatePath("/[lang]", "layout");
}

// ---- Bookings ---------------------------------------------------------------

export async function setBookingStatusAction(input: z.input<typeof bookingStatusSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = bookingStatusSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const repo = getRepository();
  const result = await repo.updateBookingStatus(parsed.data.id, parsed.data.status, parsed.data.reason ?? null);
  if (result.ok && (parsed.data.status === "confirmed" || parsed.data.status === "cancelled")) {
    after(async () => {
      const booking = await repo.getBooking(parsed.data.id);
      if (booking) await sendBookingStatusEmail(booking);
    });
  }
  refreshAdmin();
  return result;
}

export async function saveBookingNotesAction(input: z.input<typeof bookingNotesSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = bookingNotesSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await getRepository().updateBookingNotes(parsed.data.id, parsed.data.adminNotes || null);
  refreshAdmin();
  return result;
}

// ---- Lessons created by the coach (one-off or recurring) ---------------------

export type LessonPreview = {
  summary: string;
  endTime: string;
  priceCents: number;
  currency: string;
  checks: OccurrenceCheck[];
};

export async function previewLessonsAction(input: AdminLessonForm): Promise<ActionResult & { preview?: LessonPreview }> {
  await requireAdmin();
  const parsed = adminLessonSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const plan = await planLessons(parsed.data);
  if (!plan.ok) return { ok: false, error: plan.error, fieldErrors: plan.field ? { [plan.field]: [plan.error] } : undefined };
  return {
    ok: true,
    preview: { summary: plan.summary, endTime: plan.endTime, priceCents: plan.priceCents, currency: plan.service.currency, checks: plan.checks },
  };
}

export type CreateLessonsResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  created: number;
  skipped: Array<{ date: string; reason: string }>;
  firstId?: string;
};

export async function createLessonsAction(input: AdminLessonForm): Promise<CreateLessonsResult> {
  await requireAdmin();
  const parsed = adminLessonSchema.safeParse(input);
  if (!parsed.success) {
    const res = invalid(parsed.error);
    return { ok: false, error: res.ok ? undefined : res.error, fieldErrors: res.fieldErrors, created: 0, skipped: [] };
  }
  const v = parsed.data;

  // Re-plan on the server: the calendar may have changed since the preview.
  const plan = await planLessons(v);
  if (!plan.ok) return { ok: false, error: plan.error, created: 0, skipped: [] };

  const creatable = plan.checks.filter((c) => CREATABLE.includes(c.status)).map((c) => c.date);
  const notCreatable = plan.checks.filter((c) => !CREATABLE.includes(c.status)).map((c) => ({ date: c.date, reason: c.detail ?? c.status }));
  if (creatable.length === 0) return { ok: false, error: "None of these dates are free. Pick another time.", created: 0, skipped: notCreatable };

  const result = await getRepository().createAdminLessons(
    {
      serviceId: v.serviceId,
      locationId: v.locationId,
      startTime: v.startTime,
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      phone: v.phone,
      playerLevel: v.playerLevel,
      playersCount: v.playersCount,
      priceCents: plan.priceCents,
      adminNotes: v.adminNotes,
      package: plan.package,
      locale: v.locale,
      series:
        v.frequency === "once"
          ? null
          : {
              frequency: v.frequency,
              interval: v.interval,
              startsOn: v.date,
              endsOn: creatable.at(-1) ?? null,
              occurrences: creatable.length,
            },
    },
    creatable,
  );

  if (v.notify && v.email && result.created.length > 0) {
    const email = v.email;
    after(() =>
      sendLessonsScheduledEmail({
        email,
        locale: v.locale,
        firstName: v.firstName,
        serviceId: plan.service.id,
        serviceName: plan.service.name,
        locationName: plan.location.name,
        mapsUrl: plan.location.mapsUrl,
        startTime: v.startTime,
        endTime: plan.endTime,
        summary: plan.summary,
        dates: result.created.map((c) => c.date),
      }),
    );
  }

  refreshAdmin();
  return {
    ok: result.created.length > 0,
    error: result.created.length === 0 ? "No lessons could be created — those times were just taken." : undefined,
    created: result.created.length,
    skipped: [...notCreatable, ...result.skipped],
    firstId: result.created[0]?.id,
  };
}

export async function cancelSeriesAction(seriesId: string, reason?: string): Promise<ActionResult & { count?: number }> {
  await requireAdmin();
  if (!seriesId) return { ok: false, error: "Missing series." };
  const { today } = await coachToday();
  const result = await getRepository().cancelSeries(seriesId, today, reason?.trim().slice(0, 500) || null);
  refreshAdmin();
  return result;
}

// ---- Services ---------------------------------------------------------------

export async function saveServiceAction(input: z.input<typeof serviceSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await getRepository().saveService(parsed.data);
  refreshAdmin();
  refreshPublicCatalog();
  return result;
}

export async function deleteServiceAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const result = await getRepository().deleteService(id);
  refreshAdmin();
  refreshPublicCatalog();
  return result;
}

// ---- Locations --------------------------------------------------------------

export async function saveLocationAction(input: z.input<typeof locationSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await getRepository().saveLocation(parsed.data);
  refreshAdmin();
  refreshPublicCatalog();
  return result;
}

export async function deleteLocationAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const result = await getRepository().deleteLocation(id);
  refreshAdmin();
  refreshPublicCatalog();
  return result;
}

// ---- Availability -----------------------------------------------------------

export async function createAvailabilityRuleAction(input: z.input<typeof availabilityRuleSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = availabilityRuleSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await getRepository().createAvailabilityRule(parsed.data);
  refreshAdmin();
  return result;
}

export async function setAvailabilityRuleActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin();
  const result = await getRepository().setAvailabilityRuleActive(id, isActive);
  refreshAdmin();
  return result;
}

export async function deleteAvailabilityRuleAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const result = await getRepository().deleteAvailabilityRule(id);
  refreshAdmin();
  return result;
}

export async function createBlockedDateAction(input: z.input<typeof blockedDateSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = blockedDateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await getRepository().createBlockedDate(parsed.data);
  refreshAdmin();
  return result;
}

export async function deleteBlockedDateAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const result = await getRepository().deleteBlockedDate(id);
  refreshAdmin();
  return result;
}

// ---- Lesson packs -------------------------------------------------------------

export async function savePackageAction(input: z.input<typeof packageSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = packageSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await getRepository().savePackage(parsed.data);
  refreshAdmin();
  refreshPublicCatalog();
  return result;
}

export async function deletePackageAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const result = await getRepository().deletePackage(id);
  refreshAdmin();
  refreshPublicCatalog();
  return result;
}

// ---- Journey (achievements / photos / news) ----------------------------------

function refreshJourney() {
  revalidatePath("/[lang]", "layout");
}

export async function uploadJourneyImageAction(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Choose an image to upload." };
  const problem = validateJourneyImage(file);
  if (problem) return { ok: false, error: problem };
  return getRepository().uploadJourneyImage(file);
}

export async function saveJourneyPostAction(input: JourneyPostForm): Promise<ActionResult> {
  await requireAdmin();
  const parsed = journeyPostSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await getRepository().saveJourneyPost(parsed.data);
  refreshAdmin();
  refreshJourney();
  return result;
}

export async function deleteJourneyPostAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const result = await getRepository().deleteJourneyPost(id);
  refreshAdmin();
  refreshJourney();
  return result;
}

// ---- Settings & messages ----------------------------------------------------

export async function saveSettingsAction(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await getRepository().updateSettings(parsed.data);
  refreshAdmin();
  refreshPublicCatalog();
  return result;
}

export async function setMessageStatusAction(id: string, status: "new" | "read" | "archived"): Promise<ActionResult> {
  await requireAdmin();
  if (!["new", "read", "archived"].includes(status)) return { ok: false, error: "Invalid status." };
  const result = await getRepository().setContactMessageStatus(id, status);
  refreshAdmin();
  return result;
}

// ---------- Email outbox (local preview) ----------

export async function clearOutboxAction(): Promise<ActionResult> {
  await requireAdmin();
  clearOutbox();
  revalidatePath("/admin/emails");
  return { ok: true };
}
