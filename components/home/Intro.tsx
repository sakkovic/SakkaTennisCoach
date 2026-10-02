import Image from "next/image";
import { Check } from "lucide-react";
import { imageAlt, images } from "@/content/images";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Section } from "@/components/ui/Container";
import { SeamCurve } from "@/components/ui/CourtLines";
import { Reveal } from "@/components/ui/Reveal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getI18n } from "@/lib/i18n/server";

export async function Intro() {
  const { t, locale } = await getI18n();
  const copy = t.home.intro;

  return (
    <Section id="intro" className="overflow-hidden">
      <Container className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <Reveal className="relative order-last lg:order-first">
          <div className="relative aspect-[4/5] overflow-hidden rounded-media bg-surface">
            <Image src={images.coachPortrait.src} alt={imageAlt(images.coachPortrait, locale)} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
          </div>
          <SeamCurve className="absolute -bottom-6 -right-4 w-48 text-lime md:-right-10 md:w-64" />
          <div className="absolute bottom-6 left-6 rounded-2xl bg-white/95 px-5 py-4 shadow-lift backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{copy.badgeLabel}</p>
            <p className="font-display mt-1 text-3xl leading-none">{copy.badgeValue}</p>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <SectionTitle
              index="01"
              eyebrow={copy.eyebrow}
              title={
                <>
                  {copy.title1}
                  <br />
                  {copy.title2}
                </>
              }
              lead={copy.lead}
            />
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-ink">{copy.tailoredTo}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {copy.factors.map((item) => (
                <li key={item} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium">
                  <Check aria-hidden className="size-4 text-lime-ink" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.15}>
            <ButtonLink href="/about" variant="secondary" arrow className="mt-10">
              {copy.cta}
            </ButtonLink>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
