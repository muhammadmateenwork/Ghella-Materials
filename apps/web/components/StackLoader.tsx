/** A loading indicator built from the actual brand mark — the three
 * ascending stacked-material bars rise and settle on their foundation
 * line, with the drafting corner-registration tick blinking like a
 * cursor, rather than a generic spinner unrelated to the logo. */
export function StackLoader({ label, size = "md" }: { label?: string; size?: "sm" | "md" | "lg" }) {
  const px = size === "sm" ? 28 : size === "lg" ? 56 : 40;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={px} height={px} viewBox="0 0 100 100" fill="none" aria-hidden>
        <rect x="14" y="76" width="72" height="4" rx="1.5" fill="var(--color-border-strong)" />
        <rect className="loader-bar-1" x="20" width="14" rx="2" fill="var(--color-primary)" />
        <rect className="loader-bar-2" x="43" width="14" rx="2" fill="var(--color-primary)" />
        <rect className="loader-bar-3" x="66" width="14" rx="2" fill="var(--color-primary)" />
        <g className="loader-tick">
          <rect x="72" y="16" width="14" height="3" rx="1.5" fill="var(--color-primary)" />
          <rect x="83" y="16" width="3" height="14" rx="1.5" fill="var(--color-primary)" />
        </g>
      </svg>
      {label ? <p className="text-xs font-medium text-text-muted">{label}</p> : null}
    </div>
  );
}
