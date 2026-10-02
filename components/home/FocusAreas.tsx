import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { focusAreas } from "@/content/coaching";
import { images } from "@/content/images";
import { LocaleLink } from "@/components/i18n/LocaleLink";
import { ButtonLink } from "@/components/ui/Button";
import { Card, IconTile } from "@/components/ui/Card";
import { Container, Section } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getI18n } from "@/lib/i18n/server";

export async function FocusAreas() {
  const { t } = await getI18n();
  const [featured, ...rest] = focusAreas;
  const FeaturedIcon = featured.icon;
  const featuredCopy = t.focusAreas[featured.key];

  return (
    <Section tone="surface" id="services">
      <Container>
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <Reveal>
            <SectionTitle index="02" eyebrow={t.home.services.eyebrow} title={t.home.services.title} lead={t.home.services.lead} />
          </Reveal>
          <Reveal delay={0.1}>
            <ButtonLink href="/coaching" variant="outline" arrow className="shrink-0">
              {t.home.services.allPrograms}
            </ButtonLink>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-3">
          {/* Featured card */}
          <Reveal className="md:col-span-2 lg:col-span-1 lg:row-span-3">
            <LocaleLink
              href={featured.href}
              className="on-dark group relative flex h-full min-h-[22rem] flex-col justify-end overflow-hidden rounded-card bg-ink p-7 text-white md:p-8"
            >
              <Image
                src={images.coachingSession.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                className="-z-0 object-cover opacity-60 transition-transform duration-700 ease-out-quart group-hover:scale-105"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/10" />
              <div className="relative">
                <IconTile icon={FeaturedIcon} tone="dark" />
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-lime">{t.common.featured}</p>
                <h3 className="font-display mt-2 text-5xl leading-none">{featuredCopy.title}</h3>
                <p className="mt-3 max-w-sm text-white/75">{featuredCopy.text}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-lime">
                  {featuredCopy.cta}
                  <ArrowUpRight aria-hidden className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </LocaleLink>
          </Reveal>

          {rest.map((area, i) => {
            const copy = t.focusAreas[area.key];
            return (
              <Reveal key={area.key} index={i}>
                <Card interactive className="group h-full">
                  <LocaleLink href={area.href} className="flex h-full flex-col p-6 md:p-7">
                    <div className="flex items-start justify-between">
                      <IconTile icon={area.icon} />
                      <ArrowUpRight
                        aria-hidden
                        className="size-5 text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
                      />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold">{copy.title}</h3>
                    <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-muted">{copy.text}</p>
                    <span className="mt-5 text-sm font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4">{copy.cta}</span>
                  </LocaleLink>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
