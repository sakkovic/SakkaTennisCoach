import { Award, BadgeCheck, Brain, Globe, type LucideIcon } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/config-types";

/**
 * Coach qualifications. Wording (title, exact level, description) is in the
 * dictionaries under `credentials.<key>` — use the exact wording from each certificate.
 * `logo` can point to an image in /public/images/logos when available.
 */
export type CredentialKey = "itf" | "gptca" | "mental" | "padel";
export const credentials: Array<{ key: CredentialKey; icon: LucideIcon; logo?: string }> = [
  { key: "itf", icon: BadgeCheck },
  { key: "gptca", icon: Award },
  { key: "mental", icon: Brain },
  { key: "padel", icon: Globe },
];

/**
 * Experience statistics. Leave `value` as null until real numbers are provided —
 * the statistics strip is hidden automatically while all values are null.
 */
export type StatKey = keyof Dictionary["credentials"]["stats"];
export const stats: Array<{ key: StatKey; value: string | null }> = [
  { key: "years", value: null },
  { key: "players", value: null },
  { key: "certifications", value: null },
  { key: "tournaments", value: null },
];
