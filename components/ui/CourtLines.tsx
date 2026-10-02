import { cn } from "@/lib/utils/cn";

/**
 * Brand motif: a regulation tennis court drawn to scale (23.77m × 10.97m),
 * rendered with hairline strokes. Decorative only.
 */
export function CourtLines({ className, orientation = "horizontal" }: { className?: string; orientation?: "horizontal" | "vertical" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 2377 1097"
      preserveAspectRatio="xMidYMid slice"
      className={cn("pointer-events-none", orientation === "vertical" && "rotate-90", className)}
      fill="none"
      stroke="currentColor"
    >
      <g vectorEffect="non-scaling-stroke" strokeWidth="1">
        {/* doubles court */}
        <rect x="0.5" y="0.5" width="2376" height="1096" vectorEffect="non-scaling-stroke" />
        {/* singles sidelines */}
        <line x1="0" y1="137" x2="2377" y2="137" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="960" x2="2377" y2="960" vectorEffect="non-scaling-stroke" />
        {/* net */}
        <line x1="1188.5" y1="-40" x2="1188.5" y2="1137" vectorEffect="non-scaling-stroke" strokeDasharray="6 6" />
        {/* service lines */}
        <line x1="548.5" y1="137" x2="548.5" y2="960" vectorEffect="non-scaling-stroke" />
        <line x1="1828.5" y1="137" x2="1828.5" y2="960" vectorEffect="non-scaling-stroke" />
        {/* centre service line */}
        <line x1="548.5" y1="548.5" x2="1828.5" y2="548.5" vectorEffect="non-scaling-stroke" />
        {/* centre marks */}
        <line x1="0" y1="548.5" x2="30" y2="548.5" vectorEffect="non-scaling-stroke" />
        <line x1="2347" y1="548.5" x2="2377" y2="548.5" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

/** Lime "ball seam" curve used as an accent stroke. */
export function SeamCurve({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 120" fill="none" className={cn("pointer-events-none", className)}>
      <path d="M2 110C90 110 120 10 200 10s110 100 198 100" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
