"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary, Locale } from "@/lib/i18n/config-types";
import { en } from "@/lib/i18n/dictionaries/en";

type I18n = { locale: Locale; t: Dictionary };

const I18nContext = createContext<I18n | null>(null);

/** Receives only the current language's dictionary from the server (keeps the client bundle small). */
export function I18nProvider({ locale, dictionary, children }: { locale: Locale; dictionary: Dictionary; children: ReactNode }) {
  return <I18nContext.Provider value={{ locale, t: dictionary }}>{children}</I18nContext.Provider>;
}

/** Locale + dictionary in Client Components. Falls back to English outside the public site (admin). */
export function useI18n(): I18n {
  return useContext(I18nContext) ?? { locale: "en", t: en };
}

/** Locale only (null outside the public site). */
export function useOptionalLocale(): Locale | null {
  return useContext(I18nContext)?.locale ?? null;
}
