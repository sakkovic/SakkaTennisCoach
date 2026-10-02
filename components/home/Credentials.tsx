import Image from "next/image";
import { credentials } from "@/content/credentials";
import { Container, Section } from "@/components/ui/Container";
import { IconTile } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getI18n } from "@/lib/i18n/server";

type Props = { index?: string; tone?: "light" | "surface" };

/** Credentials grid — structure in content/credentials.ts, wording in the dictionaries. */
export async function Credentials({ index = "04", tone = "light" }: Props) {
  const { t } = await getI18n();
  return (
    <Section tone={tone} id="credentials">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <SectionTitle index={index} eyebrow={t.home.credentials.eyebrow} title={t.home.credentials.title} lead={t.home.credentials.lead} />
          </Reveal>

          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
            {credentials.map((c, i) => {
              const copy = t.credentials[c.key];
              return (
                <Reveal as="li" key={c.key} index={i}>
                  <article className="on-dark group relative h-full overflow-hidden rounded-card border border-white/10 bg-ink p-7 text-white">
                    <div aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-lime/10 blur-2xl transition-opacity duration-500 group-hover:opacity-80" />
                    <div className="relative flex items-start justify-between gap-4">
                      {c.logo ? (
                        <Image src={c.logo} alt="" width={48} height={48} className="size-12 rounded-xl bg-white object-contain p-1.5" />
                      ) : (
                        <IconTile icon={c.icon} tone="dark" />
                      )}
                      <span className="font-display tabular text-2xl text-white/20">0{i + 1}</span>
                    </div>
                    <p className="relative mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-lime">{copy.level}</p>
                    <h3 className="relative mt-2 text-xl font-semibold">{copy.title}</h3>
                    {copy.description && <p className="relative mt-2 text-sm leading-relaxed text-muted-dark">{copy.description}</p>}
                  </article>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
