import type { Metadata } from "next";
import { RootDocument, rootViewport } from "@/components/layout/RootDocument";
import { siteConfig } from "@/config/site";

/** Root layout of the coach dashboard (English, never indexed). */
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: "Admin", template: `%s | ${siteConfig.name} Admin` },
  robots: { index: false, follow: false },
};

export const viewport = rootViewport;

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <RootDocument lang="en" skipLabel="Skip to content">
      {children}
    </RootDocument>
  );
}
