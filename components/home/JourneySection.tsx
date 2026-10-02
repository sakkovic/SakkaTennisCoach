import { siteConfig } from "@/config/site";
import { InstagramIcon } from "@/components/ui/BrandIcons";
import { ButtonAnchor, ButtonLink } from "@/components/ui/Button";
import { Container, Section } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { JourneyCard } from "@/components/journey/JourneyCard";
import { JourneyCarousel } from "@/components/journey/JourneyCarousel";
import { getRepository } from "@/lib/data";
import { isBookingEnabled } from "@/lib/env";
import type { JourneyPost } from "@/lib/booking/types";
import { getI18n } from "@/lib/i18n/server";
import { localizeJourneyPost } from "@/lib/i18n/localize";

async function loadPosts(): Promise<JourneyPost[]> {
  if (!isBookingEnabled) return [];
  try {
    return await getRepository().listJourneyPosts({ limit: 10 });
  } catch (err) {
    console.error("[journey] failed to load posts", err);
    return [];
  }
}

/** "Follow the journey" — achievements and moments posted by the coach from the dashboard. */
export async function JourneySection() {
  const { locale, t } = await getI18n();
  const j = t.home.journey;
  const posts = (await loadPosts()).map((p) => localizeJourneyPost(p, locale));
  const { handle, url } = siteConfig.socials.instagram;

  const instagramButton = (
    <ButtonAnchor href={url} target="_blank" rel="noopener noreferrer" variant="outline" icon={<InstagramIcon className="size-5" />} className="shrink-0">
      @{handle}
    </ButtonAnchor>
  );

  return (
    <Section className="overflow-hidden">
      <Container>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <Reveal>
            <SectionTitle
              index="06"
              eyebrow={j.eyebrow}
              title={j.title}
              lead={j.lead}
            />
          </Reveal>
          <Reveal delay={0.1} className="flex flex-wrap gap-2">
            {posts.length > 0 && (
              <ButtonLink href="/journey" variant="secondary" arrow className="shrink-0">
                {t.common.seeAll}
              </ButtonLink>
            )}
            {instagramButton}
          </Reveal>
        </div>

        {posts.length > 0 ? (
          <div className="mt-10">
            <JourneyCarousel label={j.carousel} seeAllHref="/journey">
              {posts.map((post, i) => (
                <JourneyCard key={post.id} post={post} priority={false} locale={locale} sizes={i === 0 ? "(min-width: 1024px) 420px, 85vw" : undefined} />
              ))}
            </JourneyCarousel>
          </div>
        ) : (
          <p className="mt-10 rounded-card border border-dashed border-line bg-surface px-6 py-10 text-center text-muted">
            {j.empty}
          </p>
        )}
      </Container>
    </Section>
  );
}
