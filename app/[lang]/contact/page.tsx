import { ArrowUpRight, CalendarCheck2, Mail, MapPin, Phone } from "lucide-react";
import { locationLabel, siteConfig, whatsappUrl } from "@/config/site";
import { images } from "@/content/images";
import { ContactForm } from "@/components/contact/ContactForm";
import { PageHero } from "@/components/layout/PageHero";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Section } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { pageMetadata } from "@/lib/seo/metadata";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { locale, t } = await getI18n();
  return pageMetadata({ title: t.meta.titles.contact, description: t.meta.titles.contactDescription, path: "/contact", locale });
}

export default async function ContactPage() {
  const { locale, t } = await getI18n();
  const c = t.contact;
  const channels = [
    { label: t.common.whatsapp, value: c.messageDirectly, href: whatsappUrl(t.nav.whatsappMessage), icon: WhatsAppIcon, external: true, featured: true },
    { label: t.common.phone, value: siteConfig.contact.phoneDisplay, href: `tel:${siteConfig.contact.phone}`, icon: Phone },
    { label: t.common.email, value: siteConfig.contact.email, href: `mailto:${siteConfig.contact.email}`, icon: Mail },
    { label: t.common.instagram, value: `@${siteConfig.socials.instagram.handle}`, href: siteConfig.socials.instagram.url, icon: InstagramIcon, external: true },
  ];

  return (
    <>
      <PageHero
        eyebrow={c.heroEyebrow}
        title={c.heroTitle}
        lead={c.heroLead}
        image={images.contact}
        size="compact"
      />

      <Section className="pt-12 md:pt-16">
        <Container className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <Reveal>
              <h2 className="font-display text-5xl leading-none">{c.getInTouch}</h2>
              <p className="mt-4 text-muted">{c.chooseChannel}</p>
            </Reveal>
            <ul className="mt-8 grid gap-3">
              {channels.map(({ label, value, href, icon: Icon, external, featured }, i) => (
                <Reveal as="li" key={label} index={i}>
                  <a
                    href={href}
                    {...(external && { target: "_blank", rel: "noopener noreferrer" })}
                    className={
                      featured
                        ? "on-dark group flex items-center gap-4 rounded-card bg-ink p-5 text-white transition-shadow hover:shadow-lift"
                        : "group flex items-center gap-4 rounded-card border border-line bg-white p-5 shadow-soft transition-[border-color,box-shadow] hover:border-ink/20 hover:shadow-lift"
                    }
                  >
                    <span className={featured ? "inline-flex size-12 items-center justify-center rounded-2xl bg-lime text-ink" : "inline-flex size-12 items-center justify-center rounded-2xl bg-ink text-lime"}>
                      <Icon aria-hidden className="size-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{label}</span>
                      <span className={featured ? "block truncate text-sm text-white/70" : "tabular block truncate text-sm text-muted"}>{value}</span>
                    </span>
                    <ArrowUpRight aria-hidden className="size-5 opacity-60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </a>
                </Reveal>
              ))}
            </ul>

            <Reveal delay={0.2} className="mt-8">
              <a
                href={siteConfig.location.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-card bg-surface p-5 transition-colors hover:bg-sky-50"
              >
                <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-lime-ink" />
                <div className="flex-1">
                  <p className="font-semibold">{siteConfig.location.venue}</p>
                  <p className="text-sm text-muted">{locationLabel(locale)}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4">
                    {t.common.openMaps} <ArrowUpRight aria-hidden className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </p>
                </div>
              </a>
            </Reveal>

            <Reveal delay={0.25} className="mt-4 flex items-start gap-3 rounded-card bg-surface p-5">
              <CalendarCheck2 aria-hidden className="mt-0.5 size-5 shrink-0 text-lime-ink" />
              <div className="flex-1">
                <p className="font-semibold">{c.readyTitle}</p>
                <p className="text-sm text-muted">{c.readyText}</p>
                <ButtonLink href="/booking" size="sm" arrow className="mt-3">
                  {t.common.bookLesson}
                </ButtonLink>
              </div>
            </Reveal>
          </div>

          <Reveal className="lg:col-span-7" delay={0.1}>
            <ContactForm />
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
