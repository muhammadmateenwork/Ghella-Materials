"use client";

import { useProfile, useSession, useSignOut } from "@ghella/shared";
import { LogOut, LayoutGrid, MapPinned, Package, Shield, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useConfirm } from "../../components/ConfirmDialog";
import { Logomark } from "../../components/Logomark";
import { MobileTabBar } from "../../components/MobileTabBar";
import { StackLoader } from "../../components/StackLoader";

const NAV_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/browse", label: "Browse", icon: LayoutGrid },
  { href: "/reservations", label: "My Reservations", icon: Package },
];

const ADMIN_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin/items", label: "Materials", icon: Package },
  { href: "/admin/locations", label: "Locations", icon: MapPinned },
  { href: "/admin/users", label: "Users", icon: Users },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isLoading: isSessionLoading } = useSession();
  const { profile, isMaxTier } = useProfile();
  const signOut = useSignOut();
  const confirmDialog = useConfirm();

  const handleSignOut = async () => {
    const confirmed = await confirmDialog({ title: "Sign out?", confirmLabel: "Sign out", danger: true });
    if (!confirmed) return;
    signOut.mutate(undefined, { onSuccess: () => router.replace("/login") });
  };

  useEffect(() => {
    if (!isSessionLoading && !session) {
      router.replace("/login");
    }
  }, [isSessionLoading, session, router]);

  if (isSessionLoading || !session) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background">
        <StackLoader />
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-1 bg-background">
      {/* position: fixed rather than sticky — pinned to the viewport
          unconditionally, so it can never be dragged along by a scroll no
          matter what an ancestor's height/overflow does. The content
          column is offset by the same width (md:ml-64) so it never sits
          underneath it. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface md:flex">
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-5 py-5">
          <Logomark size={36} />
          <span className="font-display font-semibold tracking-tight text-text">Ghella Materials</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavGroup links={NAV_LINKS} pathname={pathname} />
          {isMaxTier ? (
            <div className="mt-6">
              <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wide text-text-faint">
                Management
              </p>
              <NavGroup links={ADMIN_LINKS} pathname={pathname} />
            </div>
          ) : null}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <Link
            href="/profile"
            className={`flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm font-semibold transition-colors ${
              pathname === "/profile" ? "bg-primary-soft text-primary-dark" : "text-text hover:bg-surface-alt"
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-text">
              {(profile?.name ?? "?").slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate">{profile?.name ?? "Profile"}</span>
            {isMaxTier ? <Shield size={14} className="text-primary" /> : null}
          </Link>
          <button
            onClick={handleSignOut}
            className="mt-1 flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-alt"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 min-h-dvh flex-1 flex-col md:ml-64">
        <main className="min-w-0 flex-1 p-4 pb-24 md:p-8 md:pb-8">
          <div key={pathname} className="page-transition mx-auto w-full max-w-5xl">
            {children}
          </div>
        </main>
      </div>

      <MobileTabBar isMaxTier={isMaxTier} />
    </div>
  );
}

function NavGroup({
  links,
  pathname,
}: {
  links: { href: string; label: string; icon: LucideIcon }[];
  pathname: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm font-semibold transition-colors ${
              active ? "bg-primary-soft text-primary-dark" : "text-text hover:bg-surface-alt"
            }`}
          >
            <link.icon size={17} strokeWidth={2} />
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
