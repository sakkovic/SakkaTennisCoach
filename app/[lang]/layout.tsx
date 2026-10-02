import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { RootDocument, rootViewport } from "@/components/layout/RootDocument";
import { StickyMobileCTA } from "@/components/layout/StickyMobileCTA";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { siteConfig } from "@/config/site";
import { getDictionary, hasLocale, locales } from "@/lib/i18n";

/** Root layout of the public website, one per language (/ = English, /fr = French). */
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport = rootViewport;

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang);
  const title = `${siteConfig.name} — ${t.meta.role}`;
  const home = lang === "fr" ? "/fr" : "/";
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: title, template: `%s | ${siteConfig.name}` },
    description: t.meta.description,
    keywords: [...siteConfig.seo.keywords],
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.name,
    alternates: { canonical: home, languages: { en: "/", fr: "/fr", "x-default": "/" } },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title,
      description: t.meta.description,
      url: home,
      locale: lang === "fr" ? "fr_FR" : "en_US",
      alternateLocale: lang === "fr" ? ["en_US"] : ["fr_FR"],
    },
    twitter: { card: "summary_large_image", title, description: t.meta.description, creator: siteConfig.seo.twitterHandle },
    robots: { index: true, follow: true },
    formatDetection: { telephone: false },
  };
}

export default async function SiteRootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <RootDocument lang={lang} skipLabel={t.common.skipToContent}>
      <I18nProvider locale={lang} dictionary={t}>
        <Navbar />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer />
        <StickyMobileCTA />
        <WhatsAppFab />
      </I18nProvider>
    </RootDocument>
  );
}
