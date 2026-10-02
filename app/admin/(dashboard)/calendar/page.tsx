import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { NewLessonDialog, type NewLessonInitial } from "@/components/admin/NewLessonDialog";
import { WeekCalendar } from "@/components/admin/WeekCalendar";
import { ButtonLink } from "@/components/ui/Button";
import { coachToday } from "@/lib/admin/today";
import { getRepository } from "@/lib/data";
import { addDays, formatDayMonth, isValidISODate, startOfWeek } from "@/lib/booking/time";

export const metadata = { title: "Calendar" };

/** Parses ?new=YYYY-MM-DD or ?new=YYYY-MM-DDTHH:mm (from a grid click or a "New lesson" button). */
function parseNewParam(value: unknown, today: string): NewLessonInitial | null {
  if (typeof value !== "string") return null;
  const [date, time] = value.split("T");
  if (!isValidISODate(date)) return null;
  return { date: date < today ? today : date, time: time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "09:00" };
}

/**
 * ?from=<bookingId>: open the new-lesson form pre-filled from an existing booking —
 * used by "Schedule remaining lessons" on a lesson-pack request (same player,
 * service, location and time; weekly; remaining count; pack discount).
 */
async function prefillFromBooking(bookingId: unknown, today: string): Promise<NewLessonInitial | null> {
  if (typeof bookingId !== "string") return null;
  const b = await getRepository().getBooking(bookingId);
  if (!b) return null;
  const next = addDays(b.date, 7);
  return {
    date: next < today ? today : next,
    time: b.startTime,
    prefill: {
      serviceId: b.serviceId,
      locationId: b.locationId,
      startTime: b.startTime,
      firstName: b.firstName,
      lastName: b.lastName,
      email: b.email ?? "",
      phone: b.phone ?? "",
      playerLevel: b.playerLevel,
      playersCount: b.playersCount,
      packageId: b.package?.id ?? "",
      locale: b.locale,
      frequency: b.package && b.package.lessons > 2 ? "weekly" : "once",
      count: b.package ? Math.max(1, b.package.lessons - 1) : 1,
      adminNotes: b.package ? `${b.package.name} — follow-up to ${b.reference}` : null,
    },
  };
}

export default async function CalendarPage({ searchParams }: PageProps<"/admin/calendar">) {
  const sp = await searchParams;
  const { today } = await coachToday();
  const newLesson = (await prefillFromBooking(sp.from, today)) ?? parseNewParam(sp.new, today);
  const anchor = typeof sp.week === "string" && isValidISODate(sp.week) ? sp.week : (newLesson?.date ?? today);
  const weekStart = startOfWeek(anchor);
  const weekEnd = addDays(weekStart, 6);

  const repo = getRepository();
  const [bookings, rules, blocked, services, locations, packages] = await Promise.all([
    repo.listBookings({ today, scope: "all", from: weekStart, to: weekEnd }),
    repo.listAvailabilityRules(),
    repo.listBlockedDates(weekStart),
    repo.listServices(),
    repo.listLocations(),
    repo.listPackages({ includeInactive: true }),
  ]);
  const visible = bookings.filter((b) => b.status !== "cancelled");
  const newDate = weekStart > today ? weekStart : today;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Calendar"
        description={`${formatDayMonth(weekStart)} – ${formatDayMonth(weekEnd)} · ${visible.length} lesson${visible.length === 1 ? "" : "s"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href={`/admin/calendar?week=${addDays(weekStart, -7)}`} variant="outline" size="sm" aria-label="Previous week" className="px-3">
              <ChevronLeft aria-hidden className="size-4" />
            </ButtonLink>
            <ButtonLink href="/admin/calendar" variant="outline" size="sm">
              This week
            </ButtonLink>
            <ButtonLink href={`/admin/calendar?week=${addDays(weekStart, 7)}`} variant="outline" size="sm" aria-label="Next week" className="px-3">
              <ChevronRight aria-hidden className="size-4" />
            </ButtonLink>
            <ButtonLink href={`/admin/calendar?week=${weekStart}&new=${newDate}`} scroll={false} variant="secondary" size="sm" icon={<Plus aria-hidden className="size-4" />}>
              New lesson
            </ButtonLink>
          </div>
        }
      />
      <AdminCard>
        <div className="p-4 md:p-6">
          <WeekCalendar weekStart={weekStart} today={today} bookings={visible} rules={rules} blocked={blocked} />
        </div>
      </AdminCard>
      <NewLessonDialog services={services} locations={locations} packages={packages} initial={newLesson} />
    </div>
  );
}
