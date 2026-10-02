import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-card border border-dashed border-line bg-surface/60 px-6 py-12 text-center", className)}>
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white text-ink shadow-soft">
        <Icon aria-hidden className="size-6" strokeWidth={1.75} />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-ink/[0.06]", className)} />;
}
