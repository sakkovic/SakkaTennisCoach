"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, Ban, CalendarCheck2, CalendarPlus, Check, Repeat, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { createLessonsAction, previewLessonsAction, type LessonPreview } from "@/actions/admin";
import { playerLevels } from "@/content/coaching";
import { en } from "@/lib/i18n/dictionaries/en";
import { computePrice, formatPrice } from "@/lib/booking/money";
import { discountedLessonCents } from "@/lib/booking/packages";
import { CREATABLE, type Frequency, type OccurrenceStatus } from "@/lib/booking/recurrence";
import { formatDateShort, formatDuration, minutesToTime, timeToMinutes } from "@/lib/booking/time";
import type { Location, Package, PlayerLevel, Service } from "@/lib/booking/types";
import type { AdminLessonForm } from "@/lib/validation/admin";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";

export type NewLessonInitial = {
  date: string;
  time: string;
  /** Pre-filled fields, e.g. when scheduling the rest of a lesson pack */
  prefill?: Partial<AdminLessonForm>;
};

type Props = {
  services: Service[];
  locations: Location[];
  packages: Package[];
  /** Pre-filled date/time (from a calendar click). null = dialog closed. */
  initial: NewLessonInitial | null;
};

const FREQUENCY_OPTIONS: Array<{ value: Frequency; label: string; unit: string }> = [
  { value: "once", label: "Once", unit: "" },
  { value: "daily", label: "Daily", unit: "day" },
  { value: "weekly", label: "Weekly", unit: "week" },
  { value: "monthly", label: "Monthly", unit: "month" },
];

const STATUS_UI: Record<OccurrenceStatus, { label: string; icon: typeof Check; className: string }> = {
  ok: { label: "Available", icon: Check, className: "text-success" },
  outside_hours: { label: "Outside weekly hours — will be booked", icon: TriangleAlert, className: "text-warning" },
  conflict: { label: "Skipped", icon: Ban, className: "text-danger" },
  blocked: { label: "Skipped", icon: Ban, className: "text-danger" },
  past: { label: "Skipped", icon: Ban, className: "text-danger" },
};

function emptyForm(services: Service[], locations: Location[], initial: NewLessonInitial): AdminLessonForm {
  const service = services[0];
  const location = locations.find((l) => !service || service.locationIds.length === 0 || service.locationIds.includes(l.id)) ?? locations[0];
  return {
    serviceId: service?.id ?? "",
    locationId: location?.id ?? "",
    date: initial.date,
    startTime: initial.time,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    playerLevel: "intermediate",
    playersCount: service?.minPlayers ?? 1,
    customPrice: "",
    adminNotes: "",
    frequency: "once",
    interval: 1,
    endType: "count",
    count: 10,
    until: null,
    notify: false,
    packageId: "",
    locale: "fr",
    ...initial.prefill,
  };
}

export function NewLessonDialog({ services, locations, packages, initial }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const open = initial !== null;

  const close = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("new");
    next.delete("from");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={() => open && close()}
      className="m-0 h-dvh max-h-dvh w-full max-w-none bg-white p-0 text-ink backdrop:bg-ink/60 backdrop:backdrop-blur-sm sm:m-auto sm:h-auto sm:max-h-[92dvh] sm:max-w-2xl sm:rounded-card sm:shadow-lift"
    >
      {open && (
        <LessonForm
          key={`${initial.date}-${initial.time}-${initial.prefill ? "prefill" : ""}`}
          titleId={titleId}
          services={services}
          locations={locations}
          packages={packages}
          initial={initial}
          onClose={close}
        />
      )}
    </dialog>
  );
}

