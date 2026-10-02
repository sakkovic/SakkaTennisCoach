import Image from "next/image";
import type { ReactNode } from "react";
import type { SiteImage } from "@/content/images";
import { Container } from "@/components/ui/Container";
import { CourtLines } from "@/components/ui/CourtLines";
import { Eyebrow } from "@/components/ui/SectionTitle";
import { cn } from "@/lib/utils/cn";

type Props = {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  image?: SiteImage;
  size?: "default" | "compact";
  children?: ReactNode;
};

/** Dark page header shared by inner pages (the navbar sits on top of it). */
export function PageHero({ eyebrow, title, lead, image, size = "default", children }: Props) {
  return (
    <section
      className={cn(
        "on-dark relative isolate overflow-hidden bg-ink text-white",
        size === "default" ? "pb-16 pt-36 md:pb-24 md:pt-44" : "pb-10 pt-28 md:pb-14 md:pt-36",
      )}
    >
      {image && (
        <>
          <Image src={image.src} alt="" fill priority sizes="100vw" className="-z-20 object-cover object-center opacity-50" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
        </>
      )}
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-ink to-transparent" />
      <CourtLines className="absolute inset-0 -z-10 h-full w-full text-white/[0.06]" />

      <Container>
        <div className="hero-rise max-w-3xl">
          <Eyebrow tone="dark">{eyebrow}</Eyebrow>
          <h1
            className={cn(
              "font-display mt-5 leading-[0.9]",
              size === "default" ? "text-6xl sm:text-7xl lg:text-8xl" : "text-5xl sm:text-6xl",
            )}
          >
            {title}
          </h1>
          {lead && <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">{lead}</p>}
        </div>
        {children}
      </Container>
    </section>
  );
}
