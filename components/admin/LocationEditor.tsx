"use client";

import { useState, useTransition } from "react";
import { ChevronDown, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { deleteLocationAction, saveLocationAction } from "@/actions/admin";
import type { Location } from "@/lib/booking/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";
import { ConfirmDialog } from "./ConfirmDialog";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function LocationEditor({ location, nextSortOrder = 0 }: { location?: Location; nextSortOrder?: number }) {
  const isNew = !location;
  const empty = { name: "", slug: "", address: "", city: "", mapsUrl: "", isActive: true, sortOrder: String(nextSortOrder) };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(
    location
      ? { name: location.name, slug: location.slug, address: location.address, city: location.city ?? "", mapsUrl: location.mapsUrl ?? "", isActive: location.isActive, sortOrder: String(location.sortOrder) }
      : empty,
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));
  const panelId = `location-${location?.id ?? "new"}`;

  const save = () =>
    startTransition(async () => {
      const res = await saveLocationAction({
        id: location?.id,
        name: form.name,
        slug: form.slug || slugify(form.name),
        address: form.address,
        city: form.city,
        mapsUrl: form.mapsUrl,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder),
      });
      if (res.ok) {
        toast.success(isNew ? "Location added." : "Location saved.");
        setErrors({});
        if (isNew) {
          setForm({ ...empty, sortOrder: String(nextSortOrder + 1) });
          setOpen(false);
        }
      } else {
        setErrors(Object.fromEntries(Object.entries(res.fieldErrors ?? {}).map(([k, v]) => [k, v?.[0]])));
        toast.error(res.error);
      }
    });

  const remove = () =>
    startTransition(async () => {
      if (!location) return;
      const res = await deleteLocationAction(location.id);
      setConfirmDelete(false);
      if (res.ok) toast.success("Location deleted.");
      else toast.error(res.error);
    });

  return (
    <div className={cn("rounded-card border bg-white shadow-soft", open ? "border-ink/20" : "border-line")}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={panelId} className="flex w-full items-center gap-4 px-5 py-4 text-left md:px-6">
        <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-xl", isNew ? "bg-surface" : "bg-ink text-lime")}>
          {isNew ? <Plus aria-hidden className="size-5" /> : <MapPin aria-hidden className="size-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-semibold">
            {isNew ? "New location" : location.name}
            {location && !location.isActive && <Badge tone="neutral">Inactive</Badge>}
          </span>
          {location && <span className="block truncate text-sm text-muted">{[location.address, location.city].filter(Boolean).join(", ")}</span>}
        </span>
        <ChevronDown aria-hidden className={cn("size-5 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <form
          id={panelId}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-4 border-t border-line px-5 py-5 md:px-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field id={`${panelId}-name`} label="Name" required error={errors.name}>
              <Input id={`${panelId}-name`} value={form.name} onChange={(e) => set("name", e.target.value)} onBlur={() => !form.slug && set("slug", slugify(form.name))} invalid={!!errors.name} />
            </Field>
            <Field id={`${panelId}-slug`} label="URL slug" required error={errors.slug}>
              <Input id={`${panelId}-slug`} value={form.slug} onChange={(e) => set("slug", e.target.value)} invalid={!!errors.slug} />
            </Field>
            <Field id={`${panelId}-address`} label="Address" required error={errors.address}>
              <Input id={`${panelId}-address`} value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field id={`${panelId}-city`} label="City" error={errors.city}>
              <Input id={`${panelId}-city`} value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field id={`${panelId}-maps`} label="Google Maps link" error={errors.mapsUrl}>
              <Input id={`${panelId}-maps`} type="url" value={form.mapsUrl} onChange={(e) => set("mapsUrl", e.target.value)} invalid={!!errors.mapsUrl} placeholder="https://maps.google.com/…" />
            </Field>
            <Field id={`${panelId}-sort`} label="Display order" required>
              <Input id={`${panelId}-sort`} type="number" min={0} value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium">
            <Checkbox checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active (shown in the booking flow)
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            {!isNew ? (
              <Button type="button" variant="ghost" className="text-danger hover:bg-danger-50" onClick={() => setConfirmDelete(true)} disabled={pending}>
                Delete location
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" variant="secondary" loading={pending}>
              {isNew ? "Add location" : "Save changes"}
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${location?.name}”?`}
        description="Locations with bookings can't be deleted — deactivate them instead."
        confirmLabel="Delete"
        tone="danger"
        loading={pending}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
