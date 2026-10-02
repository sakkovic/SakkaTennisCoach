"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveBookingNotesAction } from "@/actions/admin";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";

export function BookingNotesForm({ id, initial }: { id: string; initial: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [pending, startTransition] = useTransition();
  const dirty = value !== (initial ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveBookingNotesAction({ id, adminNotes: value });
          if (res.ok) toast.success("Notes saved.");
          else toast.error(res.error);
        });
      }}
    >
      <label htmlFor="admin-notes" className="sr-only">
        Private notes
      </label>
      <Textarea id="admin-notes" rows={4} value={value} onChange={(e) => setValue(e.target.value)} maxLength={2000} placeholder="Private notes — only visible to you." />
      <div className="mt-3 flex justify-end">
        <Button type="submit" size="sm" variant="secondary" disabled={!dirty} loading={pending}>
          Save notes
        </Button>
      </div>
    </form>
  );
}
