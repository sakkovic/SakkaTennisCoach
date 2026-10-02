import type Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { LocaleLink } from "@/components/i18n/LocaleLink";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "outline" | "outline-dark" | "ghost" | "ghost-dark" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-[0.01em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-lime text-ink hover:bg-lime-hover hover:shadow-glow",
  secondary: "bg-ink text-white hover:bg-navy-700",
  outline: "border border-ink/15 bg-white text-ink hover:border-ink/40 hover:bg-surface",
  "outline-dark": "border border-white/30 text-white hover:border-white/60 hover:bg-white/10",
  ghost: "text-ink hover:bg-ink/5",
  "ghost-dark": "text-white hover:bg-white/10",
  danger: "bg-danger text-white hover:bg-danger/90",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-[0.9375rem]",
  lg: "h-14 px-8 text-base",
};

type Shared = {
  variant?: Variant;
  size?: Size;
  /** Adds the animated arrow used on primary calls to action. */
  arrow?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function buttonClasses({ variant = "primary", size = "md", className }: Omit<Shared, "children">) {
  return cn(base, variants[variant], sizes[size], className);
}

function Content({ icon, arrow, children }: Pick<Shared, "icon" | "arrow" | "children">) {
  return (
    <>
      {icon}
      <span>{children}</span>
      {arrow && (
        <ArrowRight
          aria-hidden
          className="size-4 transition-transform duration-200 group-hover/btn:translate-x-0.5"
        />
      )}
    </>
  );
}

type ButtonProps = Shared & ComponentProps<"button"> & { loading?: boolean };

export function Button({
  variant,
  size,
  arrow,
  icon,
  loading,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="size-4" />
          <span>{children}</span>
        </>
      ) : (
        <Content icon={icon} arrow={arrow}>
          {children}
        </Content>
      )}
    </button>
  );
}

type ButtonLinkProps = Shared & Omit<ComponentProps<typeof Link>, "children" | "className">;

export function ButtonLink({ variant, size, arrow, icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <LocaleLink className={buttonClasses({ variant, size, className })} {...props}>
      <Content icon={icon} arrow={arrow}>
        {children}
      </Content>
    </LocaleLink>
  );
}

/** For external links (tel:, mailto:, wa.me, instagram). */
export function ButtonAnchor({
  variant,
  size,
  arrow,
  icon,
  className,
  children,
  ...props
}: Shared & Omit<ComponentProps<"a">, "children" | "className">) {
  return (
    <a className={buttonClasses({ variant, size, className })} {...props}>
      <Content icon={icon} arrow={arrow}>
        {children}
      </Content>
    </a>
  );
}
