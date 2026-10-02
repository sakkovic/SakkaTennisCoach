import { NotFoundContent } from "@/components/layout/NotFoundContent";
import { CourtLines } from "@/components/ui/CourtLines";

/** notFound() inside public pages — the site layout already provides the navbar. */
export default function SiteNotFound() {
  return (
    <section className="on-dark relative isolate flex min-h-[80svh] flex-col bg-ink px-5 pt-20 text-white">
      <CourtLines className="absolute inset-0 -z-10 h-full w-full text-white/[0.06]" />
      <NotFoundContent />
    </section>
  );
}
