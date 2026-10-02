import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { locationLabel, siteConfig } from "@/config/site";
import { imageAlt, images } from "@/content/images";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { CourtLines } from "@/components/ui/CourtLines";
import { getI18n } from "@/lib/i18n/server";

/**
 * Hero with the coach's photo.
 * Mobile: photo full-width on top, text below.
 * Desktop: text on the left over navy, photo on the right ~60% at close to native
 * resolution, fading into the navy on its left, top and bottom edges.
 */
export async function Hero() {
  const { t, locale } = await getI18n();
  return (
    <section className="on-dark relative isolate overflow-hidden bg-ink text-white lg:flex lg:min-h-[100svh] lg:items-center">
      <CourtLines className="absolute inset-0 -z-20 h-full w-full text-white/[0.06]" />

      {/* Photo */}
      <div className="relative pt-16 sm:pt-20 lg:absolute lg:inset-y-0 lg:right-0 lg:flex lg:w-[54%] lg:items-center lg:pt-0 xl:w-[60%]">
        <div className="hero-zoom relative aspect-[5/4] w-full sm:aspect-[910/650]">
          <Image
            src={images.hero.src}
            alt={imageAlt(images.hero, locale)}
            fill
            priority
            sizes="(min-width: 1024px) 62vw, 100vw"
            className="object-cover"
          />
          {/* Fades into the navy background (also softens the corner logos) */}
          <div aria-hidden className="absolute inset-x-0 top-0 h-1/5 bg-gradient-to-b from-ink via-ink/50 to-transparent lg:h-1/3 lg:via-ink/60" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink to-transparent" />
          <div aria-hidden className="absolute inset-y-0 left-0 hidden w-2/5 bg-gradient-to-r from-ink via-ink/70 to-transparent lg:block" />
        </div>
      </div>

      <Container className="relative -mt-10 pb-16 sm:-mt-16 lg:mt-0 lg:pb-24 lg:pt-32">
        <div className="max-w-xl lg:max-w-[44%] xl:max-w-xl">
          <div className="hero-rise" style={{ animationDelay: "150ms" }}>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.24em] text-lime">
              <span aria-hidden className="h-px w-10 bg-lime/70" />
              <span>{t.home.heroEyebrow}</span>
              {siteConfig.location.city && <span className="whitespace-nowrap text-white/60">· {locationLabel(locale)}</span>}
            </p>
          </div>

          <div className="hero-rise" style={{ animationDelay: "230ms" }}>
            <h1 className="mt-5 lg:mt-6">
              <span className="font-display block text-[4.25rem] leading-[0.82] sm:text-[6.5rem] lg:text-[6.25rem] xl:text-[8.5rem]">{siteConfig.brand}</span>
              <span className="font-display mt-3 block text-[1.8rem] leading-none text-white/90 sm:text-5xl lg:text-[2.6rem] xl:text-[3.25rem]">
                {t.meta.role}
              </span>
            </h1>
          </div>

          <div className="hero-rise" style={{ animationDelay: "310ms" }}>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/80 md:text-xl">
              {t.meta.tagline} <span className="text-white/60">{t.meta.subtitle}.</span>
            </p>
          </div>

          <div className="hero-rise" style={{ animationDelay: "390ms" }}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/booking" size="lg" arrow>
                {t.common.bookLesson}
              </ButtonLink>
              <ButtonLink href="/coaching" size="lg" variant="outline-dark">
                {t.common.viewPrograms}
              </ButtonLink>
            </div>
          </div>

          <div className="hero-rise" style={{ animationDelay: "470ms" }}>
            <ul className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70" aria-label={t.home.qualifications}>
              {t.credentials.heroLine.map((item, i) => (
                <li key={item} className="flex items-center gap-4">
                  {i > 0 && <span aria-hidden className="size-1 rounded-full bg-lime" />}
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>

      <a
        href="#intro"
        className="absolute bottom-8 right-8 hidden size-12 items-center justify-center rounded-full border border-white/20 text-white/80 transition-colors hover:border-lime hover:text-lime lg:inline-flex"
        aria-label={t.home.scrollToIntro}
      >
        <ArrowDown aria-hidden className="size-5" />
      </a>
    </section>
  );
}
