import { unstable_rethrow } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { images } from "@/content/images";
import { ProgramCard } from "@/components/coaching/ProgramCard";
import { BookingPolicyCard } from "@/components/booking/BookingPolicy";
import { BookingCTA } from "@/components/home/BookingCTA";
import { PlayerLevels } from "@/components/home/PlayerLevels";
import { PageHero } from "@/components/layout/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Section } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getRepository } from "@/lib/data";
import { isBookingEnabled } from "@/lib/env";
import { formatPrice } from "@/lib/booking/money";
import { packagesFor, packPricing, validityLabel } from "@/lib/booking/packages";
import type { BookingWindow } from "@/lib/booking/policy";
import type { Package, Service } from "@/lib/booking/types";
import { coachJsonLd, JsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import { fill, type Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { localizePackage, localizeService } from "@/lib/i18n/localize";

export async function generateMetadata() {
  const { locale, t } = await getI18n();
  return pageMetadata({ title: t.meta.titles.coaching, description: t.meta.titles.coachingDescription, path: "/coaching", locale });
}

// Prices come from the database; refreshed on admin edits (revalidatePath) and every 5 minutes.
export const revalidate = 300;

type Catalog = { services: Service[]; packages: Package[]; window: BookingWindow | null };

async function loadCatalog(locale: Locale): Promise<Catalog> {
  if (!isBookingEnabled) return { services: [], packages: [], window: null };
  try {
    const repo = getRepository();
    const [services, packages, settings] = await Promise.all([repo.listServices(), repo.listPackages(), repo.getSettings()]);
    return {
      services: services.map((s) => localizeService(s, locale)),
      packages: packages.map((p) => localizePackage(p, locale)),
      window: { minNoticeHours: settings.minNoticeHours, maxAdvanceDays: settings.maxAdvanceDays },
    };
  } catch (err) {
    unstable_rethrow(err); // let Next.js handle its own signals (dynamic rendering, redirects)
    console.error("[coaching] failed to load services", err);
    return { services: [], packages: [], window: null };
  }
}

export default async function CoachingPage() {
  const { locale, t } = await getI18n();
  const c = t.coaching;
  const { services, packages, window } = await loadCatalog(locale);
  const money = (cents: number, currency: string) => formatPrice(cents, currency, locale);
  const featuredService = services[0];

  return (
    <>
      <JsonLd data={coachJsonLd(t, locale, services.map((s) => ({ name: s.name, description: s.shortDescription, priceCents: s.priceCents, currency: s.currency })))} />
      <PageHero
        eyebrow={c.heroEyebrow}
        title={
          <>
            {c.heroTitle1}
            <br />
            {c.heroTitle2}
          </>
        }
        lead={c.heroLead}
        image={images.serve}
      />

      <Section id="programs">
        <Container>
          <Reveal>
            <SectionTitle index="01" eyebrow={c.programsEyebrow} title={c.programsTitle} lead={c.programsLead} />
          </Reveal>

          {services.length === 0 ? (
            <EmptyState
              className="mt-12"
              icon={CalendarClock}
              title={c.emptyTitle}
              description={c.emptyText}
              action={<ButtonLink href="/contact">{t.common.contactCoach}</ButtonLink>}
            />
          ) : (
            <div className="mt-14 grid gap-5 pt-3 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service, i) => (
                <Reveal key={service.id} index={i % 3}>
                  <ProgramCard service={service} packs={packagesFor(packages, service)} featured={i === 0} locale={locale} />
                </Reveal>
              ))}
            </div>
          )}
        </Container>
      </Section>

      {packages.length > 0 && featuredService && (
        <Section tone="surface" id="packs">
          <Container>
            <Reveal>
              <SectionTitle
                index="02"
                eyebrow={c.packsEyebrow}
                title={c.packsTitle}
                lead={c.packsLead}
              />
            </Reveal>
            <ul className="mt-12 grid gap-4 md:grid-cols-2">
              {packages.map((p, i) => {
                const pr = packPricing(featuredService.priceCents, p);
                return (
                  <Reveal as="li" key={p.id} index={i}>
                    <article className={i === packages.length - 1 ? "on-dark relative h-full rounded-card bg-ink p-7 text-white md:p-8" : "relative h-full rounded-card border border-line bg-white p-7 shadow-soft md:p-8"}>
                      <span className="absolute right-6 top-6 rounded-full bg-lime px-3 py-1 text-sm font-bold text-ink">{fill(c.saveTag, { n: p.discountPercent })}</span>
                      <p className="font-display text-7xl leading-none">{p.lessonsCount}</p>
                      <h3 className="mt-2 text-xl font-semibold">{p.name}</h3>
                      <p className={i === packages.length - 1 ? "mt-1 text-sm text-white/70" : "mt-1 text-sm text-muted"}>
                        {p.description || `${p.lessonsCount} ${t.common.lessons} · ${validityLabel(p.validityDays, locale)}`}
                      </p>
                      <p className="mt-6 text-sm">
                        {c.packExample} {featuredService.name}{locale === "fr" ? " :" : ":"}{" "}
                        <span className="tabular font-bold">
                          {p.lessonsCount} × {money(pr.perLessonCents, featuredService.currency)} = {money(pr.totalCents, featuredService.currency)}
                        </span>{" "}
                        <span className={i === packages.length - 1 ? "text-lime" : "font-semibold text-success"}>({c.save} {money(pr.savingsCents, featuredService.currency)})</span>
                      </p>
                      <ButtonLink href={`/booking?service=${featuredService.slug}&pack=${p.id}`} variant={i === packages.length - 1 ? "primary" : "secondary"} arrow className="mt-6">
                        {fill(c.startWithPack, { n: p.lessonsCount })}
                      </ButtonLink>
                    </article>
                  </Reveal>
                );
              })}
            </ul>
          </Container>
        </Section>
      )}

      <PlayerLevels index="03" />

      <Section tone="surface">
        <Container>
          <Reveal>
            <SectionTitle index="04" eyebrow={c.stepsEyebrow} title={c.stepsTitle} align="center" />
          </Reveal>
          <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.steps.map((s, i) => (
              <Reveal as="li" key={s.title} index={i} className="rounded-card border border-line bg-white p-7 shadow-soft">
                <span className="font-display tabular text-5xl leading-none text-lime-ink">0{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{s.text}</p>
              </Reveal>
            ))}
          </ol>
          <div className="mt-12 flex justify-center">
            <ButtonLink href="/booking" size="lg" arrow>
              {t.common.bookLesson}
            </ButtonLink>
          </div>
        </Container>
      </Section>

      {window && (
        <Section id="policy">
          <Container>
            <Reveal>
              <SectionTitle index="05" eyebrow={t.policy.eyebrow} title={t.policy.title} />
            </Reveal>
            <Reveal delay={0.1}>
              <BookingPolicyCard locale={locale} window={window} className="mt-12" />
            </Reveal>
          </Container>
        </Section>
      )}

      <BookingCTA title={c.ctaTitle} text={c.ctaText} primaryLabel={t.common.bookLesson} />
    </>
  );
}
