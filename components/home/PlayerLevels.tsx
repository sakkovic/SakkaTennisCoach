import { playerLevels } from "@/content/coaching";
import { Container, Section } from "@/components/ui/Container";
import { CourtLines } from "@/components/ui/CourtLines";
import { Reveal } from "@/components/ui/Reveal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getI18n } from "@/lib/i18n/server";

export async function PlayerLevels({ index = "03" }: { index?: string }) {
  const { t } = await getI18n();
  return (
    <Section tone="dark" className="overflow-hidden">
      <CourtLines className="absolute inset-0 h-full w-full text-white/[0.04]" />
      <Container className="relative">
        <Reveal>
          <SectionTitle tone="dark" index={index} eyebrow={t.home.levels.eyebrow} title={t.home.levels.title} lead={t.home.levels.lead} />
        </Reveal>

        <ol className="mt-14 grid gap-px overflow-hidden rounded-card bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {playerLevels.map((key, i) => {
            const level = t.levels[key];
            return (
              <Reveal as="li" key={key} index={i} className="group relative bg-ink p-7 transition-colors duration-300 hover:bg-navy md:p-8">
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-lime transition-transform duration-500 ease-out-quart group-hover:scale-x-100" />
                <span className="font-display tabular text-6xl leading-none text-lime">0{i + 1}</span>
                <h3 className="font-display mt-6 text-4xl leading-none">{level.title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-dark">{level.text}</p>
                <ul className="mt-6 space-y-2 border-t border-white/10 pt-5">
                  {level.focus.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/85">
                      <span aria-hidden className="size-1.5 rounded-full bg-lime" />
                      {f}
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </ol>
      </Container>
    </Section>
  );
}
