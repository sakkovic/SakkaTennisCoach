import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { locales, localizePath } from "@/lib/i18n/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{ path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }> = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/booking", priority: 0.9, changeFrequency: "weekly" },
    { path: "/coaching", priority: 0.9, changeFrequency: "monthly" },
    { path: "/about", priority: 0.7, changeFrequency: "monthly" },
    { path: "/journey", priority: 0.7, changeFrequency: "weekly" },
    { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  ];
  const url = (path: string) => `${siteConfig.url}${path === "/" ? "" : path}`;

  // One entry per language, each listing its translations (hreflang).
  return routes.flatMap((r) =>
    locales.map((locale) => ({
      url: url(localizePath(locale, r.path)),
      lastModified: new Date(),
      changeFrequency: r.changeFrequency,
      priority: r.priority,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, url(localizePath(l, r.path))])) },
    })),
  );
}
