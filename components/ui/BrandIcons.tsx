import type { SVGProps } from "react";

/** Brand glyphs (lucide-react no longer ships brand icons). Stroke style matches lucide. */

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M3.5 20.5l1.3-4.1A8.9 8.9 0 1 1 8 19.5z" />
      <path
        fill="currentColor"
        stroke="none"
        d="M9.1 7.6c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .6.4l.8 1.9c.1.2.1.4 0 .6l-.4.6c-.1.2-.2.3 0 .6.4.7 1 1.4 1.7 1.9.3.2.6.4.9.5.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.4.4 0 .5-.1 1.1-.5 1.5-.5.5-1.2.8-1.9.8-.9 0-2.2-.4-3.7-1.6a10.7 10.7 0 0 1-2.9-3.5c-.4-.8-.5-1.5-.4-2.1.1-.6.4-1.1.7-1.4z"
      />
    </svg>
  );
}

/** Tennis-ball mark used in the wordmark. */
export function BallMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="10.5" fill="currentColor" />
      <path d="M5.2 4.1a11 11 0 0 1 0 15.8M18.8 4.1a11 11 0 0 0 0 15.8" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
