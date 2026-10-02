import { AdminCard, AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getRepository } from "@/lib/data";
import { isDemoMode } from "@/lib/env";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getRepository().getSettings();
  const timezones = Intl.supportedValuesOf("timeZone");
  if (!timezones.includes(settings.timezone)) timezones.unshift(settings.timezone);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Settings" description="Booking rules applied to every lesson." />
      <AdminCard title="Booking rules">
        <SettingsForm settings={settings} timezones={timezones} />
      </AdminCard>
      <AdminCard title="Business information">
        <p className="p-5 text-sm leading-relaxed text-muted md:p-6">
          Name, phone, WhatsApp, email, Instagram and service area are edited in <code className="rounded bg-surface px-1.5 py-0.5 text-ink">config/site.ts</code>.
          Credentials and page copy live in <code className="rounded bg-surface px-1.5 py-0.5 text-ink">content/</code>.
          {isDemoMode && " You're in demo mode: changes here are kept in memory until the server restarts."}
        </p>
      </AdminCard>
    </div>
  );
}
