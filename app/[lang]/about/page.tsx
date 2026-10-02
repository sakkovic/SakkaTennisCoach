import Image from "next/image";
import { Quote } from "lucide-react";
import { siteConfig } from "@/config/site";
import { philosophy } from "@/content/coaching";
import { imageAlt, images } from "@/content/images";
import { BookingCTA } from "@/components/home/BookingCTA";
import { Credentials } from "@/components/home/Credentials";
import { PageHero } from "@/components/layout/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { IconTile } from "@/components/ui/Card";
import { Container, Section } from "@/components/ui/Container";
import { CourtLines, SeamCurve } from "@/components/ui/CourtLines";
import { Reveal } from "@/components/ui/Reveal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { pageMetadata } from "@/lib/seo/metadata";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { locale, t } = await getI18n();
  return pageMetadata({ title: t.meta.titles.about, description: t.meta.titles.aboutDescription, path: "/about", locale });
}

export default async function AboutPage() {
  const { locale, t } = await getI18n();
  const a = t.about;
  return (
    <>
      <PageHero eyebrow={a.eyebrow} title={siteConfig.name} lead={a.lead} image={images.coachingSession} />

      {/* Introduction */}
      <Section className="overflow-hidden">
        <Container className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          <Reveal className="relative lg:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-media bg-surface">
              <Image src={images.coachPortrait.src} alt={imageAlt(images.coachPortrait, locale)} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            </div>
            <SeamCurve className="absolute -bottom-6 -left-6 w-56 text-lime" />
          </Reveal>
          <div className="lg:col-span-7">
            <Reveal>
              <SectionTitle index="01" eyebrow={a.introEyebrow} title={a.introTitle} />
            </Reveal>
            <Reveal delay={0.1} className="mt-8 space-y-5 text-base leading-relaxed text-muted md:text-lg">
              {a.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </Reveal>
            <Reveal delay={0.15} className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/booking" arrow>
                {t.common.bookLesson}
              </ButtonLink>
              <ButtonLink href="/contact" variant="outline">
                {t.common.contactCoach}
              </ButtonLink>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Philosophy */}
      <Section tone="dark" className="overflow-hidden">
        <CourtLines className="absolute inset-0 h-full w-full text-white/[0.04]" />
        <Container className="relative">
          <Reveal>
            <SectionTitle tone="dark" index="02" eyebrow={a.philosophyEyebrow} title={a.philosophyTitle} lead={a.philosophyLead} />
          </Reveal>
          <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {philosophy.map((p, i) => (
              <Reveal as="li" key={p.key} index={i} className="rounded-card border border-white/10 bg-navy/60 p-6">
                <IconTile icon={p.icon} tone="dark" />
                <h3 className="mt-6 text-lg font-semibold">{a.pillars[p.key].title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-dark">{a.pillars[p.key].text}</p>
              </Reveal>
            ))}
          </ul>
        </Container>
      </Section>

      <Credentials index="03" />

      {/* Experience */}
      <Section tone="surface">
        <Container className="grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <SectionTitle index="04" eyebrow={a.experienceEyebrow} title={a.experienceTitle} lead={a.experienceLead} />
            <div className="relative mt-10 hidden aspect-[4/3] overflow-hidden rounded-media lg:block">
              <Image src={images.junior.src} alt={imageAlt(images.junior, locale)} fill sizes="40vw" className="object-cover" />
            </div>
          </Reveal>
          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {a.experience.map((e, i) => (
              <Reveal as="li" key={e.title} index={i} className="rounded-card border border-line bg-white p-7 shadow-soft">
                <span className="font-display tabular text-4xl leading-none text-lime-ink">0{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{e.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{e.text}</p>
              </Reveal>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Methodology */}
      <Section>
        <Container>
          <Reveal>
            <SectionTitle index="05" eyebrow={a.methodologyEyebrow} title={a.methodologyTitle} align="center" />
          </Reveal>
          <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
            <span aria-hidden className="absolute left-0 right-0 top-6 hidden h-px bg-line md:block" />
            {a.methodology.map((m, i) => (
              <Reveal as="li" key={m.title} index={i} className="relative">
                <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-ink font-bold text-lime ring-8 ring-white">
                  <span className="tabular text-sm">0{i + 1}</span>
                </span>
                <h3 className="font-display mt-6 text-4xl leading-none">{m.title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{m.text}</p>
              </Reveal>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Player development philosophy */}
      <section className="on-dark relative isolate overflow-hidden bg-ink py-24 text-white md:py-32">
        <Image src={images.forehand.src} alt="" fill sizes="100vw" className="-z-20 object-cover opacity-25" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/90 to-ink/60" />
        <Container className="max-w-4xl">
          <Reveal>
            <Quote aria-hidden className="size-12 text-lime" strokeWidth={1.5} />
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-lime">{a.developmentLabel}</p>
            <blockquote className="font-display mt-6 text-4xl leading-[1] sm:text-5xl md:text-6xl">{locale === "fr" ? `« ${a.developmentQuote} »` : `“${a.developmentQuote}”`}</blockquote>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/75">{a.developmentText}</p>
          </Reveal>
        </Container>
      </section>

      <div className="h-4 bg-white" />
      <BookingCTA />
    </>
  );
}
