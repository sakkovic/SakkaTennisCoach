import { connection } from "next/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmailOutbox } from "@/components/admin/EmailOutbox";
import { listOutbox } from "@/lib/notifications/outbox";

export const metadata = { title: "Emails" };

export default async function EmailsPage() {
  await connection();
  const emails = listOutbox();
  const live = Boolean(process.env.RESEND_API_KEY);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Emails"
        description={
          live
            ? "Emails sent by the website since the server started (sent through Resend)."
            : "Preview mode — no email provider is configured, so nothing is actually sent. Every email the website would send appears here."
        }
      />
      <EmailOutbox emails={emails} live={live} />
    </div>
  );
}
