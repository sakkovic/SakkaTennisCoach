"use client";

import { whatsappUrl } from "@/config/site";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/lib/utils/cn";

/**
 * Floating WhatsApp button. Desktop only by default — on mobile WhatsApp lives in the
 * sticky bottom bar; pass `mobile` to show it everywhere.
 */
export function WhatsAppFab({ mobile = false }: { mobile?: boolean }) {
  const { t } = useI18n();
  return (
    <a
      href={whatsappUrl(t.nav.whatsappMessage)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.nav.chatWhatsappAria}
      className={cn(
        "group fixed bottom-6 right-6 z-40 items-center gap-2 rounded-full bg-ink p-1.5 pr-1.5 text-white shadow-lift ring-1 ring-white/10 transition-all duration-300 hover:pr-5",
        mobile ? "flex" : "hidden md:flex",
      )}
    >
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-lime text-ink">
        <WhatsAppIcon className="size-6" />
      </span>
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-300 group-hover:max-w-40 group-hover:opacity-100 group-focus-visible:max-w-40 group-focus-visible:opacity-100">
        {t.nav.chatWhatsapp}
      </span>
    </a>
  );
}
