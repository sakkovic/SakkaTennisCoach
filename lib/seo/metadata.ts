import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { localizePath, type Locale } from "@/lib/i18n/config";

type PageMeta = {
  title: string;
  description: string;
  /** Path without the language prefix, e.g. "/booking" */
  path: string;
  locale?: Locale;
  noIndex?: boolean;
};

/** Per-page metadata with canonical URL, language alternates, OpenGraph and Twitter card. */
export function pageMetadata({ title, description, path, locale = "en", noIndex }: PageMeta): Metadata {
  const url = localizePath(locale, path);
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: { en: path, fr: localizePath("fr", path), "x-default": path },
    },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url,
      siteName: siteConfig.name,
      type: "website",
      locale: locale === "fr" ? "fr_FR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.name}`,
      description,
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}
