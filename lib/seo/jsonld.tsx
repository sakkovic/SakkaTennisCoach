import { siteConfig } from "@/config/site";
import { credentials } from "@/content/credentials";
import { images } from "@/content/images";
import { localizePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/config-types";

type OfferInput = { name: string; description?: string | null; priceCents: number; currency: string };

/** Structured data for the coach as a local professional service + person. */
export function coachJsonLd(t: Dictionary, locale: Locale, offers: OfferInput[] = []) {
  const url = siteConfig.url;
  const pageUrl = locale === "en" ? url : `${url}${localizePath(locale, "/")}`;
  const areaServed = siteConfig.location.serviceArea.map((name) => ({ "@type": "City", name }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${url}/#coach`,
        name: siteConfig.name,
        jobTitle: t.meta.role,
        url,
        image: images.coachPortrait.src,
        sameAs: [siteConfig.socials.instagram.url],
        hasCredential: credentials.map((c) => ({
          "@type": "EducationalOccupationalCredential",
          name: t.credentials[c.key].title,
          credentialCategory: t.credentials[c.key].level,
        })),
      },
      {
        "@type": ["LocalBusiness", "ProfessionalService"],
        "@id": `${url}/#business`,
        name: `${siteConfig.name} — ${t.meta.role}`,
        description: t.meta.description,
        url: pageUrl,
        inLanguage: locale,
        image: images.hero.src,
        telephone: siteConfig.contact.phone,
        email: siteConfig.contact.email,
        founder: { "@id": `${url}/#coach` },
        areaServed,
        address: {
          "@type": "PostalAddress",
          addressLocality: siteConfig.location.city,
          addressRegion: siteConfig.location.region || undefined,
          addressCountry: siteConfig.location.country || undefined,
        },
        ...(offers.length > 0 && {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: t.meta.role,
            itemListElement: offers.map((o) => ({
              "@type": "Offer",
              price: (o.priceCents / 100).toFixed(2),
              priceCurrency: o.currency,
              itemOffered: { "@type": "Service", name: o.name, description: o.description ?? undefined },
            })),
          },
        }),
      },
    ],
  };
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here: escape "<" to prevent breaking out of the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
