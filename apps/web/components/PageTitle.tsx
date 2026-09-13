import type { ReactNode } from "react";

/** The recurring page-heading signature: a short orange registration tick
 * beside a bold condensed caps title, echoing the corner mark on the brand
 * logomark — used at the top of every section instead of a plain heading. */
export function PageTitle({ children, className = "mb-6" }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={`flex items-center gap-2.5 font-display text-2xl font-black uppercase tracking-tight text-text sm:text-3xl ${className}`}>
      <span className="h-6 w-1.5 shrink-0 bg-primary" aria-hidden />
      {children}
    </h1>
  );
}
