"use client";

import { Mail, MessageSquareText, Phone, User } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { BookingWindow } from "@/lib/booking/policy";
import type { Location, Package, Service } from "@/lib/booking/types";
import type { PlayerDetails } from "@/lib/validation/booking";
import { CancellationNote } from "./BookingPolicy";
import { BookingSummary } from "./BookingSummary";
import { StepHeading } from "./StepHeading";
import type { StepId } from "./steps";

type Props = {
  service: Service;
  location: Location;
  date: string;
  time: string;
  details: PlayerDetails;
  pack: Package | null;
  bookingWindow: BookingWindow;
  onEdit: (step: StepId) => void;
};

export function ReviewStep({ service, location, date, time, details, pack, bookingWindow, onEdit }: Props) {
  const { t, locale } = useI18n();
  const b = t.booking;

  return (
    <div>
      <StepHeading title={b.reviewTitle} text={b.reviewText} />

      <div className="mt-6 grid gap-4">
        <BookingSummary service={service} location={location} date={date} time={time} playersCount={details.playersCount} pack={pack} onEdit={onEdit} />

        <div className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">{b.playerHeading}</h3>
            <button
              type="button"
              onClick={() => onEdit("details")}
              className="rounded-full px-2 py-1 text-sm font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4 hover:bg-surface"
            >
              {b.edit}
              <span className="sr-only"> {b.playerHeading}</span>
            </button>
          </div>
          <ul className="mt-4 space-y-3 text-[0.9375rem]">
            <li className="flex items-center gap-3">
              <User aria-hidden className="size-5 text-muted" strokeWidth={1.75} />
              <span className="font-semibold">
                {details.firstName} {details.lastName}
              </span>
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold ring-1 ring-line">{t.levels[details.playerLevel].title}</span>
            </li>
            <li className="flex items-center gap-3 break-all">
              <Mail aria-hidden className="size-5 shrink-0 text-muted" strokeWidth={1.75} />
              {details.email}
            </li>
            <li className="flex items-center gap-3">
              <Phone aria-hidden className="size-5 text-muted" strokeWidth={1.75} />
              <span className="tabular">{details.phone}</span>
            </li>
            {details.notes && (
              <li className="flex items-start gap-3">
                <MessageSquareText aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" strokeWidth={1.75} />
                <span className="text-muted">{details.notes}</span>
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-card bg-sky-50 p-5 text-sm leading-relaxed text-navy ring-1 ring-sky/40">
          <p className="font-semibold">{b.whatNext}</p>
          <p className="mt-1">{b.whatNextText}</p>
        </div>

        <CancellationNote locale={locale} window={bookingWindow} withPack={pack !== null} accept />
      </div>
    </div>
  );
}
