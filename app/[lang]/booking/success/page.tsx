import { notFound } from "next/navigation";
import { CalendarCheck2, Check, Clock, MapPin, Timer, Users } from "lucide-react";
import { whatsappUrl } from "@/config/site";
import { ButtonAnchor, ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MapLink } from "@/components/ui/MapLink";
import { Container } from "@/components/ui/Container";
import { CourtLines } from "@/components/ui/CourtLines";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { getRepository } from "@/lib/data";
import { formatPrice } from "@/lib/booking/money";
import { formatDateLong, formatDuration } from "@/lib/booking/time";
import { pageMetadata } from "@/lib/seo/metadata";
import { CancellationNote } from "@/components/booking/BookingPolicy";
import { getI18n } from "@/lib/i18n/server";
import { fill } from "@/lib/i18n/config";
import { localizePackage, localizeService } from "@/lib/i18n/localize";

export async function generateMetadata() {
  const { locale, t } = await getI18n();
  return pageMetadata({ title: t.meta.titles.success, description: t.booking.success.title, path: "/booking/success", locale, noIndex: true });
}

export default async function BookingSuccessPage({ searchParams }: PageProps<"/[lang]/booking/success">) {
  const { ref } = await searchParams;
  const reference = typeof ref === "string" && /^SSK-[A-Z0-9]{6}$/i.test(ref) ? ref : null;
  if (!reference) notFound();

  const { locale, t } = await getI18n();
  const ok = t.booking.success;
  const sum = t.booking.summary;
  const repo = getRepository();
  const [booking, locations, services, packages, settings] = await Promise.all([
    repo.getBookingSummary(reference),
    repo.listLocations({ includeInactive: true }),
    repo.listServices({ includeInactive: true }),
    repo.listPackages({ includeInactive: true }),
    repo.getSettings(),
  ]);
  if (!booking) notFound();
  const mapsUrl = locations.find((l) => l.name === booking.locationName)?.mapsUrl ?? null;
  // The summary stores English names; show the visitor's language when a translation exists.
  const service = services.find((s) => s.name === booking.serviceName);
  const serviceName = service ? localizeService(service, locale).name : booking.serviceName;
  const pkg = booking.package ? packages.find((p) => p.name === booking.package?.name) : undefined;
  const packName = pkg ? localizePackage(pkg, locale).name : booking.package?.name;
  const money = (cents: number) => formatPrice(cents, booking.currency, locale);

  return (
    <section className="on-dark relative isolate overflow-hidden bg-ink pb-24 pt-32 text-white md:pt-40">
      <CourtLines className="absolute inset-0 -z-10 h-full w-full text-white/[0.05]" />
      <Container className="max-w-3xl">
        <div className="hero-rise text-center">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-lime text-ink shadow-glow">
            <Check aria-hidden className="size-8" strokeWidth={3} />
          </span>
          <h1 className="font-display mt-8 text-5xl leading-[0.92] sm:text-6xl md:text-7xl">{ok.title}</h1>
          <p className="mx-auto mt-5 max-w-lg text-white/75">
            {ok.text}
          </p>
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-white/70">
            {ok.reference} <span className="tabular rounded-full bg-white/10 px-3 py-1 font-semibold text-white">{booking.reference}</span>
          </p>
        </div>

        <div className="hero-rise mt-12 rounded-card bg-white p-6 text-ink sm:p-8" style={{ animationDelay: "120ms" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{serviceName}</h2>
            <Badge tone="warning">
              <Clock aria-hidden className="size-3.5" /> {ok.awaiting}
            </Badge>
          </div>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            {[
              { icon: CalendarCheck2, label: sum.date, value: formatDateLong(booking.date, locale) },
              { icon: Clock, label: sum.time, value: `${booking.startTime} – ${booking.endTime}` },
              { icon: MapPin, label: sum.location, value: <MapLink name={booking.locationName} mapsUrl={mapsUrl} label={t.common.openInMaps} /> },
              { icon: Timer, label: sum.duration, value: formatDuration(booking.durationMin) },
              ...(booking.playersCount > 1 ? [{ icon: Users, label: sum.players, value: String(booking.playersCount) }] : []),
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex gap-3">
                <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" strokeWidth={1.75} />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
                  <dd className="tabular mt-0.5 font-semibold">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
          {booking.package ? (
            <div className="mt-6 space-y-2 border-t border-line pt-5">
              <p className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-bold text-ink">−{booking.package.discountPercent}%</span>
                  {packName}
                </span>
                <span className="tabular text-2xl font-bold">{money(booking.package.totalCents ?? booking.priceCents)}</span>
              </p>
              <p className="text-sm text-muted">
                {fill(ok.packNote, { n: booking.package.lessons, price: money(booking.priceCents), rest: booking.package.lessons - 1 })}
              </p>
            </div>
          ) : (
            <div className="mt-6 flex items-baseline justify-between border-t border-line pt-5">
              <span className="font-semibold">{ok.price}</span>
              <span className="tabular text-2xl font-bold">{money(booking.priceCents)}</span>
            </div>
          )}
        </div>

        <CancellationNote locale={locale} window={settings} withPack={booking.package !== null} tone="dark" className="mt-6" />

        <ol className="mt-10 grid gap-3 sm:grid-cols-3">
          {ok.next.map((text, i) => (
            <li key={text} className="flex items-center gap-3 rounded-2xl border border-white/10 p-4 text-sm text-white/85">
              <span className="font-display tabular text-3xl leading-none text-lime">0{i + 1}</span>
              {text}
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/" size="lg">
            {t.common.backHome}
          </ButtonLink>
          <ButtonAnchor href={whatsappUrl(fill(ok.whatsappText, { ref: booking.reference }))} target="_blank" rel="noopener noreferrer" size="lg" variant="outline-dark" icon={<WhatsAppIcon className="size-5" />}>
            {ok.messageCoach}
          </ButtonAnchor>
        </div>
      </Container>
    </section>
  );
}
