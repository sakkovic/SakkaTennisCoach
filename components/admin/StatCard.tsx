import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function StatCard({ label, value, icon: Icon, href, highlight = false }: { label: string; value: number; icon: LucideIcon; href: string; highlight?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col justify-between rounded-card p-5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift",
        highlight ? "on-dark bg-ink text-white" : "border border-line bg-white shadow-soft",
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-medium", highlight ? "text-white/70" : "text-muted")}>{label}</span>
        <span className={cn("inline-flex size-9 items-center justify-center rounded-xl", highlight ? "bg-lime text-ink" : "bg-surface text-ink")}>
          <Icon aria-hidden className="size-[18px]" />
        </span>
      </div>
      <span className="font-display tabular mt-4 text-5xl leading-none">{value}</span>
    </Link>
  );
}
