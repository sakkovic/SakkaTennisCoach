import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LocationEditor } from "@/components/admin/LocationEditor";
import { getRepository } from "@/lib/data";

export const metadata = { title: "Locations" };

export default async function LocationsPage() {
  const locations = await getRepository().listLocations({ includeInactive: true });
  const nextSortOrder = locations.reduce((max, l) => Math.max(max, l.sortOrder), 0) + 1;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Locations" description="Courts and clubs where you coach. Players choose one when booking." />
      <div className="space-y-3">
        {locations.map((l) => (
          <LocationEditor key={l.id} location={l} />
        ))}
        <LocationEditor nextSortOrder={nextSortOrder} />
      </div>
    </div>
  );
}
