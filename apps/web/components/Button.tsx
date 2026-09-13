"use client";

import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "md" | "sm";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-text shadow-[0_2px_0_var(--color-ink)] hover:bg-primary-dark hover:shadow-[0_3px_0_var(--color-ink)] hover:-translate-y-px active:translate-y-0.5 active:shadow-none",
  secondary: "bg-surface text-ink border border-ink hover:bg-surface-alt hover:-translate-y-px",
  danger:
    "bg-danger text-white shadow-[0_2px_0_var(--color-ink)] hover:brightness-90 hover:shadow-[0_3px_0_var(--color-ink)] hover:-translate-y-px active:translate-y-0.5 active:shadow-none",
  ghost: "bg-surface-alt text-text-muted hover:bg-border",
};

const SIZE_CLASSES: Record<Size, string> = {
  md: "min-h-[42px] px-5 py-2.5 text-[13px]",
  sm: "min-h-[34px] px-3.5 py-1.5 text-[11px]",
};

export function Button({
  children,
  icon: Icon,
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-wide transition-[color,background-color,box-shadow,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 disabled:hover:translate-y-0 disabled:hover:shadow-none ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        Icon && <Icon size={size === "sm" ? 14 : 16} strokeWidth={2.25} />
      )}
      {children}
    </button>
  );
}
