import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
