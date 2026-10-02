import { Check, Clock, Users } from "lucide-react";
import { formatPrice, priceUnitLabel } from "@/lib/booking/money";
import { formatDuration } from "@/lib/booking/time";
import { packPricing } from "@/lib/booking/packages";
import type { Package, Service } from "@/lib/booking/types";
import { playersLabel } from "@/lib/booking/labels";
import { ButtonLink } from "@/components/ui/Button";
import { LocaleLink } from "@/components/i18n/LocaleLink";
import { getDictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";

type Props = { service: Service; packs?: Package[]; featured?: boolean; locale?: Locale };

export function ProgramCard({ service, packs = [], featured = false, locale = "en" }: Props) {
  const t = getDictionary(locale);
  const money = (cents: number) => formatPrice(cents, service.currency, locale);
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-card p-7 transition-[transform,box-shadow] duration-300 ease-out-quart hover:-translate-y-1 motion-reduce:hover:translate-y-0 md:p-8",
        featured ? "on-dark bg-ink text-white ring-1 ring-white/10" : "border border-line bg-white shadow-soft hover:shadow-lift",
      )}
    >
      {featured && (
        <span className="absolute -top-3 left-7 rounded-full bg-lime px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink">{t.common.featured}</span>
      )}
      <h3 className="font-display text-4xl leading-none">{service.name}</h3>
      <p className={cn("mt-3 text-[0.9375rem] leading-relaxed", featured ? "text-white/75" : "text-muted")}>
        {service.description ?? service.shortDescription}
      </p>

      <div className={cn("mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm", featured ? "text-white/80" : "text-muted")}>
        <span className="inline-flex items-center gap-1.5">
          <Clock aria-hidden className="size-4" /> {formatDuration(service.durationMin)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users aria-hidden className="size-4" /> {playersLabel(service, t)}
        </span>
      </div>

      {service.bestFor && (
        <p className="mt-6 text-sm">
          <span className={cn("font-semibold uppercase tracking-[0.14em]", featured ? "text-lime" : "text-lime-ink")}>{t.coaching.bestFor}</span>
          <span className={cn("mt-1 block", featured ? "text-white" : "text-ink")}>{service.bestFor}</span>
        </p>
      )}

      {service.includes.length > 0 && (
        <ul className="mt-6 space-y-2.5">
          {service.includes.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[0.9375rem]">
              <span className={cn("mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full", featured ? "bg-lime text-ink" : "bg-ink text-lime")}>
                <Check aria-hidden className="size-3" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      )}

      {packs.length > 0 && (
        <div className={cn("mt-6 rounded-2xl p-4", featured ? "bg-white/5 ring-1 ring-white/10" : "bg-surface")}>
          <p className={cn("text-xs font-semibold uppercase tracking-[0.14em]", featured ? "text-lime" : "text-lime-ink")}>{t.coaching.lessonPacks}</p>
          <ul className="mt-2 space-y-1.5">
            {packs.map((p) => {
              const pr = packPricing(service.priceCents, p);
              return (
                <li key={p.id}>
                  <LocaleLink
                    href={`/booking?service=${service.slug}&pack=${p.id}`}
                    className={cn("flex items-baseline justify-between gap-3 text-sm hover:underline", featured ? "text-white" : "text-ink")}
                  >
                    <span>
                      {p.lessonsCount} × <span className="tabular font-semibold">{money(pr.perLessonCents)}</span>
                      <span className={cn("ml-1.5 text-xs font-semibold", featured ? "text-lime" : "text-success")}>−{p.discountPercent}%</span>
                    </span>
                    <span className="tabular font-semibold">{money(pr.totalCents)}</span>
                  </LocaleLink>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className={cn("mt-auto flex items-end justify-between gap-4 pt-8", featured ? "border-white/10" : "border-line")}>
        <p>
          <span className="tabular block text-3xl font-bold">{money(service.priceCents)}</span>
          <span className={cn("text-sm", featured ? "text-white/60" : "text-muted")}>{priceUnitLabel(service.pricingUnit, locale)}</span>
        </p>
        <ButtonLink href={`/booking?service=${service.slug}`} variant={featured ? "primary" : "secondary"} arrow aria-label={`${t.coaching.bookThis} ${service.name}`}>
          {t.coaching.bookThis}
        </ButtonLink>
      </div>
    </article>
  );
}
