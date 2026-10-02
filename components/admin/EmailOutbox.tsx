"use client";

import { useState, useTransition } from "react";
import { MailOpen, Trash } from "lucide-react";
import { toast } from "sonner";
import { clearOutboxAction } from "@/actions/admin";
import type { OutboxEmail } from "@/lib/notifications/outbox";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const time = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** Inbox-style list of outgoing emails with a rendered preview of the selected one. */
export function EmailOutbox({ emails, live }: { emails: OutboxEmail[]; live: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(emails[0]?.id ?? null);
  const [pending, startTransition] = useTransition();
  const selected = emails.find((e) => e.id === selectedId) ?? emails[0] ?? null;

  const clear = () =>
    startTransition(async () => {
      const result = await clearOutboxAction();
      if (result.ok) toast.success("Outbox cleared");
      else toast.error(result.error);
    });

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-card border border-dashed border-line bg-white px-6 py-16 text-center">
        <MailOpen aria-hidden className="size-10 text-muted" strokeWidth={1.5} />
        <p className="mt-4 font-semibold">No emails yet</p>
        <p className="mt-1 max-w-md text-sm text-muted">
          Make a booking on the website, confirm or cancel one, or send a contact message — the emails appear here. The list resets when the server restarts.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <section className="rounded-card border border-line bg-white shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="text-sm font-semibold">
            {emails.length} email{emails.length === 1 ? "" : "s"}
          </p>
          <Button size="sm" variant="outline" onClick={clear} loading={pending} icon={<Trash aria-hidden className="size-4" />}>
            Clear
          </Button>
        </div>
        <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
          {emails.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setSelectedId(e.id)}
                aria-current={selected?.id === e.id ? "true" : undefined}
                className={cn("block w-full px-4 py-3 text-left transition-colors hover:bg-surface", selected?.id === e.id && "bg-surface")}
              >
                <span className="block truncate text-sm font-semibold">{e.subject}</span>
                <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="truncate">To {e.to}</span>
                  <span className="shrink-0 tabular">{time.format(new Date(e.createdAt))}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selected && (
        <section className="min-w-0 rounded-card border border-line bg-white shadow-soft">
          <dl className="grid gap-1 border-b border-line px-5 py-4 text-sm">
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-muted">Subject</dt>
              <dd className="font-semibold">{selected.subject}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-muted">To</dt>
              <dd className="break-all">{selected.to}</dd>
            </div>
            {selected.replyTo && (
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-muted">Reply-to</dt>
                <dd className="break-all">{selected.replyTo}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-muted">Status</dt>
              <dd>
                {live ? (selected.delivered ? "Sent" : "Failed to send") : <span className="text-muted">Not sent (preview mode)</span>}
              </dd>
            </div>
          </dl>
          {/* Sandboxed: renders the HTML exactly as the recipient would see it, without running scripts. */}
          <iframe title={`Preview: ${selected.subject}`} srcDoc={`<base target="_blank">${selected.html}`} sandbox="allow-popups allow-popups-to-escape-sandbox" className="h-[70vh] w-full rounded-b-card bg-white" />
        </section>
      )}
    </div>
  );
}
