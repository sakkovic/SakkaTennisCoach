"use client";

import { ArrowUpRight, Check, MapPin } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { Location } from "@/lib/booking/types";
import { fill } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import { StepHeading } from "./StepHeading";

type Props = {
  locations: Location[];
  selectedId: string | null;
  onSelect: (location: Location) => void;
};

export function LocationSelector({ locations, selectedId, onSelect }: Props) {
  const { t } = useI18n();
  return (
    <fieldset>
      <StepHeading as="legend" title={t.booking.locationTitle} text={t.booking.locationText} />
      <div role="radiogroup" aria-label={t.booking.summary.location} className="mt-6 grid gap-3">
        {locations.map((l) => {
          const selected = l.id === selectedId;
          return (
            <div key={l.id}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(l)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-card border bg-white p-5 text-left transition-[border-color,box-shadow] duration-200 hover:shadow-lift active:scale-[0.99]",
                  selected ? "border-ink shadow-lift ring-2 ring-ink" : "border-line shadow-soft hover:border-ink/25",
                )}
              >
                <span className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-2xl", selected ? "bg-ink text-lime" : "bg-surface text-ink")}>
                  <MapPin aria-hidden className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{l.name}</span>
                  <span className="mt-0.5 block text-sm text-muted">{[l.address, l.city].filter(Boolean).join(", ")}</span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                    selected ? "border-ink bg-ink text-lime" : "border-line text-transparent",
                  )}
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              </button>
              {l.mapsUrl && (
                <a
                  href={l.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-5 mt-2 inline-flex items-center gap-1 text-sm font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4 hover:text-lime-ink"
                >
                  {fill(t.booking.viewOnMaps, { name: l.name })} <ArrowUpRight aria-hidden className="size-4" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
