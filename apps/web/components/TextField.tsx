import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type BaseProps = { label: string; error?: string };

// text-base (16px), not the 15px this used to be — iOS Safari auto-zooms
// the whole page in when a focused input's font-size is under 16px, and
// doesn't always zoom back out cleanly afterward (e.g. once a state change
// like a success message swaps in), which is what read as "bad, zoomed
// UI" on mobile after submitting a form. One shared constant, so this
// fixes every input/textarea/select/password field in the app at once.
export const FIELD_CLASSES =
  "w-full rounded-sm border bg-surface px-3.5 py-2.5 text-base text-text outline-none transition-[border-color,box-shadow] duration-150 focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)]";

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
