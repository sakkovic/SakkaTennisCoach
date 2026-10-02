"use client";

import { useState, useTransition } from "react";
import { CalendarX2 } from "lucide-react";
import { toast } from "sonner";
import { cancelSeriesAction } from "@/actions/admin";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { ConfirmDialog } from "./ConfirmDialog";

export function SeriesActions({ seriesId, upcoming }: { seriesId: string; upcoming: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  const cancel = () =>
    startTransition(async () => {
      const res = await cancelSeriesAction(seriesId, reason);
      if (res.ok) {
        toast.success(`${res.count ?? 0} upcoming lesson${res.count === 1 ? "" : "s"} cancelled.`);
        setOpen(false);
      } else toast.error(res.error);
    });

  if (upcoming === 0) return null;

  return (
    <>
      <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-50" onClick={() => setOpen(true)} icon={<CalendarX2 aria-hidden className="size-4" />}>
        Cancel all upcoming ({upcoming})
      </Button>
      <ConfirmDialog
        open={open}
        title={`Cancel ${upcoming} upcoming lesson${upcoming === 1 ? "" : "s"}?`}
        description="Every pending or confirmed lesson of this series from today onward is cancelled and the time slots become free again. Past lessons are kept."
        confirmLabel="Cancel series"
        tone="danger"
        loading={pending}
        onConfirm={cancel}
        onClose={() => setOpen(false)}
      >
        <label htmlFor={`series-reason-${seriesId}`} className="text-sm font-semibold">
          Reason <span className="font-normal text-muted">(optional)</span>
        </label>
        <Textarea id={`series-reason-${seriesId}`} rows={2} className="mt-2 min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
      </ConfirmDialog>
    </>
  );
}
