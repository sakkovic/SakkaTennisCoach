"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { mainNav } from "@/config/nav";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { LocaleLink } from "@/components/i18n/LocaleLink";
import { useI18n } from "@/components/i18n/I18nProvider";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { splitLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import { MobileMenu } from "./MobileMenu";

/** Compares against the path without the "/fr" prefix. */
export function isActivePath(pathname: string, href: string) {
  const { path } = splitLocale(pathname);
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "on-dark fixed inset-x-0 top-0 z-40 text-white transition-[background-color,border-color,backdrop-filter] duration-300",
          scrolled ? "border-b border-white/10 bg-ink/85 backdrop-blur-xl" : "border-b border-transparent bg-transparent",
        )}
      >
        <Container className="flex h-18 items-center justify-between gap-6 md:h-20">
          <Logo />

          <nav aria-label={t.nav.main} className="hidden items-center gap-1 lg:flex">
            {mainNav.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <LocaleLink
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("relative rounded-full px-4 py-2 text-sm font-medium transition-colors", active ? "text-white" : "text-white/70 hover:text-white")}
                >
                  {t.nav[item.key]}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-4 -bottom-0.5 h-0.5 origin-left rounded-full bg-lime transition-transform duration-300",
                      active ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </LocaleLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <ButtonLink href="/booking" size="sm" arrow className="hidden sm:inline-flex md:h-11 md:px-5">
              {t.common.bookLesson}
            </ButtonLink>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10 lg:hidden"
              aria-label={t.nav.openMenu}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <Menu aria-hidden className="size-6" />
            </button>
          </div>
        </Container>
      </header>
      {/* Rendered outside <header> so it isn't trapped in the header's stacking context */}
      <MobileMenu open={menuOpen} onClose={closeMenu} pathname={pathname} />
    </>
  );
}
