"use client";

import { useState, useTransition } from "react";
import { CalendarOff, Trash as TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { createBlockedDateAction, deleteBlockedDateAction } from "@/actions/admin";
import { formatDateShort } from "@/lib/booking/time";
import type { BlockedDate } from "@/lib/booking/types";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";

export function BlockedDatesManager({ blocked, today }: { blocked: BlockedDate[]; today: string }) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ dateFrom: today, dateTo: today, allDay: true, startTime: "12:00", endTime: "14:00", reason: "" });
  const [error, setError] = useState<string | null>(null);

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const res = await createBlockedDateAction({
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
        startTime: form.allDay ? null : form.startTime,
        endTime: form.allDay ? null : form.endTime,
        reason: form.reason,
      });
      if (res.ok) {
        toast.success("Dates blocked — those slots are no longer bookable.");
        setForm((f) => ({ ...f, reason: "" }));
      } else setError(res.error);
    });

  const remove = (id: string) =>
    startTransition(async () => {
      const res = await deleteBlockedDateAction(id);
      if (res.ok) toast.success("Block removed.");
      else toast.error(res.error);
    });

  return (
    <div className="grid gap-6 p-5 md:p-6 lg:grid-cols-2">
      <form
        className="space-y-4 rounded-2xl bg-surface p-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h3 className="font-semibold">Block time off</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="block-from" label="From" required>
            <Input id="block-from" type="date" min={today} required value={form.dateFrom} onChange={(e) => setForm({ ...form, dateFrom: e.target.value, dateTo: e.target.value > form.dateTo ? e.target.value : form.dateTo })} />
          </Field>
          <Field id="block-to" label="To" required>
            <Input id="block-to" type="date" min={form.dateFrom} required value={form.dateTo} onChange={(e) => setForm({ ...form, dateTo: e.target.value })} />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          <Checkbox checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} /> Whole day(s)
        </label>
        {!form.allDay && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="block-start" label="From time" required>
              <Input id="block-start" type="time" step={900} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </Field>
            <Field id="block-end" label="To time" required>
              <Input id="block-end" type="time" step={900} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </Field>
          </div>
        )}
        <Field id="block-reason" label="Reason" hint="Only visible to you.">
          <Input id="block-reason" value={form.reason} maxLength={200} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Tournament, holiday…" />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" variant="secondary" loading={pending}>
          Block dates
        </Button>
      </form>

      <div>
        <h3 className="font-semibold">Upcoming blocks</h3>
        {blocked.length === 0 ? (
          <EmptyState icon={CalendarOff} title="No blocked dates" description="Holidays and tournaments you block will appear here." className="mt-4 py-8" />
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {blocked.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="tabular text-sm font-semibold">
                    {formatDateShort(b.dateFrom)}
                    {b.dateTo !== b.dateFrom && ` → ${formatDateShort(b.dateTo)}`}
                    <span className="ml-2 font-normal text-muted">{b.startTime ? `${b.startTime}–${b.endTime}` : "All day"}</span>
                  </p>
                  {b.reason && <p className="truncate text-sm text-muted">{b.reason}</p>}
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(b.id)}
                  aria-label={`Remove block from ${b.dateFrom}`}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-danger hover:bg-danger-50"
                >
                  <TrashIcon aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
