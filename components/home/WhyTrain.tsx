import { stats } from "@/content/credentials";
import { whyTrain } from "@/content/coaching";
import { Container, Section } from "@/components/ui/Container";
import { IconTile } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getI18n } from "@/lib/i18n/server";

export async function WhyTrain() {
  const { t } = await getI18n();
  const visibleStats = stats.filter((s) => s.value !== null);

  return (
    <Section tone="surface">
      <Container>
        <Reveal>
          <SectionTitle index="05" eyebrow={t.home.why.eyebrow} title={t.home.why.title} align="center" />
        </Reveal>

        {visibleStats.length > 0 && (
          <dl className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-card bg-line md:grid-cols-4">
            {visibleStats.map((s) => (
              <div key={s.key} className="bg-white p-6 text-center">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t.credentials.stats[s.key]}</dt>
                <dd className="font-display tabular mt-2 text-5xl leading-none">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <ul className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {whyTrain.map((item, i) => {
            const copy = t.whyTrain[item.key];
            return (
              <Reveal as="li" key={item.key} index={i} className="flex gap-5">
                <IconTile icon={item.icon} />
                <div>
                  <h3 className="text-lg font-semibold">{copy.title}</h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{copy.text}</p>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
