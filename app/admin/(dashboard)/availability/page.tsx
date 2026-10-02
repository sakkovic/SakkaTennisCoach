import { AdminCard, AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AvailabilityManager } from "@/components/admin/AvailabilityManager";
import { BlockedDatesManager } from "@/components/admin/BlockedDatesManager";
import { coachToday } from "@/lib/admin/today";
import { getRepository } from "@/lib/data";

export const metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const repo = getRepository();
  const { today, settings } = await coachToday();
  const [rules, locations, blocked] = await Promise.all([repo.listAvailabilityRules(), repo.listLocations({ includeInactive: true }), repo.listBlockedDates(today)]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Availability"
        description={`Bookable slots are generated from these hours every ${settings.slotIntervalMin} minutes, minus bookings and blocked time. Timezone: ${settings.timezone}.`}
      />
      <AdminCard title="Weekly hours" description="Your recurring coaching hours. Pause a window to hide it temporarily.">
        <AvailabilityManager rules={rules} locations={locations} />
      </AdminCard>
      <AdminCard title="Blocked dates" description="Holidays, tournaments or any time you're unavailable.">
        <BlockedDatesManager blocked={blocked} today={today} />
      </AdminCard>
    </div>
  );
}
