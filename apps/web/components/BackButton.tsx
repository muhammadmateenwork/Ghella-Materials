"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/** The recurring "go back to wherever I came from" control — a real icon
 * and a proper tap target instead of a bare "← Back" text glyph, which
 * read as an afterthought and was too small/plain to tap comfortably on
 * mobile. */
export function BackButton({
  label = "Back",
  onClick,
  className = "",
}: {
  label?: string;
  // Reservations (reached only from Manage Materials) needs a fixed
  // destination instead of real browser-back — see the commit that added
  // this override for why. Everywhere else, omit it and this just goes back.
  onClick?: () => void;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={onClick ?? (() => router.back())}
      className={`-ml-2 mb-4 flex items-center gap-1.5 rounded-sm py-2 pl-2 pr-3 text-sm font-bold text-text-muted transition-colors hover:bg-surface-alt hover:text-text ${className}`}
    >
      <ArrowLeft size={17} strokeWidth={2.5} />
      {label}
    </button>
  );
}
