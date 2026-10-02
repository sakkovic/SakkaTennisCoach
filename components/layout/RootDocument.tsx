import type { ReactNode } from "react";
import type { Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { Providers } from "@/components/layout/Providers";
import "@/app/globals.css";

const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas", display: "swap" });
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

export const rootViewport: Viewport = {
  themeColor: "#071c2c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** <html>/<body> shell shared by the two root layouts (public site per language, and admin). */
export function RootDocument({ lang, skipLabel, children }: { lang: string; skipLabel: string; children: ReactNode }) {
  return (
    <html lang={lang} className={`${bebas.variable} ${inter.variable} antialiased`}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-[100] rounded-full bg-lime px-5 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {skipLabel}
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
