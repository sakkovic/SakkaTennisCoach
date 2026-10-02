import Link from "next/link";
import { ArrowRight, CalendarCheck2, CalendarDays, Flag, Hourglass, Plus } from "lucide-react";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BookingTable } from "@/components/admin/BookingTable";
import { StatCard } from "@/components/admin/StatCard";
import { ButtonLink } from "@/components/ui/Button";
import { coachToday } from "@/lib/admin/today";
import { getRepository } from "@/lib/data";
import { formatDateLong } from "@/lib/booking/time";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const repo = getRepository();
  const { today } = await coachToday();
  const [stats, pending, upcoming] = await Promise.all([
    repo.getDashboardStats(today),
    repo.listBookings({ today, status: "pending", scope: "upcoming", limit: 10 }),
    repo.listBookings({ today, status: "confirmed", scope: "upcoming", limit: 8 }),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Dashboard"
        description={formatDateLong(today)}
        actions={
          <>
            <ButtonLink href="/admin/calendar" variant="outline" size="sm" icon={<CalendarDays aria-hidden className="size-4" />}>
              Open calendar
            </ButtonLink>
            <ButtonLink href={`/admin/calendar?new=${today}`} variant="secondary" size="sm" icon={<Plus aria-hidden className="size-4" />}>
              New lesson
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard label="Today's lessons" value={stats.today} icon={CalendarCheck2} href={`/admin/calendar`} highlight />
        <StatCard label="Upcoming lessons" value={stats.upcoming} icon={CalendarDays} href="/admin/bookings?scope=upcoming" />
        <StatCard label="Pending requests" value={stats.pending} icon={Hourglass} href="/admin/bookings?status=pending" />
        <StatCard label="Completed lessons" value={stats.completed} icon={Flag} href="/admin/bookings?status=completed&scope=all" />
      </div>

      <AdminCard
        title="Pending requests"
        description="Confirm or cancel new lesson requests."
        actions={
          <Link href="/admin/bookings?status=pending" className="inline-flex items-center gap-1 text-sm font-semibold hover:underline">
            View all <ArrowRight aria-hidden className="size-4" />
          </Link>
        }
      >
        <BookingTable bookings={pending} today={today} emptyTitle="You're all caught up" emptyText="No pending requests right now." />
      </AdminCard>

      <AdminCard
        title="Upcoming confirmed lessons"
        actions={
          <Link href="/admin/bookings?status=confirmed" className="inline-flex items-center gap-1 text-sm font-semibold hover:underline">
            View all <ArrowRight aria-hidden className="size-4" />
          </Link>
        }
      >
        <BookingTable bookings={upcoming} today={today} emptyTitle="No upcoming lessons" emptyText="Confirmed lessons will appear here." />
      </AdminCard>
    </div>
  );
}
