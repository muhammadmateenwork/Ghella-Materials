import { ChevronRight, ClipboardList, MapPinned, Package, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { PageTitle } from "../../../components/PageTitle";

const LINKS: { href: string; title: string; subtitle: string; icon: LucideIcon }[] = [
  { href: "/admin/items", title: "Manage Materials", subtitle: "Add, edit, or remove items and photos", icon: Package },
  { href: "/admin/locations", title: "Manage Locations", subtitle: "Add yards and sub-locations", icon: MapPinned },
  { href: "/admin/users", title: "Manage Users", subtitle: "View accounts, change access level", icon: Users },
  { href: "/admin/reservations", title: "Reservation Log", subtitle: "See every reservation across all staff", icon: ClipboardList },
];

export default function AdminHubPage() {
  return (
    <div>
      <PageTitle>Management</PageTitle>
      <div className="divide-y divide-border overflow-hidden rounded-sm border border-border bg-surface">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-4 border-l-[3px] border-l-transparent py-4 pl-4 pr-5 transition-colors hover:border-l-primary hover:bg-surface-alt"
          >
            <link.icon size={20} className="shrink-0 text-text-faint" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-text">{link.title}</p>
              <p className="truncate text-xs text-text-muted">{link.subtitle}</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-text-faint" strokeWidth={2} />
          </Link>
        ))}
      </div>
    </div>
  );
}
