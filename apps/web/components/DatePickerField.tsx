"use client";

import { LABEL_CLASSES } from "./TextField";

/** The browser's own date input. A hand-rolled calendar dropdown broke
 * twice here — its 7-day grid misaligned in a narrow column, and after
 * fixing that, its popover could run off the edge of the screen with no
 * way to jump years quickly. The native picker already clamps itself to
 * the viewport and has year navigation built in, so it wins for this
 * specific field even though the rest of the app avoids default UI. */
export function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className={LABEL_CLASSES}>{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-border bg-surface px-2.5 py-2 text-sm text-text outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}
