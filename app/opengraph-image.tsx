import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name} — ${siteConfig.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Branded social card generated at build time (also used for Twitter). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #071c2c 0%, #0b2d46 100%)",
          color: "#ffffff",
          position: "relative",
        }}
      >
        {/* court lines */}
        <div style={{ position: "absolute", inset: 40, border: "2px solid rgba(255,255,255,0.08)", display: "flex" }} />
        <div style={{ position: "absolute", top: 40, bottom: 40, left: 600, width: 2, background: "rgba(255,255,255,0.08)", display: "flex" }} />
        <div style={{ position: "absolute", left: 40, right: 40, top: 315, height: 2, background: "rgba(255,255,255,0.05)", display: "flex" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: 999, background: "#d7f530", display: "flex" }} />
          <div style={{ fontSize: 26, letterSpacing: 8, textTransform: "uppercase", color: "#d7f530", fontWeight: 700 }}>{siteConfig.role}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 150, fontWeight: 900, letterSpacing: -2, lineHeight: 0.9 }}>{siteConfig.brand}</div>
          <div style={{ marginTop: 28, fontSize: 38, color: "rgba(255,255,255,0.8)" }}>{siteConfig.tagline}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", background: "#d7f530", color: "#071c2c", padding: "14px 30px", borderRadius: 999, fontSize: 26, fontWeight: 700 }}>
            Book a Lesson
          </div>
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.6)" }}>ITF Certified · ATP / GPTCA Coaching</div>
        </div>
      </div>
    ),
    size,
  );
}
