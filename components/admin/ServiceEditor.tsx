"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { deleteServiceAction, saveServiceAction } from "@/actions/admin";
import { formatPrice, priceUnitLabel } from "@/lib/booking/money";
import { formatDuration } from "@/lib/booking/time";
import type { Location, Service } from "@/lib/booking/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = { service?: Service; locations: Location[]; defaultCurrency: string; nextSortOrder?: number };

type FormState = {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  bestFor: string;
  includes: string;
  durationMin: string;
  price: string;
  currency: string;
  pricingUnit: Service["pricingUnit"];
  minPlayers: string;
  maxPlayers: string;
  isBookable: boolean;
  isActive: boolean;
  sortOrder: string;
  locationIds: string[];
  nameFr: string;
  shortDescriptionFr: string;
  descriptionFr: string;
  bestForFr: string;
  includesFr: string;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function toForm(s: Service | undefined, currency: string, sortOrder: number): FormState {
  return {
    name: s?.name ?? "",
    slug: s?.slug ?? "",
    shortDescription: s?.shortDescription ?? "",
    description: s?.description ?? "",
    bestFor: s?.bestFor ?? "",
    includes: s?.includes.join("\n") ?? "",
    durationMin: String(s?.durationMin ?? 60),
    price: s ? (s.priceCents / 100).toFixed(2) : "",
    currency: s?.currency ?? currency,
    pricingUnit: s?.pricingUnit ?? "per_session",
    minPlayers: String(s?.minPlayers ?? 1),
    maxPlayers: String(s?.maxPlayers ?? 1),
    isBookable: s?.isBookable ?? true,
    isActive: s?.isActive ?? true,
    sortOrder: String(s?.sortOrder ?? sortOrder),
    locationIds: s?.locationIds ?? [],
    nameFr: s?.nameFr ?? "",
    shortDescriptionFr: s?.shortDescriptionFr ?? "",
    descriptionFr: s?.descriptionFr ?? "",
    bestForFr: s?.bestForFr ?? "",
    includesFr: s?.includesFr.join("\n") ?? "",
  };
}

export function ServiceEditor({ service, locations, defaultCurrency, nextSortOrder = 0 }: Props) {
  const isNew = !service;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => toForm(service, defaultCurrency, nextSortOrder));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = () =>
    startTransition(async () => {
      const res = await saveServiceAction({
        id: service?.id,
        name: form.name,
        slug: form.slug || slugify(form.name),
        shortDescription: form.shortDescription,
        description: form.description,
        bestFor: form.bestFor,
        includes: form.includes.split("\n").map((l) => l.trim()).filter(Boolean),
        durationMin: Number(form.durationMin),
        priceCents: Math.round(Number(form.price.replace(",", ".")) * 100),
        currency: form.currency,
        pricingUnit: form.pricingUnit,
        minPlayers: Number(form.minPlayers),
        maxPlayers: Number(form.maxPlayers),
        isBookable: form.isBookable,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder),
        imagePath: service?.imagePath ?? null,
        locationIds: form.locationIds,
        nameFr: form.nameFr,
        shortDescriptionFr: form.shortDescriptionFr,
        descriptionFr: form.descriptionFr,
        bestForFr: form.bestForFr,
        includesFr: form.includesFr.split("\n").map((l) => l.trim()).filter(Boolean),
      });
      if (res.ok) {
        toast.success(isNew ? "Service created." : "Service saved.");
        setErrors({});
        if (isNew) {
          setForm(toForm(undefined, defaultCurrency, nextSortOrder + 1));
          setOpen(false);
        }
      } else {
        setErrors(Object.fromEntries(Object.entries(res.fieldErrors ?? {}).map(([k, v]) => [k, v?.[0]])));
        toast.error(res.error);
      }
    });

  const remove = () =>
    startTransition(async () => {
      if (!service) return;
      const res = await deleteServiceAction(service.id);
      setConfirmDelete(false);
      if (res.ok) toast.success("Service deleted.");
      else toast.error(res.error);
    });

  const panelId = `service-${service?.id ?? "new"}`;

  return (
    <div className={cn("rounded-card border bg-white shadow-soft", open ? "border-ink/20" : "border-line")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 px-5 py-4 text-left md:px-6"
      >
        {isNew ? (
          <span className="flex items-center gap-2 font-semibold">
            <Plus aria-hidden className="size-5" /> New service
          </span>
        ) : (
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{service.name}</span>
              {!service.isActive && <Badge tone="neutral">Hidden</Badge>}
              {service.isActive && !service.isBookable && <Badge tone="sky">Not bookable</Badge>}
            </span>
            <span className="tabular mt-0.5 block text-sm text-muted">
              {formatPrice(service.priceCents, service.currency)} {priceUnitLabel(service.pricingUnit)} · {formatDuration(service.durationMin)} · {service.minPlayers === service.maxPlayers ? service.minPlayers : `${service.minPlayers}–${service.maxPlayers}`} player(s)
            </span>
          </span>
        )}
        <ChevronDown aria-hidden className={cn("ml-auto size-5 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <form
          id={panelId}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-5 border-t border-line px-5 py-5 md:px-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field id={`${panelId}-name`} label="Name" required error={errors.name}>
              <Input id={`${panelId}-name`} value={form.name} onChange={(e) => set("name", e.target.value)} onBlur={() => !form.slug && set("slug", slugify(form.name))} invalid={!!errors.name} />
            </Field>
            <Field id={`${panelId}-slug`} label="URL slug" required error={errors.slug} hint="Used in booking links, e.g. /booking?service=private-lesson">
              <Input id={`${panelId}-slug`} value={form.slug} onChange={(e) => set("slug", e.target.value)} invalid={!!errors.slug} />
            </Field>
          </div>
          <Field id={`${panelId}-short`} label="Short description" required error={errors.shortDescription} hint="One line shown in the booking flow.">
            <Input id={`${panelId}-short`} value={form.shortDescription} maxLength={200} onChange={(e) => set("shortDescription", e.target.value)} />
          </Field>
          <Field id={`${panelId}-desc`} label="Full description" error={errors.description}>
            <Textarea id={`${panelId}-desc`} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id={`${panelId}-best`} label="Best for" error={errors.bestFor}>
              <Input id={`${panelId}-best`} value={form.bestFor} onChange={(e) => set("bestFor", e.target.value)} />
            </Field>
            <Field id={`${panelId}-includes`} label="Includes" hint="One item per line." error={errors.includes}>
              <Textarea id={`${panelId}-includes`} rows={4} className="min-h-24" value={form.includes} onChange={(e) => set("includes", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field id={`${panelId}-price`} label="Price" required error={errors.priceCents}>
              <Input id={`${panelId}-price`} inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} invalid={!!errors.priceCents} />
            </Field>
            <Field id={`${panelId}-unit`} label="Pricing" required>
              <Select id={`${panelId}-unit`} value={form.pricingUnit} onChange={(e) => set("pricingUnit", e.target.value as FormState["pricingUnit"])}>
                <option value="per_session">Per session</option>
                <option value="per_player">Per player</option>
              </Select>
            </Field>
            <Field id={`${panelId}-currency`} label="Currency" required error={errors.currency}>
              <Input id={`${panelId}-currency`} maxLength={3} value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
            </Field>
            <Field id={`${panelId}-duration`} label="Duration (min)" required error={errors.durationMin}>
              <Input id={`${panelId}-duration`} type="number" min={15} step={15} value={form.durationMin} onChange={(e) => set("durationMin", e.target.value)} />
            </Field>
            <Field id={`${panelId}-min`} label="Min players" required error={errors.minPlayers}>
              <Input id={`${panelId}-min`} type="number" min={1} max={12} value={form.minPlayers} onChange={(e) => set("minPlayers", e.target.value)} />
            </Field>
            <Field id={`${panelId}-max`} label="Max players" required error={errors.maxPlayers}>
              <Input id={`${panelId}-max`} type="number" min={1} max={12} value={form.maxPlayers} onChange={(e) => set("maxPlayers", e.target.value)} invalid={!!errors.maxPlayers} />
            </Field>
            <Field id={`${panelId}-sort`} label="Display order" required>
              <Input id={`${panelId}-sort`} type="number" min={0} value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
            </Field>
          </div>

          <details className="group rounded-2xl border border-line" open={!!form.nameFr}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold">
              <span>
                Version française <span className="font-normal text-muted">— shown on the French website (empty = English text)</span>
              </span>
              <ChevronDown aria-hidden className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-4 border-t border-line p-4 md:grid-cols-2">
              <Field id={`${panelId}-name-fr`} label="Nom (FR)" error={errors.nameFr}>
                <Input id={`${panelId}-name-fr`} lang="fr" value={form.nameFr} maxLength={120} onChange={(e) => set("nameFr", e.target.value)} />
              </Field>
              <Field id={`${panelId}-short-fr`} label="Description courte (FR)" error={errors.shortDescriptionFr}>
                <Input id={`${panelId}-short-fr`} lang="fr" value={form.shortDescriptionFr} maxLength={200} onChange={(e) => set("shortDescriptionFr", e.target.value)} />
              </Field>
              <Field id={`${panelId}-desc-fr`} label="Description complète (FR)" error={errors.descriptionFr} className="md:col-span-2">
                <Textarea id={`${panelId}-desc-fr`} lang="fr" rows={3} value={form.descriptionFr} onChange={(e) => set("descriptionFr", e.target.value)} />
              </Field>
              <Field id={`${panelId}-best-fr`} label="Idéal pour (FR)" error={errors.bestForFr}>
                <Input id={`${panelId}-best-fr`} lang="fr" value={form.bestForFr} onChange={(e) => set("bestForFr", e.target.value)} />
              </Field>
              <Field id={`${panelId}-includes-fr`} label="Inclus (FR)" hint="Un élément par ligne." error={errors.includesFr}>
                <Textarea id={`${panelId}-includes-fr`} lang="fr" rows={4} className="min-h-24" value={form.includesFr} onChange={(e) => set("includesFr", e.target.value)} />
              </Field>
            </div>
          </details>

          <fieldset>
            <legend className="text-sm font-semibold">Locations</legend>
            <p className="text-sm text-muted">Leave all unchecked to offer this service at every location.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {locations.map((l) => (
                <label key={l.id} className="flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm">
                  <Checkbox
                    checked={form.locationIds.includes(l.id)}
                    onChange={(e) => set("locationIds", e.target.checked ? [...form.locationIds, l.id] : form.locationIds.filter((x) => x !== l.id))}
                  />
                  {l.name}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-3 text-sm font-medium">
              <Checkbox checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Visible on website
            </label>
            <label className="flex items-center gap-3 text-sm font-medium">
              <Checkbox checked={form.isBookable} onChange={(e) => set("isBookable", e.target.checked)} /> Bookable online
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            {!isNew ? (
              <Button type="button" variant="ghost" className="text-danger hover:bg-danger-50" onClick={() => setConfirmDelete(true)} disabled={pending}>
                Delete service
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" variant="secondary" loading={pending}>
              {isNew ? "Create service" : "Save changes"}
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${service?.name}”?`}
        description="Services that already have bookings can't be deleted — hide them instead by unchecking “Visible on website”."
        confirmLabel="Delete"
        tone="danger"
        loading={pending}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
