"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSettingsAction } from "@/actions/admin";
import type { CoachSettings } from "@/lib/booking/types";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";

const numberFields: Array<{ key: keyof CoachSettings; label: string; hint: string; min: number; max: number; step?: number }> = [
  { key: "slotIntervalMin", label: "Slot interval (minutes)", hint: "How often a lesson can start, e.g. every 30 minutes.", min: 5, max: 240, step: 5 },
  { key: "minNoticeHours", label: "Minimum notice (hours)", hint: "Players can't book later than this before a lesson.", min: 0, max: 336 },
  { key: "maxAdvanceDays", label: "Booking window (days)", hint: "How far ahead players can book.", min: 1, max: 365 },
  { key: "bufferMin", label: "Buffer between lessons (minutes)", hint: "Travel or rest time kept free around each booking.", min: 0, max: 120, step: 5 },
  { key: "maxPendingPerEmail", label: "Max pending requests per email", hint: "Anti-spam limit per 24 hours.", min: 1, max: 50 },
];

export function SettingsForm({ settings, timezones }: { settings: CoachSettings; timezones: string[] }) {
  const [form, setForm] = useState<Record<keyof CoachSettings, string>>(() =>
    Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, String(v)])) as Record<keyof CoachSettings, string>,
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await saveSettingsAction({
        timezone: form.timezone,
        currency: form.currency,
        slotIntervalMin: Number(form.slotIntervalMin),
        minNoticeHours: Number(form.minNoticeHours),
        maxAdvanceDays: Number(form.maxAdvanceDays),
        bufferMin: Number(form.bufferMin),
        maxPendingPerEmail: Number(form.maxPendingPerEmail),
      });
      if (res.ok) {
        toast.success("Settings saved.");
        setErrors({});
      } else {
        setErrors(Object.fromEntries(Object.entries(res.fieldErrors ?? {}).map(([k, v]) => [k, v?.[0]])));
        toast.error(res.error);
      }
    });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-6 p-5 md:p-6"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field id="tz" label="Timezone" required error={errors.timezone} hint="All lesson times are in this timezone.">
          <Select id="tz" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="currency" label="Default currency" required error={errors.currency} hint="ISO code for new services, e.g. USD, EUR, CAD.">
          <Input id="currency" maxLength={3} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
        </Field>
        {numberFields.map((f) => (
          <Field key={f.key} id={f.key} label={f.label} required hint={f.hint} error={errors[f.key]}>
            <Input id={f.key} type="number" min={f.min} max={f.max} step={f.step ?? 1} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} invalid={!!errors[f.key]} />
          </Field>
        ))}
      </div>
      <div className="flex justify-end border-t border-line pt-5">
        <Button type="submit" variant="secondary" loading={pending}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
