"use client";

import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { useI18n } from "@/components/i18n/I18nProvider";
import { whatsappUrl } from "@/config/site";
import { splitLocale } from "@/lib/i18n/config";

/**
 * Mobile-only bottom bar: primary "Book Lesson" CTA + WhatsApp.
 * Hidden inside the booking flow (it has its own sticky actions).
 */
export function StickyMobileCTA() {
  const pathname = usePathname();
  const { t } = useI18n();
  if (splitLocale(pathname).path.startsWith("/booking")) return null;

  return (
    <div className="on-dark safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/90 px-4 pt-3 backdrop-blur-xl md:hidden">
      <div className="flex items-center gap-3">
        <ButtonLink href="/booking" arrow className="h-12 flex-1">
          {t.common.bookLessonShort}
        </ButtonLink>
        <a
          href={whatsappUrl(t.nav.whatsappMessage)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t.nav.chatWhatsappAria}
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-lime hover:text-lime"
        >
          <WhatsAppIcon className="size-6" />
        </a>
      </div>
    </div>
  );
}
