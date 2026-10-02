import Image from "next/image";
import { images } from "@/content/images";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { CourtLines } from "@/components/ui/CourtLines";
import { Reveal } from "@/components/ui/Reveal";
import { Eyebrow } from "@/components/ui/SectionTitle";
import { getI18n } from "@/lib/i18n/server";

type Props = { title?: string; text?: string; primaryLabel?: string };

/** Large premium call-to-action band. Reused on every public page. */
export async function BookingCTA({ title, text, primaryLabel }: Props) {
  const { t } = await getI18n();
  return (
    <section className="bg-white px-3 py-3 md:px-4 md:py-4">
      <div className="on-dark relative isolate overflow-hidden rounded-[28px] bg-ink text-white">
        <Image src={images.net.src} alt="" fill sizes="100vw" className="-z-20 object-cover opacity-35" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-ink via-ink/85 to-navy/60" />
        <CourtLines className="absolute inset-0 -z-10 h-full w-full text-white/[0.08]" />
        <p aria-hidden className="font-display text-outline pointer-events-none absolute -bottom-6 right-0 -z-10 select-none text-[34vw] leading-none md:text-[18rem]">
          {t.home.cta.watermark}
        </p>

        <Container className="py-20 text-center md:py-28">
          <Reveal>
            <Eyebrow tone="dark" className="justify-center">
              {t.home.cta.eyebrow}
            </Eyebrow>
            <h2 className="font-display mx-auto mt-5 max-w-4xl text-5xl leading-[0.92] sm:text-7xl lg:text-8xl">{title ?? t.home.cta.title}</h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">{text ?? t.home.cta.text}</p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/booking" size="lg" arrow>
                {primaryLabel ?? t.common.bookYourLesson}
              </ButtonLink>
              <ButtonLink href="/contact" size="lg" variant="outline-dark">
                {t.common.contactCoach}
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </div>
    </section>
  );
}
