"use client";

import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/lib/utils/cn";

const control =
  "block w-full rounded-input border bg-white px-4 text-base text-ink placeholder:text-muted/70 transition-colors duration-150 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-60";

const stateClasses = (invalid?: boolean) =>
  invalid ? "border-danger focus:border-danger focus:ring-danger/15" : "border-line hover:border-ink/30";

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
};

/** Label + control + helper/error text, wired up for screen readers. */
export function Field({ id, label, required, hint, error, className, children }: FieldProps) {
  const { t } = useI18n();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        ) : (
          <span className="ml-1.5 font-normal text-muted">{t.common.optional}</span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-sm text-danger">
          <CircleAlert aria-hidden className="size-4 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: ReactNode) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type InputProps = ComponentProps<"input"> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, ...props }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn(control, "h-12", stateClasses(invalid), className)} {...props} />;
});

type TextareaProps = ComponentProps<"textarea"> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, "min-h-32 resize-y py-3 leading-relaxed", stateClasses(invalid), className)}
      {...props}
    />
  );
});

type SelectProps = ComponentProps<"select"> & { invalid?: boolean };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        control,
        "h-12 appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23071c2c' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10",
        stateClasses(invalid),
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn("size-5 shrink-0 rounded-md border-line accent-ink", className)}
      {...props}
    />
  );
}
