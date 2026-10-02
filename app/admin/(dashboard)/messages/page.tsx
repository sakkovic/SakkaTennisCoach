import { AdminCard, AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MessageList } from "@/components/admin/MessageList";
import { getRepository } from "@/lib/data";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const messages = await getRepository().listContactMessages();
  const unread = messages.filter((m) => m.status === "new").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Messages" description={`${unread} unread · from the website contact form`} />
      <AdminCard>
        <MessageList messages={messages} />
      </AdminCard>
    </div>
  );
}
