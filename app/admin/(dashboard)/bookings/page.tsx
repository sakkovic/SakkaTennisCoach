import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BookingTable } from "@/components/admin/BookingTable";
import { ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { coachToday } from "@/lib/admin/today";
import { getRepository } from "@/lib/data";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/booking/types";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Bookings" };

const STATUS_TABS: Array<{ value: BookingStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const SCOPES = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All dates" },
] as const;

type Scope = (typeof SCOPES)[number]["value"];

export default async function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const sp = await searchParams;
  const status = (BOOKING_STATUSES as readonly string[]).includes(String(sp.status)) ? (sp.status as BookingStatus) : "all";
  const scope: Scope = SCOPES.some((s) => s.value === sp.scope) ? (sp.scope as Scope) : "upcoming";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";

  const { today } = await coachToday();
  const bookings = await getRepository().listBookings({ today, status, scope, search: q, limit: 200 });

  const href = (patch: Record<string, string>) => {
    const params = new URLSearchParams({ status, scope, ...(q && { q }), ...patch });
    if (params.get("status") === "all") params.delete("status");
    if (params.get("scope") === "upcoming") params.delete("scope");
    const qs = params.toString();
    return `/admin/bookings${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Bookings"
        description="All lesson requests and reservations. Tap any row for details."
        actions={
          <ButtonLink href={`/admin/calendar?new=${today}`} variant="secondary" size="sm" icon={<Plus aria-hidden className="size-4" />}>
            New lesson
          </ButtonLink>
        }
      />

      <AdminCard>
        <div className="flex flex-col gap-4 border-b border-line p-4 md:p-5 xl:flex-row xl:items-center xl:justify-between">
          <nav aria-label="Filter by status" className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STATUS_TABS.map((t) => (
              <Link
                key={t.value}
                href={href({ status: t.value })}
                aria-current={status === t.value ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors",
                  status === t.value ? "bg-ink text-white" : "text-muted hover:bg-surface hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <nav aria-label="Filter by date" className="inline-flex rounded-full bg-surface p-1">
              {SCOPES.map((s) => (
                <Link
                  key={s.value}
                  href={href({ scope: s.value })}
                  aria-current={scope === s.value ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 flex-1 items-center justify-center rounded-full px-3.5 text-sm font-medium transition-colors",
                    scope === s.value ? "bg-white text-ink shadow-soft" : "text-muted hover:text-ink",
                  )}
                >
                  {s.label}
                </Link>
              ))}
            </nav>
            <form role="search" action="/admin/bookings" className="relative">
              {status !== "all" && <input type="hidden" name="status" value={status} />}
              {scope !== "upcoming" && <input type="hidden" name="scope" value={scope} />}
              <label htmlFor="booking-search" className="sr-only">
                Search bookings
              </label>
              <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input id="booking-search" name="q" type="search" defaultValue={q} placeholder="Name, email, phone, ref…" className="h-11 w-full pl-10 sm:w-64" />
            </form>
          </div>
        </div>
        <BookingTable
          bookings={bookings}
          today={today}
          emptyTitle={q ? "No matching bookings" : "No bookings here"}
          emptyText={q ? `Nothing matches “${q}”. Try another search.` : "Try another filter."}
        />
      </AdminCard>
      <p className="text-sm text-muted">
        {bookings.length} booking{bookings.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
