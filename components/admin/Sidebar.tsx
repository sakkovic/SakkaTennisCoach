"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils/cn";
import { adminNav } from "./nav";

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {adminNav.map(({ label, href, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                active ? "bg-lime text-ink" : "text-white/75 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon aria-hidden className="size-[18px]" strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Footer({ email, demo }: { email: string; demo: boolean }) {
  return (
    <div className="space-y-1 border-t border-white/10 pt-4">
      {demo && <p className="mb-3 rounded-lg bg-lime/10 px-3 py-2 text-xs text-lime">Demo mode — data resets when the server restarts.</p>}
      <Link href="/" target="_blank" className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-white/70 hover:bg-white/5 hover:text-white">
        <ExternalLink aria-hidden className="size-[18px]" strokeWidth={1.75} /> View website
      </Link>
      <form action={signOutAction}>
        <button type="submit" className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-white/70 hover:bg-white/5 hover:text-white">
          <LogOut aria-hidden className="size-[18px]" strokeWidth={1.75} /> Sign out
        </button>
      </form>
      <p className="truncate px-3 pt-2 text-xs text-muted-dark" title={email}>
        {email}
      </p>
    </div>
  );
}

export function Sidebar({ email, demo }: { email: string; demo: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="on-dark fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink px-4 py-6 text-white lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav aria-label="Admin" className="mt-10 flex-1">
          <NavLinks pathname={pathname} />
        </nav>
        <Footer email={email} demo={demo} />
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="on-dark sticky top-0 z-30 flex h-16 items-center justify-between bg-ink px-4 text-white lg:hidden">
        <Logo compact />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open admin menu"
          aria-expanded={open}
          className="inline-flex size-11 items-center justify-center rounded-full hover:bg-white/10"
        >
          <Menu aria-hidden className="size-6" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="on-dark absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-ink px-4 py-5 text-white shadow-lift">
            <div className="flex items-center justify-between px-2">
              <Logo compact />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-white/10">
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <nav aria-label="Admin" className="mt-8 flex-1 overflow-y-auto">
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            </nav>
            <Footer email={email} demo={demo} />
          </div>
        </div>
      )}
    </>
  );
}
