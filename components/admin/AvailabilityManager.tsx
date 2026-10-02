"use client";

import { useState, useTransition } from "react";
import { Plus, Trash as TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { createAvailabilityRuleAction, deleteAvailabilityRuleAction, setAvailabilityRuleActiveAction } from "@/actions/admin";
import { WEEKDAYS } from "@/lib/booking/time";
import type { AvailabilityRule, Location } from "@/lib/booking/types";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";

type Props = { rules: AvailabilityRule[]; locations: Location[] };

// Monday-first display order
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function AvailabilityManager({ rules, locations }: Props) {
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState<number | null>(null);
  const [draft, setDraft] = useState({ startTime: "08:00", endTime: "12:00", locationId: "" });

  const locationName = (id: string | null) => (id ? (locations.find((l) => l.id === id)?.name ?? "Unknown location") : "All locations");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(success);
      else toast.error(res.error ?? "Something went wrong.");
    });

  const add = (weekday: number) =>
    startTransition(async () => {
      const res = await createAvailabilityRuleAction({
        weekday,
        startTime: draft.startTime,
        endTime: draft.endTime,
        locationId: draft.locationId || null,
        validFrom: null,
        validUntil: null,
        isActive: true,
      });
      if (res.ok) {
        toast.success(`Hours added for ${WEEKDAYS[weekday]}.`);
        setAdding(null);
      } else toast.error(res.error);
    });

  return (
    <ul className="divide-y divide-line">
      {ORDER.map((weekday) => {
        const dayRules = rules.filter((r) => r.weekday === weekday).sort((a, b) => a.startTime.localeCompare(b.startTime));
        return (
          <li key={weekday} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:px-6">
            <p className="w-32 shrink-0 pt-2 font-semibold">{WEEKDAYS[weekday]}</p>
            <div className="flex-1 space-y-2">
              {dayRules.length === 0 && adding !== weekday && <p className="pt-2 text-sm text-muted">Unavailable</p>}
              <ul className="flex flex-wrap gap-2">
                {dayRules.map((r) => (
                  <li
                    key={r.id}
                    className={cn(
                      "flex items-center gap-2 rounded-full border py-1 pl-4 pr-1 text-sm",
                      r.isActive ? "border-line bg-white" : "border-dashed border-line bg-surface text-muted",
                    )}
                  >
                    <span className="tabular font-semibold">
                      {r.startTime}–{r.endTime}
                    </span>
                    <span className="text-xs text-muted">{locationName(r.locationId)}</span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => setAvailabilityRuleActiveAction(r.id, !r.isActive), r.isActive ? "Window paused." : "Window activated.")}
                      className="rounded-full px-2.5 py-1.5 text-xs font-semibold hover:bg-surface"
                    >
                      {r.isActive ? "Pause" : "Activate"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => deleteAvailabilityRuleAction(r.id), "Window removed.")}
                      aria-label={`Remove ${WEEKDAYS[weekday]} ${r.startTime}–${r.endTime}`}
                      className="inline-flex size-8 items-center justify-center rounded-full text-danger hover:bg-danger-50"
                    >
                      <TrashIcon aria-hidden className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>

              {adding === weekday ? (
                <form
                  className="flex flex-wrap items-end gap-2 rounded-2xl bg-surface p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    add(weekday);
                  }}
                >
                  <label className="text-xs font-semibold">
                    From
                    <Input type="time" step={900} required value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} className="mt-1 h-10 w-32" />
                  </label>
                  <label className="text-xs font-semibold">
                    To
                    <Input type="time" step={900} required value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} className="mt-1 h-10 w-32" />
                  </label>
                  <label className="text-xs font-semibold">
                    Location
                    <Select value={draft.locationId} onChange={(e) => setDraft({ ...draft, locationId: e.target.value })} className="mt-1 h-10 w-48">
                      <option value="">All locations</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <Button type="submit" size="sm" variant="secondary" loading={pending}>
                    Add
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(null)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(weekday)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink hover:bg-surface"
                >
                  <Plus aria-hidden className="size-4" /> Add hours
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
