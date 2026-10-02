"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Package as PackageIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { deletePackageAction, savePackageAction } from "@/actions/admin";
import { formatPrice } from "@/lib/booking/money";
import { packPricing, validityLabel } from "@/lib/booking/packages";
import type { Package, Service } from "@/lib/booking/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = { pkg?: Package; services: Service[]; nextSortOrder?: number };

export function PackageEditor({ pkg, services, nextSortOrder = 0 }: Props) {
  const isNew = !pkg;
  const empty = { name: "", description: "", lessonsCount: "10", discountPercent: "10", validityDays: "30", isActive: true, sortOrder: String(nextSortOrder), serviceIds: [] as string[], nameFr: "", descriptionFr: "" };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(
    pkg
      ? {
          name: pkg.name,
          description: pkg.description ?? "",
          lessonsCount: String(pkg.lessonsCount),
          discountPercent: String(pkg.discountPercent),
          validityDays: String(pkg.validityDays),
          isActive: pkg.isActive,
          sortOrder: String(pkg.sortOrder),
          serviceIds: pkg.serviceIds,
          nameFr: pkg.nameFr ?? "",
          descriptionFr: pkg.descriptionFr ?? "",
        }
      : empty,
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const panelId = `pack-${pkg?.id ?? "new"}`;

  const example = services.find((s) => form.serviceIds.length === 0 || form.serviceIds.includes(s.id));
  const lessons = Number(form.lessonsCount) || 0;
  const discount = Number(form.discountPercent) || 0;
  const pr = example && lessons > 0 ? packPricing(example.priceCents, { lessonsCount: lessons, discountPercent: discount }) : null;

  const save = () =>
    startTransition(async () => {
      const res = await savePackageAction({
        id: pkg?.id,
        name: form.name,
        description: form.description,
        lessonsCount: lessons,
        discountPercent: discount,
        validityDays: Number(form.validityDays),
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder),
        serviceIds: form.serviceIds,
        nameFr: form.nameFr,
        descriptionFr: form.descriptionFr,
      });
      if (res.ok) {
        toast.success(isNew ? "Pack created — it now appears on the website." : "Pack saved.");
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
      if (!pkg) return;
      const res = await deletePackageAction(pkg.id);
      setConfirmDelete(false);
      if (res.ok) toast.success("Pack deleted.");
      else toast.error(res.error);
    });

  return (
    <div className={cn("rounded-card border bg-white shadow-soft", open ? "border-ink/20" : "border-line")}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={panelId} className="flex w-full items-center gap-4 px-5 py-4 text-left md:px-6">
        <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-xl", isNew ? "bg-surface" : "bg-lime text-ink")}>
          {isNew ? <Plus aria-hidden className="size-5" /> : <PackageIcon aria-hidden className="size-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 font-semibold">
            {isNew ? "New lesson pack" : pkg.name}
            {pkg && !pkg.isActive && <Badge tone="neutral">Hidden</Badge>}
          </span>
          {pkg && (
            <span className="block text-sm text-muted">
              {pkg.lessonsCount} lessons · −{pkg.discountPercent}% · {validityLabel(pkg.validityDays)}
              {pkg.serviceIds.length > 0 && ` · ${pkg.serviceIds.length} lesson type${pkg.serviceIds.length === 1 ? "" : "s"}`}
            </span>
          )}
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
          className="space-y-5 border-t border-line px-5 py-5 md:px-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field id={`${panelId}-name`} label="Name" required error={errors.name} hint='e.g. "10-Lesson Pack"'>
              <Input id={`${panelId}-name`} value={form.name} maxLength={80} onChange={(e) => set("name", e.target.value)} invalid={!!errors.name} />
            </Field>
            <Field id={`${panelId}-desc`} label="Short description" error={errors.description}>
              <Input id={`${panelId}-desc`} value={form.description} maxLength={300} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id={`${panelId}-name-fr`} label="Nom (FR)" error={errors.nameFr} hint='ex. "Forfait 10 cours"'>
              <Input id={`${panelId}-name-fr`} lang="fr" value={form.nameFr} maxLength={80} onChange={(e) => set("nameFr", e.target.value)} />
            </Field>
            <Field id={`${panelId}-desc-fr`} label="Description courte (FR)" error={errors.descriptionFr}>
              <Input id={`${panelId}-desc-fr`} lang="fr" value={form.descriptionFr} maxLength={300} onChange={(e) => set("descriptionFr", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field id={`${panelId}-count`} label="Lessons" required error={errors.lessonsCount}>
              <Input id={`${panelId}-count`} type="number" min={2} max={50} value={form.lessonsCount} onChange={(e) => set("lessonsCount", e.target.value)} invalid={!!errors.lessonsCount} />
            </Field>
            <Field id={`${panelId}-discount`} label="Discount (%)" required error={errors.discountPercent}>
              <Input id={`${panelId}-discount`} type="number" min={0} max={90} value={form.discountPercent} onChange={(e) => set("discountPercent", e.target.value)} invalid={!!errors.discountPercent} />
            </Field>
            <Field id={`${panelId}-validity`} label="Valid for (days)" required error={errors.validityDays} hint="30 = one month">
              <Input id={`${panelId}-validity`} type="number" min={1} max={365} value={form.validityDays} onChange={(e) => set("validityDays", e.target.value)} />
            </Field>
            <Field id={`${panelId}-sort`} label="Display order" required>
              <Input id={`${panelId}-sort`} type="number" min={0} value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
            </Field>
          </div>

          {pr && example && (
            <p className="rounded-2xl bg-surface px-4 py-3 text-sm">
              Example — {example.name}:{" "}
              <span className="tabular font-semibold">
                {lessons} × {formatPrice(pr.perLessonCents, example.currency)} = {formatPrice(pr.totalCents, example.currency)}
              </span>{" "}
              <span className="font-semibold text-success">(player saves {formatPrice(pr.savingsCents, example.currency)})</span>
            </p>
          )}

          <fieldset>
            <legend className="text-sm font-semibold">Applies to</legend>
            <p className="text-sm text-muted">Leave all unchecked to offer this pack on every lesson type.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm">
                  <Checkbox
                    checked={form.serviceIds.includes(s.id)}
                    onChange={(e) => set("serviceIds", e.target.checked ? [...form.serviceIds, s.id] : form.serviceIds.filter((x) => x !== s.id))}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-3 text-sm font-medium">
            <Checkbox checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Offer on the website
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            {!isNew ? (
              <Button type="button" variant="ghost" className="text-danger hover:bg-danger-50" onClick={() => setConfirmDelete(true)} disabled={pending}>
                Delete pack
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" variant="secondary" loading={pending}>
              {isNew ? "Create pack" : "Save changes"}
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${pkg?.name}”?`}
        description="Existing bookings keep their pack details. To stop offering it but keep it for later, uncheck “Offer on the website” instead."
        confirmLabel="Delete"
        tone="danger"
        loading={pending}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
