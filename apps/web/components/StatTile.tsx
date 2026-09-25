import type { LucideIcon } from "lucide-react";

type Tone = "primary" | "accent" | "success" | "danger";

const TONE_CLASSES: Record<Tone, { icon: string; accent: string }> = {
  primary: { icon: "bg-primary-soft text-primary-dark", accent: "bg-primary" },
  accent: { icon: "bg-accent-soft text-accent", accent: "bg-accent" },
  success: { icon: "bg-success-soft text-success", accent: "bg-success" },
  danger: { icon: "bg-danger-soft text-danger", accent: "bg-danger" },
};

export function StatTile({
  value,
  label,
  icon: Icon,
  tone = "primary",
}: {
  value: string | number;
  label: string;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  const toneClasses = TONE_CLASSES[tone];

  return (
    <div className="group relative flex-1 overflow-hidden rounded-sm border border-border bg-surface px-4 py-3.5 transition-shadow hover:shadow-[0_4px_16px_rgba(20,33,61,0.08)]">
      <span className={`absolute inset-y-0 left-0 w-[3px] ${toneClasses.accent}`} aria-hidden />
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${toneClasses.icon}`}>
            <Icon size={17} strokeWidth={2} />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="font-display text-2xl font-semibold tabular-nums leading-none text-text">{value}</p>
          <p className="mt-1.5 truncate text-xs font-medium uppercase tracking-wide text-text-faint">{label}</p>
        </div>
      </div>
    </div>
  );
}
