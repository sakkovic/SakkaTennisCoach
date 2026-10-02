import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Court/venue name that opens Google Maps in a new tab (plain text when no link is set). */
export function MapLink({ name, mapsUrl, className, label = "open in Google Maps" }: { name: string; mapsUrl: string | null | undefined; className?: string; label?: string }) {
  if (!mapsUrl) return <>{name}</>;
  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${name} — ${label}`}
      className={cn("inline-flex items-center gap-1 underline decoration-lime decoration-2 underline-offset-4 hover:text-lime-ink", className)}
    >
      {name}
      <ArrowUpRight aria-hidden className="size-3.5 shrink-0" />
    </a>
  );
}
