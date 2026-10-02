import { NextResponse, type NextRequest } from "next/server";
import { DEMO_ADMIN_COOKIE, isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { defaultLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * 1. /admin — optimistic auth guard (real check happens server-side in requireAdmin()).
 * 2. Public site — language routing:
 *    - "/fr/…"          → French pages (app/[lang] with lang = "fr")
 *    - "/…"             → English, rewritten internally to "/en/…" (URL stays clean)
 *    - "/en/…"          → redirected to "/…" (one canonical English URL)
 *    - first visit to "/…" with a French browser and no saved choice → redirected to "/fr/…"
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return adminGuard(request);
  return localeRouting(request);
}

function localeRouting(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/fr" || pathname.startsWith("/fr/")) return NextResponse.next();

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!saved && prefersFrench(request.headers.get("accept-language"))) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/fr" : `/fr${pathname}`;
    const response = NextResponse.redirect(url, 307);
    response.headers.set("Vary", "Accept-Language");
    return response;
  }
  if (saved === "fr") {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/fr" : `/fr${pathname}`;
    return NextResponse.redirect(url, 307);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale satisfies Locale}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

/** True when French is ranked above English in Accept-Language. */
function prefersFrench(header: string | null): boolean {
  if (!header) return false;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().slice(0, 2), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  const first = ranked.find((r) => r.lang === "fr" || r.lang === "en");
  return first?.lang === "fr";
}

async function adminGuard(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";

  let response = NextResponse.next({ request });
  let signedIn = false;

  if (isSupabaseConfigured) {
    const session = await updateSession(request);
    response = session.response;
    signedIn = Boolean(session.user);
  } else if (isDemoMode) {
    signedIn = request.cookies.get(DEMO_ADMIN_COOKIE)?.value === "1";
  }

  if (!signedIn && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // Everything except API routes, Next internals, metadata images and files with an extension.
  matcher: ["/((?!api|_next|opengraph-image|twitter-image|.*\\..*).*)"],
};
