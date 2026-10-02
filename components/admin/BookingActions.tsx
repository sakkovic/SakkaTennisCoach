"use client";

import { useState, useTransition } from "react";
import { Check, Flag, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { setBookingStatusAction } from "@/actions/admin";
import type { BookingStatus } from "@/lib/booking/types";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = {
  id: string;
  status: BookingStatus;
  playerName: string;
  compact?: boolean;
};

const successMessage: Record<BookingStatus, string> = {
  confirmed: "Booking confirmed — the player has been notified.",
  cancelled: "Booking cancelled — the player has been notified.",
  completed: "Lesson marked as completed.",
  pending: "Booking reopened as pending.",
};

export function BookingActions({ id, status, playerName, compact = false }: Props) {
  const [pending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");

  const update = (next: BookingStatus, cancelReason?: string) =>
    startTransition(async () => {
      const result = await setBookingStatusAction({ id, status: next, reason: cancelReason });
      if (result.ok) {
        toast.success(successMessage[next]);
        setCancelOpen(false);
        setReason("");
      } else {
        toast.error(result.error);
      }
    });

  const size = compact ? "sm" : "md";
  const iconClass = "size-4";

  return (
    <div className={cn("flex flex-wrap gap-2", compact && "justify-end")}>
      {status === "pending" && (
        <Button size={size} variant="secondary" loading={pending} onClick={() => update("confirmed")} icon={<Check aria-hidden className={iconClass} />}>
          Confirm<span className="sr-only"> booking for {playerName}</span>
        </Button>
      )}
      {status === "confirmed" && (
        <Button size={size} variant="outline" loading={pending} onClick={() => update("completed")} icon={<Flag aria-hidden className={iconClass} />}>
          Complete<span className="sr-only"> lesson with {playerName}</span>
        </Button>
      )}
      {(status === "pending" || status === "confirmed") && (
        <Button
          size={size}
          variant="ghost"
          className="text-danger hover:bg-danger-50"
          disabled={pending}
          onClick={() => setCancelOpen(true)}
          icon={<X aria-hidden className={iconClass} />}
        >
          Cancel<span className="sr-only"> booking for {playerName}</span>
        </Button>
      )}
      {(status === "cancelled" || status === "completed") && !compact && (
        <Button size={size} variant="outline" loading={pending} onClick={() => update(status === "cancelled" ? "pending" : "confirmed")} icon={<RotateCcw aria-hidden className={iconClass} />}>
          {status === "cancelled" ? "Reopen as pending" : "Undo completion"}
        </Button>
      )}

      <ConfirmDialog
        open={cancelOpen}
        title={`Cancel ${playerName}'s booking?`}
        description="The time slot becomes available again and the player receives a cancellation email."
        confirmLabel="Cancel booking"
        tone="danger"
        loading={pending}
        onConfirm={() => update("cancelled", reason || undefined)}
        onClose={() => setCancelOpen(false)}
      >
        <label htmlFor={`reason-${id}`} className="text-sm font-semibold">
          Reason <span className="font-normal text-muted">(optional, shared with the player)</span>
        </label>
        <Textarea id={`reason-${id}`} rows={3} className="mt-2 min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
      </ConfirmDialog>
    </div>
  );
}
