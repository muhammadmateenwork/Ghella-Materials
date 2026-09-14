"use client";

import { LayoutGrid, Package, Shield, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { href: "/browse", label: "Browse", icon: LayoutGrid },
  { href: "/reservations", label: "Reserved", icon: Package },
  { href: "/admin", label: "Manage", icon: Shield, adminOnly: true },
  { href: "/profile", label: "Profile", icon: User },
];

/** Bottom tab bar for narrow viewports — mirrors the native mobile app's
 * own tab bar exactly (same four destinations, icons, and active-state
 * color) instead of the desktop sidebar's nav pattern, so the site reads
 * as the same product on a phone as the app does. */
export function MobileTabBar({ isMaxTier }: { isMaxTier: boolean }) {
  const pathname = usePathname();
  const tabs = TABS.filter((tab) => !tab.adminOnly || isMaxTier);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 md:hidden">
      {tabs.map((tab) => {
        const active =
          tab.href === "/admin" ? pathname.startsWith("/admin") : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-bold ${
              active ? "text-primary" : "text-text-faint"
            }`}
          >
            <tab.icon size={22} strokeWidth={active ? 2.25 : 2} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
