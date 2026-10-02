import Image from "next/image";
import { Camera, Newspaper, Trophy, type LucideIcon } from "lucide-react";
import { formatDateLong } from "@/lib/booking/time";
import type { JourneyKind, JourneyPost } from "@/lib/booking/types";
import { getDictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";

/** Admin labels (English); public labels come from the dictionaries (journey.kinds). */
export const JOURNEY_KIND_META: Record<JourneyKind, { label: string; icon: LucideIcon }> = {
  achievement: { label: "Achievement", icon: Trophy },
  photo: { label: "On court", icon: Camera },
  news: { label: "News", icon: Newspaper },
};

type Props = {
  post: Pick<JourneyPost, "kind" | "title" | "body" | "imageUrl" | "imageAlt" | "playerName" | "eventName" | "result" | "happenedOn">;
  /** Card width hint for next/image */
  sizes?: string;
  /** Show the full description (gallery page) instead of 2 lines */
  full?: boolean;
  priority?: boolean;
  locale?: Locale;
  className?: string;
};

/**
 * Full-bleed photo card with a navy gradient and the story at the bottom.
 * Achievements get a lime badge and their result in large display type.
 */
export function JourneyCard({ post, sizes = "(min-width: 1024px) 420px, 85vw", full = false, priority = false, locale = "en", className }: Props) {
  const meta = JOURNEY_KIND_META[post.kind];
  const kindLabel = getDictionary(locale).journey.kinds[post.kind];
  const Icon = meta.icon;
  const achievement = post.kind === "achievement";
  const details = [post.playerName, post.eventName].filter(Boolean).join(" · ");

  return (
    <article className={cn("on-dark group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-card bg-navy text-white", className)}>
      {post.imageUrl && (
        <Image
          src={post.imageUrl}
          alt={post.imageAlt || post.title}
          fill
          sizes={sizes}
          priority={priority}
          className="-z-20 object-cover transition-transform duration-700 ease-out-quart group-hover:scale-[1.04] motion-reduce:transition-none"
        />
      )}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/55 to-ink/0" />

      <span
        className={cn(
          "absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider",
          achievement ? "bg-lime text-ink" : "bg-ink/70 text-white ring-1 ring-white/20 backdrop-blur",
        )}
      >
        <Icon aria-hidden className="size-3.5" strokeWidth={2.5} /> {kindLabel}
      </span>

      <div className="p-5 sm:p-6">
        {achievement && post.result && <p className="font-display text-5xl leading-none text-lime sm:text-6xl">{post.result}</p>}
        <h3 className={cn("font-display leading-[0.95]", achievement && post.result ? "mt-1 text-3xl" : "text-4xl")}>{post.title}</h3>
        {details && <p className="mt-2 text-sm font-semibold text-white/90">{details}</p>}
        {post.body && <p className={cn("mt-2 text-sm leading-relaxed text-white/75", !full && "line-clamp-2")}>{post.body}</p>}
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-white/55">
          <time dateTime={post.happenedOn}>{formatDateLong(post.happenedOn, locale)}</time>
        </p>
      </div>
    </article>
  );
}
