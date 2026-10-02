/**
 * Central business configuration.
 * Every piece of business information shown on the site comes from here —
 * never hardcode these values inside components.
 *
 * Values marked `TODO` are placeholders until confirmed by the coach.
 */
export const siteConfig = {
  name: "Sami Sakka",
  brand: "SAMI SAKKA",
  role: "Private Tennis Coach",
  tagline: "Train Smarter. Play Better. Compete Stronger.",
  subtitle: "Personalized tennis coaching for every level",
  description:
    "Private tennis lessons and performance coaching with Sami Sakka. Personalized training for beginners to competitive players — technique, tactics, fitness and mental strength. Book your lesson online.",

  /** Public URL. On Vercel without a custom domain, falls back to the project's production address. */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  locale: "en",
  /** IANA timezone the coach works in — drives "today", notice periods and slot times. */
  timezone: "Africa/Tunis",
  currency: "USD", // also stored in coach_settings (Admin → Settings)

  contact: {
    phone: "+21658093366",
    phoneDisplay: "+216 58 093 366",
    whatsapp: "21658093366", // digits only, with country code (used for wa.me links)
    whatsappMessage: "Hi Sami, I'd like to book a tennis lesson.",
    email: "contact@samisakka.com", // TODO
  },

  /**
   * Cancellation rule shown on the booking pages and in emails. The booking
   * window (minimum notice, how far ahead) is set in Admin → Settings.
   */
  policies: {
    cancellationHours: 24,
  },

  socials: {
    instagram: {
      handle: "samisakka", // TODO: confirm handle
      url: "https://www.instagram.com/samisakka", // TODO
    },
  },

  location: {
    /** Shown in the footer, contact page and used for local SEO. */
    venue: "Tennis Club Hammam Sousse",
    city: "Hammam Sousse",
    region: "Sousse",
    country: "TN", // ISO 3166-1 alpha-2
    countryName: "Tunisia",
    countryNameFr: "Tunisie",
    /** Google Maps link — every address on the site opens this */
    mapsUrl: "https://maps.app.goo.gl/ZFQmQ9ox8x2ovXM58",
    serviceArea: ["Hammam Sousse", "Sousse", "Tunisia"],
  },

  seo: {
    keywords: [
      "private tennis coach",
      "tennis lessons",
      "private tennis lessons",
      "tennis coach",
      "tennis training",
      "tennis coaching",
      "competition tennis training",
      "junior tennis coaching",
      "tennis coach Sousse",
      "tennis lessons Hammam Sousse",
      "cours de tennis Sousse",
      "coach de tennis Tunisie",
    ],
    twitterHandle: undefined as string | undefined,
  },
} as const;

export type SiteConfig = typeof siteConfig;

export function whatsappUrl(message: string = siteConfig.contact.whatsappMessage) {
  return `https://wa.me/${siteConfig.contact.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function locationLabel(lang: "en" | "fr" = "en") {
  const { city, countryName, countryNameFr } = siteConfig.location;
  return [city, lang === "fr" ? countryNameFr : countryName].filter(Boolean).join(", ");
}
