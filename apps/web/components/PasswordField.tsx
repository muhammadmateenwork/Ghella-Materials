"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { FIELD_CLASSES, LABEL_CLASSES } from "./TextField";

export function PasswordField({
  label,
  error,
  className = "",
  ...props
}: {
  label: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="mb-4 block">
      {label ? <span className={LABEL_CLASSES}>{label}</span> : null}
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          className={`${FIELD_CLASSES} pr-11 placeholder:text-text-faint ${
            error ? "border-danger" : "border-border"
          } ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted"
        >
          {visible ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
        </button>
      </div>
      {error ? <span className="mt-1 block text-xs font-semibold text-danger">{error}</span> : null}
    </label>
  );
}
