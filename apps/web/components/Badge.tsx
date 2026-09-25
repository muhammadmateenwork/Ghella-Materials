type Tone = "primary" | "accent" | "teal" | "success" | "danger" | "warning" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  primary: "border-primary bg-primary-soft text-primary-dark",
  // Brand navy — for positive/neutral states (available, active), which the
  // green success tone clashed with on the navy/orange theme.
  accent: "border-accent bg-accent-soft text-accent",
  teal: "border-teal bg-teal-soft text-teal",
  success: "border-success bg-success-soft text-success",
  danger: "border-danger bg-danger-soft text-danger",
  warning: "border-warning bg-warning-soft text-warning",
  neutral: "border-border-strong bg-surface-alt text-text-muted",
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-[2px] border-l-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