function LessonForm({
  titleId,
  services,
  locations,
  packages,
  initial,
  onClose,
}: {
  titleId: string;
  services: Service[];
  locations: Location[];
  packages: Package[];
  initial: NewLessonInitial;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AdminLessonForm>(() => emptyForm(services, locations, initial));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [preview, setPreview] = useState<LessonPreview | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof AdminLessonForm>(key: K, value: AdminLessonForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const service = services.find((s) => s.id === form.serviceId) ?? null;
  const allowedLocations = useMemo(
    () => (service && service.locationIds.length > 0 ? locations.filter((l) => service.locationIds.includes(l.id)) : locations),
    [service, locations],
  );
  const endTime = service && form.startTime ? minutesToTime(Math.min(timeToMinutes(form.startTime) + service.durationMin, 24 * 60)) : null;
  const servicePacks = service ? packages.filter((p) => (p.isActive || p.id === form.packageId) && (p.serviceIds.length === 0 || p.serviceIds.includes(service.id))) : [];
  const selectedPack = servicePacks.find((p) => p.id === form.packageId) ?? null;
  const basePrice = service ? computePrice(service.priceCents, service.pricingUnit, form.playersCount) : null;
  const defaultPrice = basePrice !== null && selectedPack ? discountedLessonCents(basePrice, selectedPack.discountPercent) : basePrice;
  const unit = FREQUENCY_OPTIONS.find((f) => f.value === form.frequency)?.unit ?? "";

  const changeService = (id: string) => {
    const next = services.find((s) => s.id === id);
    setForm((f) => {
      const locationOk = !next || next.locationIds.length === 0 || next.locationIds.includes(f.locationId);
      const packOk = !next || packages.some((p) => p.id === f.packageId && (p.serviceIds.length === 0 || p.serviceIds.includes(next.id)));
      return {
        ...f,
        serviceId: id,
        packageId: packOk ? f.packageId : "",
        locationId: locationOk ? f.locationId : (next?.locationIds[0] ?? f.locationId),
        playersCount: next ? Math.min(Math.max(f.playersCount, next.minPlayers), next.maxPlayers) : f.playersCount,
      };
    });
  };

  const showErrors = (fieldErrors?: Record<string, string[] | undefined>) =>
    setErrors(Object.fromEntries(Object.entries(fieldErrors ?? {}).map(([k, v]) => [k, v?.[0]])));

  const runPreview = () =>
    startTransition(async () => {
      const res = await previewLessonsAction(form);
      if (res.ok && res.preview) {
        setPreview(res.preview);
        setErrors({});
      } else if (!res.ok) {
        showErrors(res.fieldErrors);
        toast.error(res.error);
      }
    });

  const create = () =>
    startTransition(async () => {
      const res = await createLessonsAction(form);
      if (!res.ok) {
        showErrors(res.fieldErrors);
        toast.error(res.error ?? "Could not create the lessons.");
        return;
      }
      toast.success(
        `${res.created} lesson${res.created === 1 ? "" : "s"} added to the calendar${res.skipped.length ? ` · ${res.skipped.length} skipped` : ""}.`,
      );
      onClose(); // navigating away from ?new re-renders the calendar with fresh data
    });

  const creatableCount = preview?.checks.filter((c) => CREATABLE.includes(c.status)).length ?? 0;

  return (
    <div className="flex h-full max-h-[inherit] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-ink text-lime">
            <CalendarPlus aria-hidden className="size-5" />
          </span>
          <div>
            <h2 id={titleId} className="text-lg font-semibold leading-tight">
              {preview ? "Review lessons" : "New lesson"}
            </h2>
            <p className="text-sm text-muted">{preview ? preview.summary : "Booked directly on your calendar as confirmed."}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-surface">
          <X aria-hidden className="size-5" />
        </button>
      </div>

      {/* Body */}
      {/* key: start each step scrolled to the top */}
      <div key={preview ? "preview" : "form"} className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {preview ? (
          <PreviewList preview={preview} />
        ) : (
          <form
            id="new-lesson-form"
            noValidate
            className="space-y-7"
            onSubmit={(e) => {
              e.preventDefault();
              runPreview();
            }}
          >
            {/* Lesson */}
            <fieldset className="space-y-4">
              <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Lesson</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="nl-service" label="Lesson type" required error={errors.serviceId}>
                  <Select id="nl-service" value={form.serviceId} onChange={(e) => changeService(e.target.value)}>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {formatDuration(s.durationMin)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field id="nl-location" label="Location" required error={errors.locationId}>
                  <Select id="nl-location" value={form.locationId} onChange={(e) => set("locationId", e.target.value)}>
                    {allowedLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field id="nl-date" label={form.frequency === "once" ? "Date" : "First lesson"} required error={errors.date}>
                  <Input id="nl-date" type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} invalid={!!errors.date} />
                </Field>
                <Field id="nl-time" label="Start time" required error={errors.startTime} hint={endTime ? `Ends at ${endTime}` : undefined}>
                  <Input id="nl-time" type="time" step={900} required value={form.startTime} onChange={(e) => set("startTime", e.target.value)} invalid={!!errors.startTime} />
                </Field>
              </div>
            </fieldset>

            {/* Repeat */}
            <fieldset>
              <legend className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                <Repeat aria-hidden className="size-4" /> Repeat
              </legend>
              <div role="radiogroup" aria-label="Repeat" className="grid grid-cols-4 gap-1 rounded-full bg-surface p-1">
                {FREQUENCY_OPTIONS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    role="radio"
                    aria-checked={form.frequency === f.value}
                    onClick={() => set("frequency", f.value)}
                    className={cn(
                      "h-10 rounded-full text-sm font-semibold transition-colors",
                      form.frequency === f.value ? "bg-ink text-white shadow-soft" : "text-muted hover:text-ink",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {form.frequency !== "once" && (
                <div className="mt-4 grid gap-4 rounded-2xl bg-surface p-4 sm:grid-cols-2">
                  <Field id="nl-interval" label={`Every … ${unit}(s)`} required error={errors.interval}>
                    <Input id="nl-interval" type="number" min={1} max={12} value={form.interval} onChange={(e) => set("interval", Number(e.target.value))} />
                  </Field>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Ends</p>
                    <label className="flex items-center gap-3 text-sm">
                      <input type="radio" name="nl-end" className="size-4 accent-ink" checked={form.endType === "count"} onChange={() => set("endType", "count")} />
                      After
                      <Input
                        aria-label="Number of lessons"
                        type="number"
                        min={1}
                        max={100}
                        value={form.count}
                        onFocus={() => set("endType", "count")}
                        onChange={(e) => set("count", Number(e.target.value))}
                        className="h-10 w-20"
                      />
                      lessons
                    </label>
                    <label className="flex items-center gap-3 text-sm">
                      <input type="radio" name="nl-end" className="size-4 accent-ink" checked={form.endType === "until"} onChange={() => set("endType", "until")} />
                      On
                      <Input
                        aria-label="Last date"
                        type="date"
                        min={form.date}
                        value={form.until ?? ""}
                        onFocus={() => set("endType", "until")}
                        onChange={(e) => set("until", e.target.value || null)}
                        className="h-10 w-44"
                        invalid={!!errors.until}
                      />
                    </label>
                    {(errors.until || errors.count) && <p className="text-sm text-danger">{errors.until ?? errors.count}</p>}
                  </div>
                </div>
              )}
            </fieldset>

            {/* Player */}
            <fieldset className="space-y-4">
              <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Player</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="nl-first" label="First name" required error={errors.firstName}>
                  <Input id="nl-first" autoComplete="off" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} invalid={!!errors.firstName} />
                </Field>
                <Field id="nl-last" label="Last name" required error={errors.lastName}>
                  <Input id="nl-last" autoComplete="off" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} invalid={!!errors.lastName} />
                </Field>
                <Field id="nl-level" label="Level" required>
                  <Select id="nl-level" value={form.playerLevel} onChange={(e) => set("playerLevel", e.target.value as PlayerLevel)}>
                    {playerLevels.map((l) => (
                      <option key={l} value={l}>
                        {en.levels[l].title}
                      </option>
                    ))}
                  </Select>
                </Field>
                {service && service.maxPlayers > 1 ? (
                  <Field id="nl-players" label="Players" required error={errors.playersCount}>
                    <Select id="nl-players" value={form.playersCount} onChange={(e) => set("playersCount", Number(e.target.value))}>
                      {Array.from({ length: service.maxPlayers - service.minPlayers + 1 }, (_, i) => service.minPlayers + i).map((n) => (
                        <option key={n} value={n}>
                          {n} players
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : (
                  <div className="hidden sm:block" />
                )}
                <Field id="nl-email" label="Email" error={errors.email}>
                  <Input id="nl-email" type="email" autoComplete="off" value={form.email} onChange={(e) => set("email", e.target.value)} invalid={!!errors.email} />
                </Field>
                <Field id="nl-phone" label="Phone" error={errors.phone}>
                  <Input id="nl-phone" type="tel" autoComplete="off" value={form.phone} onChange={(e) => set("phone", e.target.value)} invalid={!!errors.phone} />
                </Field>
              </div>
              <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium", !form.email && "opacity-50")}>
                <label className="flex items-center gap-3">
                  <Checkbox checked={form.notify && !!form.email} disabled={!form.email} onChange={(e) => set("notify", e.target.checked)} />
                  Email the schedule to the player
                </label>
                <label className="flex items-center gap-2">
                  in
                  <Select aria-label="Email language" value={form.locale} disabled={!form.email} onChange={(e) => set("locale", e.target.value as "en" | "fr")} className="h-9 w-32 text-sm">
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </Select>
                </label>
              </div>
            </fieldset>

            {/* Price & notes */}
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Price & notes</legend>
              <Field id="nl-pack" label="Lesson pack" error={errors.packageId} hint={selectedPack ? `−${selectedPack.discountPercent}% on every lesson` : "Full price"}>
                <Select id="nl-pack" value={form.packageId} onChange={(e) => set("packageId", e.target.value)}>
                  <option value="">No pack</option>
                  {servicePacks.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (−{p.discountPercent}%)
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                id="nl-price"
                label="Custom price per lesson"
                error={errors.customPrice}
                hint={defaultPrice !== null && service ? `Leave empty for ${formatPrice(defaultPrice, service.currency)}` : undefined}
              >
                <Input id="nl-price" inputMode="decimal" value={form.customPrice} onChange={(e) => set("customPrice", e.target.value)} invalid={!!errors.customPrice} />
              </Field>
              <Field id="nl-notes" label="Private notes" className="sm:col-span-2">
                <Textarea id="nl-notes" rows={2} className="min-h-20" value={form.adminNotes ?? ""} onChange={(e) => set("adminNotes", e.target.value)} />
              </Field>
            </fieldset>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="safe-bottom flex items-center justify-between gap-3 border-t border-line bg-white px-5 pt-4 sm:px-6 sm:pb-4">
        {preview ? (
          <>
            <Button variant="outline" onClick={() => setPreview(null)} disabled={pending} icon={<ArrowLeft aria-hidden className="size-4" />}>
              Edit
            </Button>
            <Button variant="secondary" onClick={create} loading={pending} disabled={creatableCount === 0} icon={<CalendarCheck2 aria-hidden className="size-4" />}>
              {creatableCount === 0 ? "No free dates" : `Add ${creatableCount} lesson${creatableCount === 1 ? "" : "s"}`}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="new-lesson-form" variant="secondary" loading={pending} arrow>
              Check availability
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function PreviewList({ preview }: { preview: LessonPreview }) {
  const ok = preview.checks.filter((c) => CREATABLE.includes(c.status)).length;
  const skipped = preview.checks.length - ok;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-success-50 p-3">
          <p className="font-display tabular text-3xl leading-none text-success">{ok}</p>
          <p className="mt-1 text-xs font-semibold text-success">To book</p>
        </div>
        <div className="rounded-2xl bg-danger-50 p-3">
          <p className="font-display tabular text-3xl leading-none text-danger">{skipped}</p>
          <p className="mt-1 text-xs font-semibold text-danger">Skipped</p>
        </div>
        <div className="rounded-2xl bg-surface p-3">
          <p className="font-display tabular text-3xl leading-none">{formatPrice(preview.priceCents, preview.currency)}</p>
          <p className="mt-1 text-xs font-semibold text-muted">Per lesson</p>
        </div>
      </div>

      <ul className="mt-5 divide-y divide-line rounded-2xl border border-line">
        {preview.checks.map((c) => {
          const ui = STATUS_UI[c.status];
          const Icon = ui.icon;
          const creatable = CREATABLE.includes(c.status);
          return (
            <li key={c.date} className={cn("flex items-start gap-3 px-4 py-3", !creatable && "bg-surface/60")}>
              <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", ui.className)} />
              <div className="min-w-0 flex-1">
                <p className={cn("tabular text-sm font-semibold", !creatable && "text-muted line-through")}>
                  {formatDateShort(c.date)}
                </p>
                <p className={cn("text-xs", ui.className)}>
                  {ui.label}
                  {c.detail && c.status !== "ok" && ` · ${c.detail}`}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {skipped > 0 && <p className="mt-3 text-xs text-muted">Skipped dates are never double-booked. Remove a block or move the other lesson to free them up.</p>}
    </div>
  );
}
