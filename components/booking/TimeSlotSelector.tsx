"use client";

import { CalendarX2, Check, RotateCw } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { formatDateLong, timeToMinutes } from "@/lib/booking/time";
import type { Slot } from "@/lib/booking/types";
import { fill } from "@/lib/i18n/config";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";
import { useAvailableSlots } from "./useAvailability";

type Props = {
  serviceId: string;
  locationId: string;
  date: string | null;
  selected: string | null;
  refreshKey: number;
  onSelect: (time: string) => void;
};

const PERIODS = [
  { key: "morning", test: (m: number) => m < 12 * 60 },
  { key: "afternoon", test: (m: number) => m >= 12 * 60 && m < 17 * 60 },
  { key: "evening", test: (m: number) => m >= 17 * 60 },
] as const;

export function TimeSlotSelector({ serviceId, locationId, date, selected, refreshKey, onSelect }: Props) {
  const { t, locale } = useI18n();
  const { status, data, retry } = useAvailableSlots(serviceId, locationId, date, refreshKey);

  if (!date) {
    return <p className="rounded-card border border-dashed border-line p-6 text-center text-sm text-muted">{t.booking.selectDateFirst}</p>;
  }

  if (status === "loading" || status === "idle") {
    return (
      <div aria-busy="true" aria-label={t.booking.loadingTimes} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-12 rounded-full" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger">
        {t.booking.timesError}
        <button type="button" onClick={retry} className="inline-flex items-center gap-1.5 font-semibold underline">
          <RotateCw aria-hidden className="size-4" /> {t.booking.retry}
        </button>
      </div>
    );
  }

  const slots = data ?? [];
  if (slots.length === 0) {
    return <EmptyState icon={CalendarX2} title={t.booking.noTimesTitle} description={t.booking.noTimesText} />;
  }

  return (
    <div className="space-y-5" role="radiogroup" aria-label={fill(t.booking.timesOn, { date: formatDateLong(date, locale) })}>
      {PERIODS.map((period) => {
        const group = slots.filter((s) => period.test(timeToMinutes(s.start)));
        if (group.length === 0) return null;
        return (
          <div key={period.key}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t.booking.periods[period.key]}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {group.map((slot: Slot) => {
                const isSelected = slot.start === selected;
                return (
                  <button
                    key={slot.start}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`${slot.start} ${t.booking.to} ${slot.end}`}
                    onClick={() => onSelect(slot.start)}
                    className={cn(
                      "tabular inline-flex h-12 items-center justify-center gap-1.5 rounded-full border text-[0.9375rem] font-semibold transition-colors duration-150 active:scale-[0.97]",
                      isSelected ? "border-ink bg-ink text-lime" : "border-line bg-white text-ink hover:border-ink/40 hover:bg-surface",
                    )}
                  >
                    {isSelected && <Check aria-hidden className="size-4" strokeWidth={3} />}
                    {slot.start}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
