"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { localizePath } from "@/lib/i18n/config";
import { useOptionalLocale } from "./I18nProvider";

/**
 * Drop-in replacement for next/link that keeps visitors in their language:
 * "/coaching" becomes "/fr/coaching" on the French site. Admin/API/external links are untouched.
 */
export function LocaleLink({ href, ...props }: ComponentProps<typeof Link>) {
  const locale = useOptionalLocale();
  const target = locale && typeof href === "string" ? localizePath(locale, href) : href;
  return <Link href={target} {...props} />;
}
