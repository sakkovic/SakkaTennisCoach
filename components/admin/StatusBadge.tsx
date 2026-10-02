import { CircleCheck, CircleX, Flag, Hourglass } from "lucide-react";
import type { BookingStatus } from "@/lib/booking/types";
import { Badge } from "@/components/ui/Badge";

const config: Record<BookingStatus, { label: string; tone: "warning" | "success" | "danger" | "sky"; icon: typeof Hourglass }> = {
  pending: { label: "Pending", tone: "warning", icon: Hourglass },
  confirmed: { label: "Confirmed", tone: "success", icon: CircleCheck },
  cancelled: { label: "Cancelled", tone: "danger", icon: CircleX },
  completed: { label: "Completed", tone: "sky", icon: Flag },
};

/** Status is always conveyed by icon + text, never color alone. */
export function StatusBadge({ status }: { status: BookingStatus }) {
  const { label, tone, icon: Icon } = config[status];
  return (
    <Badge tone={tone}>
      <Icon aria-hidden className="size-3.5" />
      {label}
    </Badge>
  );
}

export const statusLabel = (s: BookingStatus) => config[s].label;
