"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { LocaleLink } from "@/components/i18n/LocaleLink";
import { cn } from "@/lib/utils/cn";

/**
 * Horizontal, swipeable card row (native scroll + snap — no JS needed to swipe).
 * Desktop gets arrow buttons; a final "See all" tile links to the full gallery.
 */
export function JourneyCarousel({ children, label, seeAllHref }: { children: ReactNode[]; label: string; seeAllHref: string }) {
  const { t } = useI18n();
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(update); // also fires once initially
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [update]);

  const scroll = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth * 0.8;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * step, behavior: reduce ? "auto" : "smooth" });
  };

  const arrow = "inline-flex size-12 items-center justify-center rounded-full border border-line bg-white text-ink shadow-soft transition-[opacity,background-color] hover:bg-surface disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label}>
      <div className="mb-5 hidden justify-end gap-2 md:flex">
        <button type="button" className={arrow} onClick={() => scroll(-1)} disabled={edges.start} aria-label={t.home.journey.previous}>
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <button type="button" className={arrow} onClick={() => scroll(1)} disabled={edges.end} aria-label={t.home.journey.next}>
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>

      <ul
        ref={trackRef}
        className={cn(
          "-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-4 md:-mx-8 md:scroll-px-8 md:px-8",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {children.map((child, i) => (
          <li key={i} className="w-[82%] shrink-0 snap-start sm:w-[55%] md:w-[42%] lg:w-[400px] xl:w-[420px]">
            {child}
          </li>
        ))}
        <li className="w-[60%] shrink-0 snap-start sm:w-[40%] lg:w-[280px]">
          <LocaleLink
            href={seeAllHref}
            className="group flex aspect-[4/5] h-full flex-col items-center justify-center gap-4 rounded-card border-2 border-dashed border-line bg-surface p-6 text-center transition-colors hover:border-ink/30"
          >
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-ink text-lime transition-transform group-hover:translate-x-1">
              <ArrowRight aria-hidden className="size-6" />
            </span>
            <span className="font-display text-3xl leading-none">{t.home.journey.seeAllMoments}</span>
          </LocaleLink>
        </li>
      </ul>
    </div>
  );
}
