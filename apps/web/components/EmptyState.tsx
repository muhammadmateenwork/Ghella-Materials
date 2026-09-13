import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="page-transition flex flex-1 flex-col items-center justify-center gap-2 py-20 text-center">
      <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-sm border border-border bg-surface-alt">
        <Icon size={26} className="text-text-faint" strokeWidth={1.75} />
      </div>
      <p className="text-[15px] font-semibold text-text">{title}</p>
      {subtitle ? <p className="max-w-sm text-sm text-text-muted">{subtitle}</p> : null}
    </div>
  );
}
