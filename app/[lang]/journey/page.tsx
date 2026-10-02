import { unstable_rethrow } from "next/navigation";
import { ImageOff } from "lucide-react";
import { siteConfig } from "@/config/site";
import { images } from "@/content/images";
import { BookingCTA } from "@/components/home/BookingCTA";
import { JourneyCard } from "@/components/journey/JourneyCard";
import { LocaleLink } from "@/components/i18n/LocaleLink";
import { PageHero } from "@/components/layout/PageHero";
import { InstagramIcon } from "@/components/ui/BrandIcons";
import { ButtonAnchor } from "@/components/ui/Button";
import { Container, Section } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { getRepository } from "@/lib/data";
import { isBookingEnabled } from "@/lib/env";
import { JOURNEY_KINDS, type JourneyKind, type JourneyPost } from "@/lib/booking/types";
import { pageMetadata } from "@/lib/seo/metadata";
import { getI18n } from "@/lib/i18n/server";
import { localizeJourneyPost } from "@/lib/i18n/localize";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const { locale, t } = await getI18n();
  return pageMetadata({ title: t.meta.titles.journey, description: t.meta.titles.journeyDescription, path: "/journey", locale });
}

async function loadPosts(): Promise<JourneyPost[]> {
  if (!isBookingEnabled) return [];
  try {
    return await getRepository().listJourneyPosts();
  } catch (err) {
    unstable_rethrow(err); // let Next.js handle its own signals (dynamic rendering, redirects)
    console.error("[journey] failed to load posts", err);
    return [];
  }
}

export default async function JourneyPage({ searchParams }: PageProps<"/[lang]/journey">) {
  const { locale, t } = await getI18n();
  const j = t.journey;
  const filters: Array<{ value: JourneyKind | "all"; label: string }> = [
    { value: "all", label: j.all },
    { value: "achievement", label: j.achievements },
    { value: "photo", label: j.kinds.photo },
    { value: "news", label: j.news },
  ];
  const sp = await searchParams;
  const filter = (JOURNEY_KINDS as readonly string[]).includes(String(sp.type)) ? (sp.type as JourneyKind) : "all";
  const all = (await loadPosts()).map((p) => localizeJourneyPost(p, locale));
  const posts = filter === "all" ? all : all.filter((p) => p.kind === filter);

  return (
    <>
      <PageHero
        eyebrow={j.heroEyebrow}
        title={
          <>
            {j.heroTitle1}
            <br />
            {j.heroTitle2}
          </>
        }
        lead={j.heroLead}
        image={images.hero}
        size="compact"
      />

      <Section className="pt-10 md:pt-14">
        <Container>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <nav aria-label={j.filter} className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filters.map((f) => (
                <LocaleLink
                  key={f.value}
                  href={f.value === "all" ? "/journey" : `/journey?type=${f.value}`}
                  scroll={false}
                  aria-current={filter === f.value ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors",
                    filter === f.value ? "bg-ink text-white" : "bg-surface text-muted hover:text-ink",
                  )}
                >
                  {f.label}
                </LocaleLink>
              ))}
            </nav>
            <ButtonAnchor
              href={siteConfig.socials.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              size="sm"
              icon={<InstagramIcon className="size-4" />}
            >
              {j.followInstagram}
            </ButtonAnchor>
          </div>

          {posts.length === 0 ? (
            <EmptyState className="mt-10" icon={ImageOff} title={j.emptyTitle} description={j.emptyText} />
          ) : (
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <Reveal as="li" key={post.id} index={i % 3}>
                  <JourneyCard post={post} full locale={locale} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
                </Reveal>
              ))}
            </ul>
          )}
        </Container>
      </Section>

      <BookingCTA title={j.ctaTitle} />
    </>
  );
}
