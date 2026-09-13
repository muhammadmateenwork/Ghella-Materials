import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type BaseProps = { label: string; error?: string };

export const FIELD_CLASSES =
  "w-full rounded-sm border bg-surface px-3.5 py-2.5 text-[15px] text-text outline-none transition-[border-color,box-shadow] duration-150 focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)]";

export const LABEL_CLASSES = "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-text-muted";

export function TextField({
  label,
  error,
  className = "",
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="mb-4 block">
      {label ? <span className={LABEL_CLASSES}>{label}</span> : null}
      <input
        className={`${FIELD_CLASSES} placeholder:text-text-faint ${error ? "border-danger" : "border-border"} ${className}`}
        {...props}
      />
      {error ? <span className="mt-1 block text-xs font-semibold text-danger">{error}</span> : null}
    </label>
  );
}

export function TextAreaField({
  label,
  error,
  className = "",
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="mb-4 block">
      {label ? <span className={LABEL_CLASSES}>{label}</span> : null}
      <textarea
        className={`${FIELD_CLASSES} placeholder:text-text-faint ${error ? "border-danger" : "border-border"} ${className}`}
        {...props}
      />
      {error ? <span className="mt-1 block text-xs font-semibold text-danger">{error}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  error,
  className = "",
  children,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="mb-4 block">
      {label ? <span className={LABEL_CLASSES}>{label}</span> : null}
      <select
        className={`${FIELD_CLASSES} ${error ? "border-danger" : "border-border"} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error ? <span className="mt-1 block text-xs font-semibold text-danger">{error}</span> : null}
    </label>
  );
}
