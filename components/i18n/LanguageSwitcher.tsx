"use client";

import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { LOCALE_COOKIE, localizePath, splitLocale, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "./I18nProvider";

const LABELS: Record<Locale, { short: string; long: string }> = {
  en: { short: "EN", long: "English" },
  fr: { short: "FR", long: "Français" },
};

function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * EN / FR toggle. Remembers the choice in a cookie (so "/" doesn't auto-redirect
 * against the visitor's wish) and keeps the current page, query and hash.
 */
export function LanguageSwitcher({ className, variant = "pill" }: { className?: string; variant?: "pill" | "large" }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const { path } = splitLocale(pathname);

  const switchTo = (target: Locale) => {
    if (target === locale) return;
    rememberLocale(target);
    window.location.assign(localizePath(target, path) + window.location.search + window.location.hash);
  };

  return (
    <div role="group" aria-label={t.common.language} className={cn("inline-flex items-center gap-1 rounded-full border border-white/15 p-1", className)}>
      {variant === "large" && <Globe aria-hidden className="ml-2 size-4 text-white/60" />}
      {(Object.keys(LABELS) as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          onClick={() => switchTo(l)}
          aria-pressed={l === locale}
          aria-label={LABELS[l].long}
          className={cn(
            "rounded-full font-semibold transition-colors",
            variant === "large" ? "h-10 px-4 text-sm" : "h-8 px-2.5 text-xs",
            l === locale ? "bg-white text-ink" : "text-white/70 hover:text-white",
          )}
        >
          {variant === "large" ? LABELS[l].long : LABELS[l].short}
        </button>
      ))}
    </div>
  );
}
