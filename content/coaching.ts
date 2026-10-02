import { Activity, Brain, Crosshair, Dumbbell, Gauge, Lightbulb, Route, Swords, Target, Trophy, User, Users, type LucideIcon } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/config-types";

/**
 * Structure of the editorial sections (icons, links, order). All wording lives in
 * lib/i18n/dictionaries/{en,fr}.ts under the matching key. Bookable lesson types
 * (price, duration, players) live in the database.
 */

export type FocusAreaKey = keyof Dictionary["focusAreas"];
export const focusAreas: Array<{ key: FocusAreaKey; icon: LucideIcon; href: string }> = [
  { key: "private", icon: User, href: "/booking?service=private-lesson" },
  { key: "group", icon: Users, href: "/coaching#programs" },
  { key: "technical", icon: Crosshair, href: "/booking" },
  { key: "tactical", icon: Route, href: "/booking" },
  { key: "mental", icon: Brain, href: "/booking" },
  { key: "fitness", icon: Dumbbell, href: "/booking" },
  { key: "competition", icon: Trophy, href: "/booking?service=competition-training" },
];

export type LevelKey = keyof Dictionary["levels"];
export const playerLevels: LevelKey[] = ["beginner", "intermediate", "advanced", "competitive"];

export type WhyKey = keyof Dictionary["whyTrain"];
export const whyTrain: Array<{ key: WhyKey; icon: LucideIcon }> = [
  { key: "personalized", icon: Target },
  { key: "analysis", icon: Gauge },
  { key: "strategy", icon: Swords },
  { key: "fitness", icon: Activity },
  { key: "mental", icon: Brain },
  { key: "competition", icon: Trophy },
];

export type PillarKey = keyof Dictionary["about"]["pillars"];
export const philosophy: Array<{ key: PillarKey; icon: LucideIcon }> = [
  { key: "technical", icon: Crosshair },
  { key: "tactical", icon: Lightbulb },
  { key: "mental", icon: Brain },
  { key: "physical", icon: Dumbbell },
  { key: "match", icon: Trophy },
];
