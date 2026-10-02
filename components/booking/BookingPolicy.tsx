import { CalendarClock, CircleAlert, MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/config/site";
import { policyText, type BookingWindow } from "@/lib/booking/policy";
import { getDictionary, type Locale } from "@/lib/i18n";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { ButtonAnchor, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

type Props = { locale: Locale; window: BookingWindow; className?: string };

/** Full policy card (coaching page): booking window + cancellation, with contact buttons. */
export function BookingPolicyCard({ locale, window, className }: Props) {
  const t = getDictionary(locale);
  const text = policyText(t, window);
  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      <div className="rounded-card border border-line bg-white p-7 shadow-soft">
        <CalendarClock aria-hidden className="size-7 text-lime-ink" strokeWidth={1.75} />
        <h3 className="mt-4 text-lg font-semibold">{t.policy.windowTitle}</h3>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{text.window}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonAnchor href={whatsappUrl(t.policy.whatsappMessage)} target="_blank" rel="noopener noreferrer" size="sm" icon={<WhatsAppIcon className="size-4" />}>
            {t.policy.whatsapp}
          </ButtonAnchor>
          <ButtonLink href="/contact" size="sm" variant="outline">
            {t.policy.contactCoach}
          </ButtonLink>
        </div>
      </div>
      <div className="rounded-card border border-line bg-white p-7 shadow-soft">
        <CircleAlert aria-hidden className="size-7 text-lime-ink" strokeWidth={1.75} />
        <h3 className="mt-4 text-lg font-semibold">{t.policy.cancellationTitle}</h3>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{text.cancellation}</p>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{text.packNote}</p>
      </div>
    </div>
  );
}

/** Booking-window hint under the calendar: outside the window, contact the coach. */
export function BookingWindowNote({ locale, window, className }: Props) {
  const t = getDictionary(locale);
  return (
    <div className={cn("flex flex-col gap-3 rounded-card bg-surface p-4 text-sm leading-relaxed sm:flex-row sm:items-center sm:justify-between", className)}>
      <p className="flex gap-2.5 text-muted">
        <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-ink" />
        {policyText(t, window).window}
      </p>
      <a
        href={whatsappUrl(t.policy.whatsappMessage)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4"
      >
        <MessageCircle aria-hidden className="size-4" /> {t.policy.contactCoach}
      </a>
    </div>
  );
}

/** Cancellation rule shown before confirming and after booking. */
export function CancellationNote({ locale, window, withPack = false, accept = false, tone = "light", className }: Props & { withPack?: boolean; accept?: boolean; tone?: "light" | "dark" }) {
  const t = getDictionary(locale);
  const text = policyText(t, window);
  return (
    <div className={cn("rounded-card p-5 text-sm leading-relaxed", tone === "dark" ? "border border-white/10 text-white/80" : "bg-surface text-muted", className)}>
      <p className={cn("flex items-center gap-2 font-semibold", tone === "dark" ? "text-white" : "text-ink")}>
        <CircleAlert aria-hidden className="size-4" /> {t.policy.cancellationTitle}
      </p>
      <p className="mt-1">
        {text.cancellation}
        {withPack && ` ${text.packNote}`}
      </p>
      {accept && <p className={cn("mt-2 font-medium", tone === "dark" ? "text-white" : "text-ink")}>{t.policy.accept}</p>}
    </div>
  );
}
