"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Mail, Phone, X } from "lucide-react";
import { mainNav } from "@/config/nav";
import { siteConfig, whatsappUrl } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { CourtLines } from "@/components/ui/CourtLines";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { LocaleLink } from "@/components/i18n/LocaleLink";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/lib/utils/cn";
import { isActivePath } from "./Navbar";

type Props = { open: boolean; onClose: () => void; pathname: string };

export function MobileMenu({ open, onClose, pathname }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { t } = useI18n();

  // Close on route change
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t.nav.menu}
          className="on-dark fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ink text-white lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.22 }}
        >
          <CourtLines className="absolute inset-0 h-full w-full text-white/[0.05]" orientation="horizontal" />
          <div className="relative flex h-18 items-center justify-between px-5">
            <Logo />
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-white/10"
              aria-label={t.nav.closeMenu}
            >
              <X aria-hidden className="size-6" />
            </button>
          </div>

          <nav aria-label={t.nav.menu} className="relative flex flex-1 flex-col justify-center px-5 py-8">
            <ul className="space-y-1">
              {[{ key: "home" as const, href: "/" }, ...mainNav].map((item, i) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.05, duration: 0.3 }}
                  >
                    <LocaleLink
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "font-display flex items-center gap-4 py-2 text-5xl leading-none transition-colors",
                        active ? "text-lime" : "text-white hover:text-lime",
                      )}
                    >
                      <span className="w-8 font-sans text-xs font-semibold tracking-[0.2em] text-muted-dark">
                        0{i + 1}
                      </span>
                      {t.nav[item.key]}
                    </LocaleLink>
                  </motion.li>
                );
              })}
            </ul>
          </nav>

          <div className="relative space-y-6 border-t border-white/10 px-5 pb-10 pt-6">
            <ButtonLink href="/booking" size="lg" arrow className="w-full" onClick={onClose}>
              {t.common.bookLesson}
            </ButtonLink>
            <div className="flex justify-center">
              <LanguageSwitcher variant="large" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <a href={whatsappUrl(t.nav.whatsappMessage)} target="_blank" rel="noopener noreferrer" aria-label={t.common.whatsapp} className="inline-flex size-12 items-center justify-center rounded-full border border-white/15 hover:border-lime hover:text-lime">
                <WhatsAppIcon className="size-5" />
              </a>
              <a href={`tel:${siteConfig.contact.phone}`} aria-label={t.common.phone} className="inline-flex size-12 items-center justify-center rounded-full border border-white/15 hover:border-lime hover:text-lime">
                <Phone aria-hidden className="size-5" />
              </a>
              <a href={`mailto:${siteConfig.contact.email}`} aria-label={t.common.email} className="inline-flex size-12 items-center justify-center rounded-full border border-white/15 hover:border-lime hover:text-lime">
                <Mail aria-hidden className="size-5" />
              </a>
              <a href={siteConfig.socials.instagram.url} target="_blank" rel="noopener noreferrer" aria-label={t.common.instagram} className="inline-flex size-12 items-center justify-center rounded-full border border-white/15 hover:border-lime hover:text-lime">
                <InstagramIcon className="size-5" />
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
