import { Suspense } from "react";
import { CalendarOff } from "lucide-react";
import { whatsappUrl } from "@/config/site";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { PageHero } from "@/components/layout/PageHero";
import { ButtonAnchor, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { getRepository } from "@/lib/data";
import { isBookingEnabled } from "@/lib/env";
import { addDays, nowInTimeZone } from "@/lib/booking/time";
import { pageMetadata } from "@/lib/seo/metadata";
import { getI18n } from "@/lib/i18n/server";
import { localizePackage, localizeService } from "@/lib/i18n/localize";
import type { Locale } from "@/lib/i18n/config";

export async function generateMetadata() {
  const { locale, t } = await getI18n();
  return pageMetadata({ title: t.meta.titles.booking, description: t.meta.titles.bookingDescription, path: "/booking", locale });
}

// Availability changes constantly — always render fresh.
export const dynamic = "force-dynamic";

async function loadBookingData(locale: Locale) {
  if (!isBookingEnabled) return null;
  try {
    const repo = getRepository();
    const [services, locations, settings, packages] = await Promise.all([repo.listServices(), repo.listLocations(), repo.getSettings(), repo.listPackages()]);
    const today = nowInTimeZone(settings.timezone).date;
    return {
      services: services.filter((s) => s.isBookable).map((s) => localizeService(s, locale)),
      locations,
      packages: packages.map((p) => localizePackage(p, locale)),
      today,
      lastBookable: addDays(today, settings.maxAdvanceDays),
      bookingWindow: { minNoticeHours: settings.minNoticeHours, maxAdvanceDays: settings.maxAdvanceDays },
    };
  } catch (err) {
    console.error("[booking] failed to load data", err);
    return null;
  }
}

export default async function BookingPage() {
  const { locale, t } = await getI18n();
  const b = t.booking;
  const data = await loadBookingData(locale);
  const unavailable = !data || data.services.length === 0 || data.locations.length === 0;

  return (
    <>
      <PageHero
        size="compact"
        eyebrow={b.heroEyebrow}
        title={b.heroTitle}
        lead={b.heroLead}
      />

      {unavailable ? (
        <Container className="py-16 md:py-24">
          <EmptyState
            icon={CalendarOff}
            title={b.unavailableTitle}
            description={b.unavailableText}
            action={
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonAnchor href={whatsappUrl(t.nav.whatsappMessage)} target="_blank" rel="noopener noreferrer" icon={<WhatsAppIcon className="size-5" />}>
                  {b.bookOnWhatsapp}
                </ButtonAnchor>
                <ButtonLink href="/contact" variant="outline">
                  {t.common.contactCoach}
                </ButtonLink>
              </div>
            }
          />
        </Container>
      ) : (
        <Suspense fallback={<WizardFallback label={b.loading} />}>
          <BookingWizard services={data.services} locations={data.locations} packages={data.packages} today={data.today} lastBookable={data.lastBookable} bookingWindow={data.bookingWindow} />
        </Suspense>
      )}
    </>
  );
}

function WizardFallback({ label }: { label: string }) {
  return (
    <Container className="grid gap-3 py-10 sm:grid-cols-2" aria-busy="true" aria-label={label}>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-44 rounded-card" />
      ))}
    </Container>
  );
}
