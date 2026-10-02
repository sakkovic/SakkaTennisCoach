"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import {
  addDays,
  addMonths,
  firstOfMonth,
  formatDateLong,
  formatMonthYear,
  lastOfMonth,
  monthOf,
  weekdayOf,
} from "@/lib/booking/time";
import { useI18n } from "@/components/i18n/I18nProvider";
import { fill } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import { useAvailableDates } from "./useAvailability";

type Props = {
  serviceId: string;
  locationId: string;
  selected: string | null;
  today: string;
  lastBookable: string;
  refreshKey: number;
  onSelect: (date: string, opts?: { auto?: boolean }) => void;
};


export function BookingCalendar({ serviceId, locationId, selected, today, lastBookable, refreshKey, onSelect }: Props) {
  const { t, locale } = useI18n();
  const [month, setMonth] = useState(() => monthOf(selected ?? today));
  const { status, data, retry } = useAvailableDates(serviceId, locationId, month, refreshKey);
  const available = useMemo(() => new Set(data ?? []), [data]);

  const minMonth = monthOf(today);
  const maxMonth = monthOf(lastBookable);

  // Speed up the flow: preselect the first available day when nothing is chosen yet,
  // skipping ahead (once) when the current month is already fully booked.
  const autoAdvanced = useRef(false);
  useEffect(() => {
    if (status !== "ready" || selected || !data) return;
    if (data.length > 0) {
      onSelect(data[0], { auto: true });
    } else if (!autoAdvanced.current && month < maxMonth) {
      autoAdvanced.current = true;
      setMonth((m) => addMonths(m, 1));
    }
  }, [status, data, selected, onSelect, month, maxMonth]);

  const days = useMemo(() => {
    const first = firstOfMonth(month);
    const offset = (weekdayOf(first) + 6) % 7; // Monday-first grid
    const count = Number(lastOfMonth(month).slice(8, 10));
    return { offset, list: Array.from({ length: count }, (_, i) => addDays(first, i)) };
  }, [month]);

  const noneThisMonth = status === "ready" && available.size === 0;

  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-soft sm:p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" aria-live="polite">
          {formatMonthYear(month, locale)}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            disabled={month <= minMonth}
            className="inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
            aria-label={t.booking.prevMonth}
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            disabled={month >= maxMonth}
            className="inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
            aria-label={t.booking.nextMonth}
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center" aria-busy={status === "loading"}>
        {t.booking.weekdays.map((d) => (
          <div key={d} aria-hidden className="pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            {d}
          </div>
        ))}
        {Array.from({ length: days.offset }, (_, i) => (
          <div key={`blank-${i}`} aria-hidden />
        ))}
        {days.list.map((date) => {
          const isAvailable = available.has(date);
          const isSelected = date === selected;
          const isToday = date === today;
          const loading = status === "loading" && date >= today && date <= lastBookable;
          return (
            <div key={date} className="flex justify-center">
              <button
                type="button"
                disabled={!isAvailable}
                onClick={() => onSelect(date)}
                aria-pressed={isSelected}
                aria-label={`${formatDateLong(date, locale)}${isAvailable ? "" : ` — ${t.booking.unavailable}`}`}
                className={cn(
                  "tabular relative inline-flex aspect-square w-full max-w-12 items-center justify-center rounded-full text-[0.9375rem] transition-colors duration-150",
                  isSelected && "bg-ink font-bold text-lime",
                  !isSelected && isAvailable && "font-semibold text-ink hover:bg-lime/30",
                  !isAvailable && "cursor-not-allowed text-muted/45",
                  loading && "animate-pulse",
                )}
              >
                {Number(date.slice(8, 10))}
                {isAvailable && !isSelected && <span aria-hidden className="absolute bottom-1.5 size-1 rounded-full bg-lime-ink" />}
                {isToday && !isSelected && <span aria-hidden className="absolute inset-0.5 rounded-full ring-1 ring-ink/20" />}
              </button>
            </div>
          );
        })}
      </div>

      {status === "error" && (
        <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger">
          {t.booking.datesError}
          <button type="button" onClick={retry} className="inline-flex items-center gap-1.5 font-semibold underline">
            <RotateCw aria-hidden className="size-4" /> {t.booking.retry}
          </button>
        </div>
      )}
      {noneThisMonth && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-surface px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted">{fill(t.booking.noneThisMonth, { month: formatMonthYear(month, locale) })}</span>
          {month < maxMonth && (
            <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))} className="font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4">
              {t.booking.seeNextMonth}
            </button>
          )}
        </div>
      )}
      <p className="mt-4 flex items-center gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-lime-ink" /> {t.booking.legendAvailable}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-full bg-ink" /> {t.booking.legendSelected}
        </span>
      </p>
    </div>
  );
}
