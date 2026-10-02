"use client";

import { Check, Package as PackageIcon } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { formatPrice } from "@/lib/booking/money";
import { packPricing, validityLabel } from "@/lib/booking/packages";
import type { Package, Service } from "@/lib/booking/types";
import { fill } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

type Props = {
  service: Service;
  packages: Package[];
  /** Per-lesson base price (players already applied) */
  baseCents: number;
  selectedId: string | null;
  onSelect: (packageId: string | null) => void;
};

/** Single lesson vs. lesson packs, shown under the chosen lesson type. */
export function PlanSelector({ service, packages, baseCents, selectedId, onSelect }: Props) {
  const { t, locale } = useI18n();
  const p = t.booking.plan;
  const money = (cents: number) => formatPrice(cents, service.currency, locale);

  const options = [
    { id: null as string | null, title: p.single, detail: p.payPer, priceCents: baseCents, totalCents: null as number | null, savingsCents: 0, badge: null as string | null },
    ...packages.map((pkg) => {
      const pr = packPricing(baseCents, pkg);
      return {
        id: pkg.id as string | null,
        title: pkg.name,
        detail: `${pkg.lessonsCount} ${t.common.lessons} · ${validityLabel(pkg.validityDays, locale)}`,
        priceCents: pr.perLessonCents,
        totalCents: pr.totalCents,
        savingsCents: pr.savingsCents,
        badge: pkg.discountPercent > 0 ? fill(p.saveTag, { n: pkg.discountPercent }) : null,
      };
    }),
  ];

  return (
    <fieldset className="mt-8 rounded-card border border-line bg-surface/60 p-4 sm:p-5">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
        <PackageIcon aria-hidden className="size-4" /> {p.question}
      </legend>
      <div role="radiogroup" aria-label={fill(p.planFor, { service: service.name })} className="mt-2 grid gap-2 sm:grid-cols-3">
        {options.map((o) => {
          const selected = o.id === selectedId;
          return (
            <button
              key={o.id ?? "single"}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(o.id)}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-white p-4 text-left transition-[border-color,box-shadow] active:scale-[0.99]",
                selected ? "border-ink shadow-lift ring-2 ring-ink" : "border-line hover:border-ink/30",
              )}
            >
              {o.badge && <span className="absolute -top-2.5 right-3 rounded-full bg-lime px-2.5 py-0.5 text-xs font-bold text-ink">{o.badge}</span>}
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold">{o.title}</span>
                <span aria-hidden className={cn("inline-flex size-5 items-center justify-center rounded-full border", selected ? "border-ink bg-ink text-lime" : "border-line text-transparent")}>
                  <Check className="size-3" strokeWidth={3} />
                </span>
              </span>
              <span className="mt-0.5 text-xs text-muted">{o.detail}</span>
              <span className="mt-3 flex items-baseline gap-1">
                <span className="tabular text-lg font-bold">{money(o.priceCents)}</span>
                <span className="text-xs text-muted">{p.perLesson}</span>
              </span>
              {o.totalCents !== null && (
                <span className="tabular text-xs text-muted">
                  {fill(p.totalLine, { total: money(o.totalCents) })}
                  {o.savingsCents > 0 && <span className="font-semibold text-success"> · {fill(p.saveLine, { amount: money(o.savingsCents) })}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {selectedId && <p className="mt-3 px-1 text-xs leading-relaxed text-muted">{p.firstLessonNote}</p>}
    </fieldset>
  );
}
