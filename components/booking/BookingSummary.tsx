"use client";

import type { ReactNode } from "react";
import { CalendarDays, Clock, MapPin, Package as PackageIcon, Receipt, Timer, Users } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { computePrice, formatPrice } from "@/lib/booking/money";
import { packPricing, validityLabel } from "@/lib/booking/packages";
import { formatDateLong, formatDuration, minutesToTime, timeToMinutes } from "@/lib/booking/time";
import type { Location, Package, Service } from "@/lib/booking/types";
import { fill } from "@/lib/i18n/config";
import { MapLink } from "@/components/ui/MapLink";
import { cn } from "@/lib/utils/cn";
import type { StepId } from "./steps";

type Props = {
  service: Service | null;
  location: Location | null;
  date: string | null;
  time: string | null;
  playersCount: number;
  pack?: Package | null;
  onEdit?: (step: StepId) => void;
  className?: string;
};

function Row({
  icon: Icon,
  label,
  value,
  onEdit,
  notSelected,
  editLabel,
}: {
  icon: typeof Clock;
  label: string;
  value: ReactNode;
  onEdit?: () => void;
  notSelected: string;
  editLabel: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
        <dd className="mt-0.5 font-semibold text-ink">{value ?? <span className="font-normal text-muted/70">{notSelected}</span>}</dd>
      </div>
      {onEdit && value && (
        <button type="button" onClick={onEdit} className="rounded-full px-2 py-1 text-sm font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4 hover:bg-surface">
          {editLabel}
          <span className="sr-only"> {label.toLowerCase()}</span>
        </button>
      )}
    </div>
  );
}

export function totalPrice(service: Service | null, players: number) {
  return service ? computePrice(service.priceCents, service.pricingUnit, players) : null;
}

export function BookingSummary({ service, location, date, time, playersCount, pack = null, onEdit, className }: Props) {
  const { t, locale } = useI18n();
  const s = t.booking.summary;
  const lesson = totalPrice(service, playersCount);
  const pricing = lesson !== null && pack ? packPricing(lesson, pack) : null;
  const total = pricing?.totalCents ?? lesson;
  const end = service && time ? minutesToTime(timeToMinutes(time) + service.durationMin) : null;
  const rowProps = { notSelected: s.notSelected, editLabel: t.booking.edit };

  return (
    <div className={cn("rounded-card border border-line bg-white p-5 shadow-soft sm:p-6", className)}>
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted">
        <Receipt aria-hidden className="size-4" /> {s.title}
      </h2>
      <dl className="mt-2 divide-y divide-line">
        <Row {...rowProps} icon={Users} label={s.lesson} value={service?.name} onEdit={onEdit && (() => onEdit("lesson"))} />
        <Row
          {...rowProps}
          icon={MapPin}
          label={s.location}
          value={location ? <MapLink name={location.name} mapsUrl={location.mapsUrl} label={t.common.openInMaps} /> : null}
          onEdit={onEdit && (() => onEdit("location"))}
        />
        <Row {...rowProps} icon={CalendarDays} label={s.date} value={date ? formatDateLong(date, locale) : null} onEdit={onEdit && (() => onEdit("datetime"))} />
        <Row
          {...rowProps}
          icon={Clock}
          label={s.time}
          value={time && end ? <span className="tabular">{time} – {end}</span> : null}
          onEdit={onEdit && (() => onEdit("datetime"))}
        />
        <Row {...rowProps} icon={Timer} label={s.duration} value={service ? formatDuration(service.durationMin) : null} />
        {service && service.maxPlayers > 1 && <Row {...rowProps} icon={Users} label={s.players} value={String(playersCount)} />}
        {service && (
          <Row
            {...rowProps}
            icon={PackageIcon}
            label={s.plan}
            value={pack ? `${pack.name} · ${pack.lessonsCount} ${t.common.lessons}` : s.singleLesson}
            onEdit={onEdit && (() => onEdit("lesson"))}
          />
        )}
      </dl>
      {pricing && service && pack && (
        <div className="mt-2 space-y-1 border-t border-line pt-4 text-sm">
          <p className="flex justify-between text-muted">
            <span>
              {pack.lessonsCount} × {formatPrice(pricing.perLessonCents, service.currency, locale)}
            </span>
            <span className="tabular line-through">{formatPrice(pricing.fullCents, service.currency, locale)}</span>
          </p>
          <p className="flex justify-between font-semibold text-success">
            <span>{fill(s.packDiscount, { n: pack.discountPercent })}</span>
            <span className="tabular">−{formatPrice(pricing.savingsCents, service.currency, locale)}</span>
          </p>
        </div>
      )}
      <div className="mt-2 flex items-baseline justify-between border-t border-ink/10 pt-4">
        <span className="font-semibold">{pack ? t.booking.packTotal : t.booking.total}</span>
        <span className="tabular text-2xl font-bold">{total !== null && service ? formatPrice(total, service.currency, locale) : "—"}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        {pack ? fill(s.packNote, { n: pack.lessonsCount - 1, validity: validityLabel(pack.validityDays, locale) }) : s.noPayment}
      </p>
    </div>
  );
}
