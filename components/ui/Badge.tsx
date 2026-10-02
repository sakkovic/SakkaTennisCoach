import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "lime" | "navy" | "neutral" | "success" | "warning" | "danger" | "sky" | "outline-dark";

const tones: Record<Tone, string> = {
  lime: "bg-lime text-ink",
  navy: "bg-ink text-white",
  neutral: "bg-surface text-ink ring-1 ring-inset ring-line",
  success: "bg-success-50 text-success ring-1 ring-inset ring-success/20",
  warning: "bg-warning-50 text-warning ring-1 ring-inset ring-warning/20",
  danger: "bg-danger-50 text-danger ring-1 ring-inset ring-danger/20",
  sky: "bg-sky-50 text-navy ring-1 ring-inset ring-sky/40",
  "outline-dark": "text-white ring-1 ring-inset ring-white/25",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
