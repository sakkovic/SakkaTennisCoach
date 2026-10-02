/**
 * Internationalization config.
 * English is served at "/" (no prefix), French at "/fr/…". Internally every public
 * page lives under app/[lang]; proxy.ts rewrites "/coaching" → "/en/coaching".
 */
export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

/** Cookie remembering the visitor's language choice (set by the language switcher). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function hasLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** BCP-47 tag for Intl formatting. */
export function intlLocale(locale: Locale): string {
  return locale === "fr" ? "fr-FR" : "en-GB";
}

/** "/coaching" → "/fr/coaching" for French; unchanged for English. Leaves admin/api/external links alone. */
export function localizePath(locale: Locale, href: string): string {
  if (locale === defaultLocale || !href.startsWith("/") || href.startsWith("//")) return href;
  if (href.startsWith("/admin") || href.startsWith("/api") || href.startsWith("/fr/") || href === "/fr") return href;
  if (href === "/") return "/fr";
  if (href.startsWith("/?") || href.startsWith("/#")) return `/fr${href.slice(1)}`; // "/#intro" → "/fr#intro"
  return `/fr${href}`;
}

/** "/fr/coaching" → { locale: "fr", path: "/coaching" }; "/coaching" → { locale: "en", path: "/coaching" }. */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const match = pathname.match(/^\/(en|fr)(\/.*)?$/);
  if (match) return { locale: match[1] as Locale, path: match[2] || "/" };
  return { locale: defaultLocale, path: pathname || "/" };
}

/** Simple "{name}" interpolation: fill("Hi {name}", { name: "Lina" }). */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (key in values ? String(values[key]) : `{${key}}`));
}
