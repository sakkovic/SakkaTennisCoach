"use client";

import { Check, Clock, Users } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { formatPrice, priceUnitLabel } from "@/lib/booking/money";
import { formatDuration } from "@/lib/booking/time";
import type { Service } from "@/lib/booking/types";
import { playersLabel } from "@/lib/booking/labels";
import { cn } from "@/lib/utils/cn";
import { StepHeading } from "./StepHeading";

type Props = {
  /** Already localized by the page */
  services: Service[];
  selectedId: string | null;
  onSelect: (service: Service) => void;
};

export function ServiceSelector({ services, selectedId, onSelect }: Props) {
  const { t, locale } = useI18n();
  return (
    <fieldset>
      <StepHeading as="legend" title={t.booking.lessonTitle} text={t.booking.lessonText} />
      <div role="radiogroup" aria-label={t.booking.lessonType} className="mt-6 grid gap-3 sm:grid-cols-2">
        {services.map((s) => {
          const selected = s.id === selectedId;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(s)}
              className={cn(
                "group relative flex flex-col rounded-card border bg-white p-5 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.99] motion-reduce:hover:translate-y-0",
                selected ? "border-ink shadow-lift ring-2 ring-ink" : "border-line shadow-soft hover:border-ink/25",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute right-4 top-4 inline-flex size-6 items-center justify-center rounded-full border transition-colors",
                  selected ? "border-ink bg-ink text-lime" : "border-line bg-white text-transparent",
                )}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <span className="pr-8 text-lg font-semibold leading-snug">{s.name}</span>
              <span className="mt-1.5 text-sm leading-relaxed text-muted">{s.shortDescription}</span>
              <span className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Clock aria-hidden className="size-4" /> {formatDuration(s.durationMin)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users aria-hidden className="size-4" /> {playersLabel(s, t)}
                </span>
              </span>
              <span className="mt-4 flex items-baseline gap-1.5 border-t border-line pt-4">
                <span className="tabular text-xl font-bold">{formatPrice(s.priceCents, s.currency, locale)}</span>
                <span className="text-sm text-muted">{priceUnitLabel(s.pricingUnit, locale)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
