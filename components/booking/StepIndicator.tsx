"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { fill } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import { BOOKING_STEPS, stepIndex, type StepId } from "./steps";

type Props = {
  current: StepId;
  /** Completed steps are clickable to go back. */
  onSelect: (id: StepId) => void;
};

export function StepIndicator({ current, onSelect }: Props) {
  const { t } = useI18n();
  const currentIndex = stepIndex(current);
  const label = (id: StepId) => t.booking.steps[id];

  return (
    <nav aria-label={t.booking.progress}>
      {/* Mobile: compact progress */}
      <div className="md:hidden">
        <p className="text-sm font-medium text-white/80">
          {fill(t.booking.stepOf, { n: currentIndex + 1, total: BOOKING_STEPS.length })} · <span className="text-lime">{label(current)}</span>
        </p>
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {BOOKING_STEPS.map((s, i) => (
            <span key={s.id} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i <= currentIndex ? "bg-lime" : "bg-white/15")} />
          ))}
        </div>
      </div>

      {/* Desktop: labelled steps */}
      <ol className="hidden items-center gap-2 md:flex">
        {BOOKING_STEPS.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2 last:flex-none">
              <button
                type="button"
                disabled={!done}
                onClick={() => onSelect(s.id)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex items-center gap-2.5 rounded-full py-1 pr-3 text-sm font-medium transition-colors",
                  active ? "text-white" : done ? "text-white/80 hover:text-white" : "text-white/40",
                )}
              >
                <span
                  className={cn(
                    "tabular inline-flex size-8 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                    active && "border-lime bg-lime text-ink",
                    done && "border-lime/50 text-lime group-hover:border-lime",
                    !active && !done && "border-white/20",
                  )}
                >
                  {done ? <Check aria-hidden className="size-4" strokeWidth={3} /> : i + 1}
                </span>
                {label(s.id)}
                {done && <span className="sr-only">{t.booking.completedStep}</span>}
              </button>
              {i < BOOKING_STEPS.length - 1 && <span aria-hidden className={cn("h-px flex-1", done ? "bg-lime/50" : "bg-white/15")} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
