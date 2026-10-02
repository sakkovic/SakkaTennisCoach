import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { getDictionary, hasLocale, type Locale } from "./index";

/**
 * Locale + dictionary for Server Components under app/[lang] (via next/root-params,
 * so no prop drilling). Not available in Server Actions / Route Handlers — pass the
 * locale explicitly there.
 */
export async function getI18n(): Promise<{ locale: Locale; t: ReturnType<typeof getDictionary> }> {
  const value = await lang();
  if (!hasLocale(value)) notFound();
  return { locale: value, t: getDictionary(value) };
}
