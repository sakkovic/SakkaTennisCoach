import type { Dictionary } from "@/lib/i18n/config-types";

/** Navigation structure; labels come from the dictionary (`nav.<key>`). Hrefs are localized automatically. */
export type NavKey = keyof Pick<Dictionary["nav"], "home" | "coaching" | "about" | "booking" | "journey" | "contact" | "privacy">;
export type NavItem = { key: NavKey; href: string };

export const mainNav: NavItem[] = [
  { key: "coaching", href: "/coaching" },
  { key: "about", href: "/about" },
  { key: "journey", href: "/journey" },
  { key: "contact", href: "/contact" },
];

export const footerNav: NavItem[] = [
  { key: "coaching", href: "/coaching" },
  { key: "booking", href: "/booking" },
  { key: "about", href: "/about" },
  { key: "journey", href: "/journey" },
  { key: "contact", href: "/contact" },
  { key: "privacy", href: "/privacy" },
];
