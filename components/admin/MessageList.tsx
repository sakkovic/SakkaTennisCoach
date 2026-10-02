"use client";

import { useTransition } from "react";
import { Archive, Inbox, Mail, MailOpen, Phone } from "lucide-react";
import { toast } from "sonner";
import { setMessageStatusAction } from "@/actions/admin";
import type { ContactMessage } from "@/lib/booking/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

const dateTime = (iso: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export function MessageList({ messages }: { messages: ContactMessage[] }) {
  const [pending, startTransition] = useTransition();
  const setStatus = (id: string, status: ContactMessage["status"]) =>
    startTransition(async () => {
      const res = await setMessageStatusAction(id, status);
      if (!res.ok) toast.error(res.error);
    });

  if (messages.length === 0) return <EmptyState icon={Inbox} title="No messages yet" description="Messages sent from the contact form appear here." className="m-5 md:m-6" />;

  return (
    <ul className="divide-y divide-line">
      {messages.map((m) => (
        <li key={m.id} className={m.status === "archived" ? "p-5 opacity-60 md:p-6" : "p-5 md:p-6"}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-semibold">
                {m.name}
                {m.status === "new" && <Badge tone="lime">New</Badge>}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1.5 hover:text-ink">
                  <Mail aria-hidden className="size-4" /> {m.email}
                </a>
                {m.phone && (
                  <a href={`tel:${m.phone}`} className="tabular inline-flex items-center gap-1.5 hover:text-ink">
                    <Phone aria-hidden className="size-4" /> {m.phone}
                  </a>
                )}
              </p>
            </div>
            <p className="text-xs text-muted">{dateTime(m.createdAt)}</p>
          </div>
          <p className="mt-3 whitespace-pre-line text-[0.9375rem] leading-relaxed">{m.message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {m.status === "new" && (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus(m.id, "read")} icon={<MailOpen aria-hidden className="size-4" />}>
                Mark as read
              </Button>
            )}
            {m.status !== "archived" ? (
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus(m.id, "archived")} icon={<Archive aria-hidden className="size-4" />}>
                Archive
              </Button>
            ) : (
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus(m.id, "read")}>
                Restore
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
