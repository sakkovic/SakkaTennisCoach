import type { PricingUnit } from "./types";

/** "$60" in English, "60 $" in French (narrow symbol, French number formatting). */
export function formatPrice(cents: number, currency: string, lang: "en" | "fr" = "en"): string {
  return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    currencyDisplay: lang === "fr" ? "narrowSymbol" : "symbol",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Total price for a booking, as snapshotted on the booking row. */
export function computePrice(priceCents: number, unit: PricingUnit, players: number): number {
  return unit === "per_player" ? priceCents * players : priceCents;
}

export function priceUnitLabel(unit: PricingUnit, lang: "en" | "fr" = "en"): string {
  if (lang === "fr") return unit === "per_player" ? "par joueur" : "par séance";
  return unit === "per_player" ? "per player" : "per session";
}
