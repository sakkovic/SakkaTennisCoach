import type { JourneyPost, Package, Service } from "@/lib/booking/types";
import type { Locale } from "./config";

/**
 * Database content in the visitor's language. French fields are optional —
 * anything the coach hasn't translated falls back to English.
 */
export function localizeService(s: Service, locale: Locale): Service {
  if (locale !== "fr") return s;
  return {
    ...s,
    name: s.nameFr || s.name,
    shortDescription: s.shortDescriptionFr || s.shortDescription,
    description: s.descriptionFr || s.description,
    bestFor: s.bestForFr || s.bestFor,
    includes: s.includesFr.length > 0 ? s.includesFr : s.includes,
  };
}

export function localizePackage(p: Package, locale: Locale): Package {
  if (locale !== "fr") return p;
  return { ...p, name: p.nameFr || p.name, description: p.descriptionFr || p.description };
}

export function localizeJourneyPost(p: JourneyPost, locale: Locale): JourneyPost {
  if (locale !== "fr") return p;
  return { ...p, title: p.titleFr || p.title, body: p.bodyFr || p.body, result: p.resultFr || p.result };
}
