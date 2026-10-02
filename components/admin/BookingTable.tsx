import Link from "next/link";
import { ChevronRight, Inbox, Repeat } from "lucide-react";
import { formatPrice } from "@/lib/booking/money";
import { formatDateShort } from "@/lib/booking/time";
import type { Booking } from "@/lib/booking/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookingActions } from "./BookingActions";
import { StatusBadge } from "./StatusBadge";

type Props = { bookings: Booking[]; today: string; emptyTitle?: string; emptyText?: string };

/**
 * Whole rows/cards are clickable: the player-name link is "stretched" over the row
 * with an ::after overlay (one accessible link per row, no nested links), while the
 * action buttons sit above it (relative z-10) and stay independently clickable.
 */
const stretched = "after:absolute after:inset-0 after:content-['']";

function PackBadge({ lessons }: { lessons: number }) {
  return <span className="mt-1 inline-flex rounded-full bg-lime px-2 py-0.5 text-[0.6875rem] font-bold text-ink">{lessons}-lesson pack</span>;
}

function SeriesIcon({ booking }: { booking: Booking }) {
  if (!booking.seriesId) return null;
  return <Repeat aria-label="Recurring lesson" className="ml-1.5 inline size-3.5 text-muted" />;
}

export function BookingTable({ bookings, today, emptyTitle = "No bookings yet", emptyText = "New lesson requests will appear here." }: Props) {
  if (bookings.length === 0) return <EmptyState icon={Inbox} title={emptyTitle} description={emptyText} className="m-5 md:m-6" />;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-6 py-3 font-semibold">Player</th>
              <th scope="col" className="px-4 py-3 font-semibold">Service</th>
              <th scope="col" className="px-4 py-3 font-semibold">Date</th>
              <th scope="col" className="px-4 py-3 font-semibold">Time</th>
              <th scope="col" className="px-4 py-3 font-semibold">Location</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              <th scope="col" className="px-6 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {bookings.map((b) => (
              <tr key={b.id} className="group relative cursor-pointer transition-colors hover:bg-surface/70 focus-within:bg-surface/70">
                <td className="px-6 py-4">
                  <Link href={`/admin/bookings/${b.id}`} className={`font-semibold group-hover:underline ${stretched}`}>
                    {b.firstName} {b.lastName}
                  </Link>
                  <SeriesIcon booking={b} />
                  <p className="text-xs text-muted">{b.email ?? (b.source === "admin" ? "Added by coach" : "")}</p>
                </td>
                <td className="px-4 py-4">
                  {b.serviceName}
                  <p className="tabular text-xs text-muted">
                    {formatPrice(b.priceCents, b.currency)}
                    {b.playersCount > 1 && ` · ${b.playersCount} players`}
                  </p>
                  {b.package && <PackBadge lessons={b.package.lessons} />}
                </td>
                <td className="tabular whitespace-nowrap px-4 py-4">
                  {formatDateShort(b.date)}
                  {b.date === today && <span className="ml-2 rounded-full bg-lime px-2 py-0.5 text-[0.6875rem] font-bold text-ink">Today</span>}
                </td>
                <td className="tabular whitespace-nowrap px-4 py-4">
                  {b.startTime}–{b.endTime}
                </td>
                <td className="px-4 py-4">{b.locationName}</td>
                <td className="px-4 py-4">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-6 py-4">
                  <div className="relative z-10 ml-auto w-fit">
                    <BookingActions id={b.id} status={b.status} playerName={`${b.firstName} ${b.lastName}`} compact />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet cards — the whole card opens the booking */}
      <ul className="divide-y divide-line lg:hidden">
        {bookings.map((b) => (
          <li key={b.id} className="relative p-5 transition-colors active:bg-surface hover:bg-surface/60">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/admin/bookings/${b.id}`} className={`font-semibold ${stretched}`}>
                  {b.firstName} {b.lastName}
                </Link>
                <SeriesIcon booking={b} />
                <p className="mt-0.5 text-sm text-muted">
                  {b.serviceName} {b.package && <PackBadge lessons={b.package.lessons} />}
                </p>
                <p className="tabular mt-2 text-sm font-medium">
                  {formatDateShort(b.date)} · {b.startTime}–{b.endTime}
                </p>
                <p className="text-sm text-muted">{b.locationName}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <StatusBadge status={b.status} />
                <ChevronRight aria-hidden className="size-5 text-muted" />
              </div>
            </div>
            {(b.status === "pending" || b.status === "confirmed") && (
              <div className="relative z-10 mt-3 w-fit">
                <BookingActions id={b.id} status={b.status} playerName={`${b.firstName} ${b.lastName}`} compact />
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
