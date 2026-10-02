import Link from "next/link";
import { Plus } from "lucide-react";
import { rulesForDate } from "@/lib/booking/slots";
import { addDays, formatDayMonth, formatWeekdayShort, minutesToTime, timeToMinutes } from "@/lib/booking/time";
import type { AvailabilityRule, BlockedDate, Booking } from "@/lib/booking/types";
import { cn } from "@/lib/utils/cn";
import { StatusBadge } from "./StatusBadge";

type Props = {
  weekStart: string;
  today: string;
  bookings: Booking[];
  rules: AvailabilityRule[];
  blocked: BlockedDate[];
};

const PX_PER_MIN = 1.1;

const statusStyles: Record<Booking["status"], string> = {
  pending: "border-l-warning bg-warning-50 text-ink",
  confirmed: "border-l-ink bg-ink text-white",
  completed: "border-l-sky bg-sky-50 text-navy",
  cancelled: "border-l-danger bg-danger-50 text-danger line-through",
};

function dayBlocks(date: string, blocked: BlockedDate[]) {
  return blocked.filter((b) => b.dateFrom <= date && b.dateTo >= date);
}

export function WeekCalendar({ weekStart, today, bookings, rules, blocked }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Visible hour range: availability + bookings, padded to whole hours.
  const minutes = [
    ...rules.filter((r) => r.isActive).flatMap((r) => [timeToMinutes(r.startTime), timeToMinutes(r.endTime)]),
    ...bookings.flatMap((b) => [timeToMinutes(b.startTime), timeToMinutes(b.endTime)]),
  ];
  // Always show at least 07:00–21:00 so the coach can add lessons outside usual hours.
  const startHour = Math.min(7, minutes.length ? Math.max(0, Math.floor(Math.min(...minutes) / 60)) : 7);
  const endHour = Math.max(21, minutes.length ? Math.min(24, Math.ceil(Math.max(...minutes) / 60)) : 21);
  const gridStart = startHour * 60;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const halfHours = Array.from({ length: (endHour - startHour) * 2 }, (_, i) => gridStart + i * 30);
  const height = (endHour - startHour) * 60 * PX_PER_MIN;
  const y = (m: number) => (m - gridStart) * PX_PER_MIN;
  const newLessonHref = (date: string, time?: string) => `/admin/calendar?week=${weekStart}&new=${date}${time ? `T${time}` : ""}`;

  return (
    <>
      {/* Desktop: time grid */}
      <div className="hidden overflow-x-auto md:block">
        <div className="grid min-w-[760px] grid-cols-[56px_repeat(7,minmax(0,1fr))]">
          <div />
          {days.map((d) => (
            <div key={d} className={cn("border-b border-line px-2 pb-3 text-center", d === today && "text-ink")}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{formatWeekdayShort(d)}</p>
              <p className={cn("tabular mx-auto mt-1 inline-flex size-8 items-center justify-center rounded-full text-sm font-bold", d === today && "bg-lime text-ink")}>
                {Number(d.slice(8))}
              </p>
            </div>
          ))}

          {/* Hour labels */}
          <div className="relative" style={{ height }}>
            {hours.map((h) => (
              <span key={h} className="tabular absolute right-2 -translate-y-1/2 text-[0.6875rem] text-muted" style={{ top: y(h * 60) }}>
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {days.map((d) => {
            // Every rule that applies on this date, whatever its location.
            const windows = rules.filter((r) => rulesForDate([r], d, r.locationId ?? "").length > 0);
            const blocks = dayBlocks(d, blocked);
            const fullDay = blocks.some((b) => !b.startTime);
            const dayBookings = bookings.filter((b) => b.date === d);
            return (
              <div key={d} className="relative border-l border-line" style={{ height }}>
                {hours.map((h) => (
                  <div key={h} aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-line/70" style={{ top: y(h * 60) }} />
                ))}
                {/* Click any empty half-hour to add a lesson there (keyboard users: "New lesson" button) */}
                {d >= today &&
                  halfHours.map((m) => (
                    <Link
                      key={m}
                      href={newLessonHref(d, minutesToTime(m))}
                      scroll={false}
                      tabIndex={-1}
                      aria-hidden
                      title={`Add lesson · ${formatWeekdayShort(d)} ${minutesToTime(m)}`}
                      className="group/slot absolute inset-x-0 flex items-start px-1"
                      style={{ top: y(m), height: 30 * PX_PER_MIN }}
                    >
                      <span className="mt-0.5 hidden w-full items-center gap-1 rounded-md bg-ink/80 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-white group-hover/slot:flex">
                        <Plus className="size-3" /> {minutesToTime(m)}
                      </span>
                    </Link>
                  ))}
                {windows.map((w) => (
                  <div
                    key={w.id}
                    aria-hidden
                    className="pointer-events-none absolute inset-x-1 rounded-md bg-lime/15"
                    style={{ top: y(timeToMinutes(w.startTime)), height: (timeToMinutes(w.endTime) - timeToMinutes(w.startTime)) * PX_PER_MIN }}
                  />
                ))}
                {fullDay && (
                  <div className="pointer-events-none absolute inset-0 flex items-start justify-center bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgb(7_28_44/0.06)_6px,rgb(7_28_44/0.06)_12px)] pt-3">
                    <span className="rounded-full bg-white px-2 py-0.5 text-[0.6875rem] font-semibold text-muted shadow-soft">Blocked</span>
                  </div>
                )}
                {!fullDay &&
                  blocks.map((b) => (
                    <div
                      key={b.id}
                      title={b.reason ?? "Blocked"}
                      className="pointer-events-none absolute inset-x-1 rounded-md bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgb(7_28_44/0.08)_6px,rgb(7_28_44/0.08)_12px)]"
                      style={{ top: y(timeToMinutes(b.startTime!)), height: (timeToMinutes(b.endTime!) - timeToMinutes(b.startTime!)) * PX_PER_MIN }}
                    />
                  ))}
                {dayBookings.map((b) => (
                  <Link
                    key={b.id}
                    href={`/admin/bookings/${b.id}`}
                    className={cn(
                      "absolute inset-x-1 z-10 overflow-hidden rounded-lg border-l-4 px-2 py-1.5 text-xs shadow-soft transition-transform hover:z-20 hover:scale-[1.02]",
                      statusStyles[b.status],
                    )}
                    style={{ top: y(timeToMinutes(b.startTime)) + 1, height: Math.max(b.durationMin * PX_PER_MIN - 2, 28) }}
                    aria-label={`${b.startTime}–${b.endTime} ${b.firstName} ${b.lastName}, ${b.serviceName}, ${b.status}`}
                  >
                    <p className="tabular font-bold">{b.startTime}</p>
                    <p className="truncate font-semibold">
                      {b.firstName} {b.lastName}
                    </p>
                    <p className="truncate opacity-75">{b.serviceName}</p>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-line px-2 pt-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5 font-medium text-ink">
            <Plus aria-hidden className="size-3.5" /> Click an empty spot to add a lesson
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded bg-lime/30" /> Available hours
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded border-l-4 border-l-warning bg-warning-50" /> Pending
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded bg-ink" /> Confirmed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded bg-sky-50 ring-1 ring-sky" /> Completed
          </span>
        </div>
      </div>

      {/* Mobile: agenda */}
      <ol className="space-y-5 md:hidden">
        {days.map((d) => {
          const dayBookings = bookings.filter((b) => b.date === d);
          const blocks = dayBlocks(d, blocked);
          return (
            <li key={d}>
              <div className="flex items-center justify-between gap-3">
                <p className={cn("text-sm font-semibold", d === today && "text-lime-ink")}>
                  {formatWeekdayShort(d)} {formatDayMonth(d)} {d === today && "· Today"}
                </p>
                {d >= today && (
                  <Link
                    href={newLessonHref(d, "09:00")}
                    scroll={false}
                    className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold text-ink hover:bg-surface"
                  >
                    <Plus aria-hidden className="size-4" /> Add<span className="sr-only"> lesson on {formatDayMonth(d)}</span>
                  </Link>
                )}
              </div>
              {blocks.length > 0 && <p className="mt-1 text-xs text-muted">Blocked {blocks.some((b) => !b.startTime) ? "all day" : blocks.map((b) => `${b.startTime}–${b.endTime}`).join(", ")}</p>}
              {dayBookings.length === 0 ? (
                <p className="mt-2 rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">No lessons</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {dayBookings.map((b) => (
                    <li key={b.id}>
                      <Link href={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-3 shadow-soft">
                        <div className="min-w-0">
                          <p className="tabular text-sm font-bold">
                            {b.startTime}–{b.endTime}
                          </p>
                          <p className="truncate text-sm">
                            {b.firstName} {b.lastName} · {b.serviceName}
                          </p>
                          <p className="truncate text-xs text-muted">{b.locationName}</p>
                        </div>
                        <StatusBadge status={b.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
