"use client";

import { formatQuantity, getItemPhotoUrl, useSupabaseClient, type ItemWithDetails, type Location } from "@ghella/shared";
import { ImageOff, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Badge } from "./Badge";
import { LocationBreadcrumb } from "./LocationBreadcrumb";

const LONG_PRESS_MS = 450;
// Cancels the long-press if the pointer has drifted this far — otherwise a
// touch-scroll on mobile web (which has no native long-press to tell drag
// from hold apart, unlike RN's Pressable) would fire the quick view mid-swipe.
const MOVE_CANCEL_PX = 10;

export function ItemCard({
  item,
  locations,
  isOwner = false,
  onEdit,
  onDelete,
  onLongPress,
}: {
  item: ItemWithDetails;
  locations: Location[];
  // Adds inline edit/delete controls for a maximum-tier user's own material
  // right on the Browse card — they don't need to go find it in Manage
  // Materials just to fix a typo.
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  // Press-and-hold quick view — web has no native long-press, so this is
  // hand-rolled from pointer events. longPressFiredRef suppresses the
  // click-navigation that would otherwise also fire on pointer-up right
  // after a long press resolves.
  onLongPress?: () => void;
}) {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const available = item.availability?.available_quantity ?? item.quantity;
  const photo = item.item_photos[0];
  const photoUrl = photo ? getItemPhotoUrl(supabase, photo.storage_path) : null;

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pressOrigin.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!onLongPress) return;
    longPressFired.current = false;
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pressOrigin.current) return;
    const dx = e.clientX - pressOrigin.current.x;
    const dy = e.clientY - pressOrigin.current.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) clearLongPressTimer();
  };

  const handleClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    router.push(`/items/${item.id}`);
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") router.push(`/items/${item.id}`);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearLongPressTimer}
      onPointerLeave={clearLongPressTimer}
      onPointerCancel={clearLongPressTimer}
      className="group relative flex cursor-pointer flex-row items-stretch gap-3 rounded-sm border border-border bg-surface p-3 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(20,33,61,0.12)] focus-visible:-translate-y-0.5 focus-visible:shadow-[0_10px_28px_rgba(20,33,61,0.12)] sm:flex-col sm:gap-0 sm:overflow-hidden sm:p-0"
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
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate font-semibold text-text">{item.name}</p>
          {isOwner ? (
            <div className="flex shrink-0 items-center gap-0.5">
              {onEdit ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  aria-label={`Edit ${item.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-surface-alt hover:text-text"
                >
                  <Pencil size={14} strokeWidth={2} />
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  aria-label={`Delete ${item.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
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
            tone={available > 0 ? "accent" : "danger"}
          />
          {item.condition ? <span className="truncate text-xs text-text-faint">{item.condition}</span> : null}
        </div>
      </div>
    </div>
  );
}
