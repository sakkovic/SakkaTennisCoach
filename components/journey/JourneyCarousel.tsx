"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { LocaleLink } from "@/components/i18n/LocaleLink";
import { fill } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

const AUTOPLAY_MS = 4500;
/** After a swipe, click or wheel, wait this long before sliding again. */
const RESUME_AFTER_INTERACTION_MS = 8000;
const GAP_PX = 16; // gap-4

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(reducedMotionQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const usePrefersReducedMotion = () =>
  useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(reducedMotionQuery).matches, () => false);

/**
 * Horizontal, swipeable card row (native scroll + snap) that slides on its own.
 * Autoplay pauses while hovered, focused, touched, off-screen or in a hidden tab,
 * and never starts for "reduce motion" users. Side arrows loop around.
 * A final "See all" tile links to the full gallery; after it, the row loops back.
 */
export function JourneyCarousel({ children, label, seeAllHref }: { children: ReactNode[]; label: string; seeAllHref: string }) {
  const { t } = useI18n();
  const j = t.home.journey;
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const playing = !usePrefersReducedMotion();

  // Reasons to hold still for a moment — read inside the timer, so no re-renders.
  const hold = useRef({ hover: false, focus: false, visible: true, interactedAt: 0 });

  const step = useCallback(() => {
    const card = trackRef.current?.querySelector("li");
    return card ? card.getBoundingClientRect().width + GAP_PX : 1;
  }, []);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setActive(Math.min(children.length - 1, Math.round(el.scrollLeft / step())));
  }, [children.length, step]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const resize = new ResizeObserver(update); // also fires once initially
    resize.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    const onScreen = new IntersectionObserver(([entry]) => (hold.current.visible = entry.isIntersecting), { threshold: 0.3 });
    onScreen.observe(el);
    return () => {
      resize.disconnect();
      onScreen.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [update]);

  const scrollTo = useCallback((left: number) => {
    const reduce = window.matchMedia(reducedMotionQuery).matches;
    trackRef.current?.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  }, []);

  /** Previous / next card; wraps around at both ends. */
  const go = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 4;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (direction === 1 && atEnd) scrollTo(0);
    else if (direction === -1 && atStart) scrollTo(el.scrollWidth);
    else scrollTo(el.scrollLeft + direction * step());
  };

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const el = trackRef.current;
      const h = hold.current;
      if (!el || h.hover || h.focus || !h.visible || document.hidden) return;
      if (Date.now() - h.interactedAt < RESUME_AFTER_INTERACTION_MS) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      scrollTo(atEnd ? 0 : el.scrollLeft + step());
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [playing, scrollTo, step]);

  const interacted = () => (hold.current.interactedAt = Date.now());

  const arrow =
    "absolute top-1/2 z-10 inline-flex size-10 -translate-y-[calc(50%+8px)] items-center justify-center rounded-full bg-white/95 text-ink shadow-lift ring-1 ring-ink/10 backdrop-blur transition-[background-color,transform] hover:bg-white active:scale-95 md:size-12";

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => (hold.current.hover = true)}
      onMouseLeave={() => (hold.current.hover = false)}
      onFocusCapture={() => (hold.current.focus = true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hold.current.focus = false;
      }}
    >
      <div className="relative">
        <button type="button" className={cn(arrow, "left-1 md:-left-2")} onClick={() => (interacted(), go(-1))} aria-label={j.previous}>
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <button type="button" className={cn(arrow, "right-1 md:-right-2")} onClick={() => (interacted(), go(1))} aria-label={j.next}>
          <ChevronRight aria-hidden className="size-5" />
        </button>

        <ul
          ref={trackRef}
          aria-live={playing ? "off" : "polite"}
          onPointerDown={interacted}
          onWheel={interacted}
          onTouchStart={interacted}
          className={cn(
            "-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-4 md:-mx-8 md:scroll-px-8 md:px-8",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {children.map((child, i) => (
            <li
              key={i}
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${children.length}`}
              className="w-[82%] shrink-0 snap-start sm:w-[55%] md:w-[42%] lg:w-[400px] xl:w-[420px]"
            >
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
              <span className="font-display text-3xl leading-none">{j.seeAllMoments}</span>
            </LocaleLink>
          </li>
        </ul>
      </div>

      {children.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {children.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => (interacted(), scrollTo(i * step()))}
              aria-label={fill(j.goTo, { n: i + 1 })}
              aria-current={i === active ? "true" : undefined}
              className="group flex h-6 items-center px-0.5"
            >
              <span className={cn("block h-1.5 rounded-full transition-all duration-300", i === active ? "w-6 bg-ink" : "w-1.5 bg-ink/20 group-hover:bg-ink/40")} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
