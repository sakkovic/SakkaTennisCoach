import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-7xl px-5 md:px-8", className)} {...props} />;
}

type Tone = "light" | "surface" | "dark" | "navy";

const tones: Record<Tone, string> = {
  light: "bg-white text-ink",
  surface: "bg-surface text-ink",
  dark: "on-dark bg-ink text-white",
  navy: "on-dark bg-navy text-white",
};

export function Section({ tone = "light", className, ...props }: ComponentProps<"section"> & { tone?: Tone }) {
  return <section className={cn("relative py-20 md:py-28 lg:py-32", tones[tone], className)} {...props} />;
}
