import type { ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Tone = "light" | "dark";

export function Card({
  tone = "light",
  interactive = false,
  className,
  ...props
}: ComponentProps<"div"> & { tone?: Tone; interactive?: boolean }) {
  return (
    <div
      className={cn(
        "relative rounded-card",
        tone === "light" ? "border border-line bg-white shadow-soft" : "border border-white/10 bg-navy",
        interactive &&
          "transition-[transform,box-shadow,border-color] duration-300 ease-out-quart hover:-translate-y-1 motion-reduce:hover:translate-y-0",
        interactive && (tone === "light" ? "hover:shadow-lift hover:border-ink/15" : "hover:border-lime/40"),
        className,
      )}
      {...props}
    />
  );
}

export function IconTile({ icon: Icon, tone = "light", className }: { icon: LucideIcon; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center rounded-2xl",
        tone === "light" ? "bg-ink text-lime" : "bg-lime/10 text-lime ring-1 ring-lime/25",
        className,
      )}
    >
      <Icon aria-hidden className="size-6" strokeWidth={1.75} />
    </span>
  );
}
