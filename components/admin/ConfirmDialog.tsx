"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
};

/** Accessible modal built on the native <dialog> element (focus trap + Esc for free). */
export function ConfirmDialog({ open, title, description, confirmLabel, tone = "primary", loading, onConfirm, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card bg-white p-0 text-ink shadow-lift backdrop:bg-ink/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {description && <div className="mt-2 text-sm leading-relaxed text-muted">{description}</div>}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Keep as is
          </Button>
          <Button variant={tone === "danger" ? "danger" : "secondary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
