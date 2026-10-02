import { Mail, MapPin, Phone } from "lucide-react";
import { footerNav } from "@/config/nav";
import { locationLabel, siteConfig, whatsappUrl } from "@/config/site";
import { LocaleLink } from "@/components/i18n/LocaleLink";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { getI18n } from "@/lib/i18n/server";

export async function Footer() {
  const { t, locale } = await getI18n();
  const year = new Date().getFullYear();
  const socialLinks = [
    { label: t.common.instagram, href: siteConfig.socials.instagram.url, icon: InstagramIcon },
    { label: t.common.whatsapp, href: whatsappUrl(t.nav.whatsappMessage), icon: WhatsAppIcon },
  ];

  return (
    <footer className="on-dark relative overflow-hidden bg-ink text-white">
      <div aria-hidden className="h-px bg-gradient-to-r from-transparent via-lime/60 to-transparent" />
      <Container className="relative pb-28 pt-16 md:pb-12 md:pt-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-dark">
              {t.meta.subtitle}. {t.meta.tagline}
            </p>
            <ButtonLink href="/booking" arrow className="mt-8">
              {t.common.bookLesson}
            </ButtonLink>
          </div>

          <nav aria-label={t.footer.navigation} className="md:col-span-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-dark">{t.footer.navigation}</h2>
            <ul className="mt-5 space-y-3">
              {footerNav.map((item) => (
                <li key={item.href}>
                  <LocaleLink href={item.href} className="text-sm text-white/85 transition-colors hover:text-lime">
                    {t.nav[item.key]}
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-dark">{t.footer.contact}</h2>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a href={`tel:${siteConfig.contact.phone}`} className="inline-flex items-center gap-3 text-white/85 hover:text-lime">
                  <Phone aria-hidden className="size-4 text-lime" />
                  <span className="tabular">{siteConfig.contact.phoneDisplay}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${siteConfig.contact.email}`} className="inline-flex items-center gap-3 text-white/85 hover:text-lime">
                  <Mail aria-hidden className="size-4 text-lime" />
                  {siteConfig.contact.email}
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.location.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-3 text-white/85 hover:text-lime"
                  aria-label={`${siteConfig.location.venue}, ${locationLabel(locale)} — ${t.common.openInMaps}`}
                >
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-lime" />
                  <span>
                    {siteConfig.location.venue}
                    <span className="block text-white/60">{locationLabel(locale)}</span>
                  </span>
                </a>
              </li>
            </ul>
            <ul className="mt-6 flex gap-2" aria-label={t.footer.social}>
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex size-11 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:border-lime hover:text-lime"
                  >
                    <Icon className="size-5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p aria-hidden className="font-display text-outline pointer-events-none mt-16 select-none text-[22vw] leading-[0.8] md:text-[15rem]">
          {siteConfig.brand}
        </p>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-muted-dark sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.name} — {t.meta.role}. {t.footer.rights}
          </p>
          <LocaleLink href="/privacy" className="hover:text-white">
            {t.footer.privacy}
          </LocaleLink>
        </div>
      </Container>
    </footer>
  );
}
