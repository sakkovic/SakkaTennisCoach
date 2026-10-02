import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy without nonces (keeps pages static/cached). The browser only
 * talks to this site; Supabase is called from the server. Images may come from
 * Supabase Storage. 'unsafe-eval' is needed by the dev server only.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://*.supabase.co https://images.unsplash.com",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Vercel always serves HTTPS; a local production build (e.g. the E2E tests) runs on http.
  ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  // The E2E tests build a separate demo-mode copy of the site (see playwright.config.ts).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Placeholder photography. Replace with the coach's own photos in /public/images
      // (see content/images.ts) and this entry can be removed.
      { protocol: "https", hostname: "images.unsplash.com" },
      // Supabase Storage (future admin-uploaded images)
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  poweredByHeader: false,
  experimental: {
    // Journey photo uploads (images are resized in the browser to ~2000px first).
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
