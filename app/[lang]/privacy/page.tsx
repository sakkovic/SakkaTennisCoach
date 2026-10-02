import { siteConfig } from "@/config/site";
import { PageHero } from "@/components/layout/PageHero";
import { Container } from "@/components/ui/Container";
import { pageMetadata } from "@/lib/seo/metadata";
import { fill } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { locale, t } = await getI18n();
  return pageMetadata({ title: t.meta.titles.privacy, description: t.meta.titles.privacyDescription, path: "/privacy", locale });
}

/**
 * TEMPLATE — have this reviewed for the coach's jurisdiction (e.g. GDPR) before launch.
 */
export default async function PrivacyPage() {
  const { t } = await getI18n();
  const p = t.privacy;
  const sections = p.sections.map((s) => ({ title: s.title, body: fill(s.body, { email: siteConfig.contact.email }) }));

  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} size="compact" />
      <Container className="max-w-3xl py-16 md:py-24">
        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl font-semibold">{s.title}</h2>
              <p className="mt-3 leading-relaxed text-muted">{s.body}</p>
            </section>
          ))}
          <p className="border-t border-line pt-6 text-sm text-muted">
            {p.questions}{" "}
            <a className="font-medium text-ink underline" href={`mailto:${siteConfig.contact.email}`}>
              {siteConfig.contact.email}
            </a>
            .
          </p>
        </div>
      </Container>
    </>
  );
}
