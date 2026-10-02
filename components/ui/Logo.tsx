"use client";

import { siteConfig } from "@/config/site";
import { LocaleLink } from "@/components/i18n/LocaleLink";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/lib/utils/cn";
import { BallMark } from "./BrandIcons";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <LocaleLink href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label={t.nav.homeLink}>
      <BallMark className="size-7 text-lime transition-transform duration-500 ease-out-quart group-hover:rotate-[160deg]" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.6rem] leading-none tracking-[0.04em]">{siteConfig.brand}</span>
        {!compact && (
          <span className="mt-0.5 whitespace-nowrap text-[0.625rem] font-semibold uppercase tracking-[0.24em] opacity-70">{t.meta.role}</span>
        )}
      </span>
    </LocaleLink>
  );
}
