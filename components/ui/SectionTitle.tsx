import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Props = {
  /** Section number shown in the eyebrow, e.g. "01" */
  index?: string;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  tone?: "light" | "dark";
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
};

export function Eyebrow({ index, children, tone = "light", className }: { index?: string; children: ReactNode; tone?: "light" | "dark"; className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em]",
        tone === "dark" ? "text-lime" : "text-lime-ink",
        className,
      )}
    >
      {index && <span className="tabular">{index}</span>}
      <span aria-hidden className={cn("h-px w-8", tone === "dark" ? "bg-lime/60" : "bg-lime-ink/50")} />
      <span>{children}</span>
    </p>
  );
}

export function SectionTitle({
  index,
  eyebrow,
  title,
  lead,
  tone = "light",
  align = "left",
  as: Heading = "h2",
  className,
}: Props) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      <Eyebrow index={index} tone={tone} className={cn(align === "center" && "justify-center")}>
        {eyebrow}
      </Eyebrow>
      <Heading className="font-display mt-5 text-[2.75rem] leading-[0.95] sm:text-6xl lg:text-7xl">{title}</Heading>
      {lead && (
        <p
          className={cn(
            "mt-6 max-w-2xl text-base leading-relaxed md:text-lg",
            tone === "dark" ? "text-muted-dark" : "text-muted",
            align === "center" && "mx-auto",
          )}
        >
          {lead}
        </p>
      )}
    </div>
  );
}
