import type { Locale } from "./config";
import { en, type Dictionary } from "./dictionaries/en";
import { fr } from "./dictionaries/fr";

export * from "./config";
export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { en, fr };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
