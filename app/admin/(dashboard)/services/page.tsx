import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PackageEditor } from "@/components/admin/PackageEditor";
import { ServiceEditor } from "@/components/admin/ServiceEditor";
import { getRepository } from "@/lib/data";

export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const repo = getRepository();
  const [services, locations, settings, packages] = await Promise.all([
    repo.listServices({ includeInactive: true }),
    repo.listLocations({ includeInactive: true }),
    repo.getSettings(),
    repo.listPackages({ includeInactive: true }),
  ]);
  const nextSortOrder = services.reduce((max, s) => Math.max(max, s.sortOrder), 0) + 1;
  const nextPackOrder = packages.reduce((max, p) => Math.max(max, p.sortOrder), 0) + 1;
  const activeServices = services.filter((s) => s.isActive);

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <AdminPageHeader title="Services" description="Lesson types, durations and prices. Changes appear on the website and booking flow immediately." />
        <div className="space-y-3">
          {services.map((s) => (
            <ServiceEditor key={s.id} service={s} locations={locations} defaultCurrency={settings.currency} />
          ))}
          <ServiceEditor locations={locations} defaultCurrency={settings.currency} nextSortOrder={nextSortOrder} />
        </div>
      </section>

      <section id="packs" className="space-y-4 scroll-mt-24">
        <div>
          <h2 className="font-display text-3xl leading-none md:text-4xl">Lesson packs</h2>
          <p className="mt-2 text-sm text-muted">
            Discounted bundles (e.g. 10 lessons −10% per month). Players choose a pack when booking their first lesson; you schedule the rest from the booking.
          </p>
        </div>
        <div className="space-y-3">
          {packages.map((p) => (
            <PackageEditor key={p.id} pkg={p} services={activeServices} />
          ))}
          <PackageEditor services={activeServices} nextSortOrder={nextPackOrder} />
        </div>
      </section>
    </div>
  );
}
