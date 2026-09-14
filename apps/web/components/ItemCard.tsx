"use client";

import { formatQuantity, getItemPhotoUrl, useSupabaseClient, type ItemWithDetails, type Location } from "@ghella/shared";
import { ImageOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "./Badge";
import { LocationBreadcrumb } from "./LocationBreadcrumb";

export function ItemCard({ item, locations }: { item: ItemWithDetails; locations: Location[] }) {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const available = item.availability?.available_quantity ?? item.quantity;
  const photo = item.item_photos[0];
  const photoUrl = photo ? getItemPhotoUrl(supabase, photo.storage_path) : null;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/items/${item.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") router.push(`/items/${item.id}`);
      }}
      className="group flex cursor-pointer flex-row items-stretch gap-3 rounded-sm border border-border bg-surface p-3 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(20,33,61,0.12)] focus-visible:-translate-y-0.5 focus-visible:shadow-[0_10px_28px_rgba(20,33,61,0.12)] sm:flex-col sm:gap-0 sm:overflow-hidden sm:p-0"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-surface-alt sm:h-auto sm:w-full sm:aspect-[4/3] sm:shrink sm:rounded-none">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={item.name}
            draggable={false}
            className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff size={24} className="text-text-faint" strokeWidth={1.75} />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 sm:justify-start sm:gap-1.5 sm:p-4">
        <p className="truncate font-semibold text-text">{item.name}</p>
        {item.identification_number ? (
          <p className="truncate text-xs text-text-muted">ID: {item.identification_number}</p>
        ) : null}
        <LocationBreadcrumb
          locations={locations}
          locationId={item.location_id}
          onNavigate={(locationId) => router.push(`/browse?location=${locationId}`)}
          className="text-xs"
        />
        <div className="mt-1 flex items-center gap-2">
          <Badge
            label={`${formatQuantity(available, item.unit, item.is_approximate)} available`}
            tone={available > 0 ? "success" : "danger"}
          />
          {item.condition ? <span className="truncate text-xs text-text-faint">{item.condition}</span> : null}
        </div>
      </div>
    </div>
  );
}
