"use client";

import { formatQuantity, getItemPhotoUrl, useSupabaseClient, type ItemWithDetails, type Location } from "@ghella/shared";
import { ImageOff, Mail, PackageCheck, Tag, User, X } from "lucide-react";
import { createPortal } from "react-dom";
import { Badge } from "./Badge";
import { LocationBreadcrumb } from "./LocationBreadcrumb";

// A press-and-hold "peek" at an item's fuller details without leaving
// Browse — mirrors holding a photo in a gallery app. Read-only (no reserve
// form here); "View full details" is the way through to actually reserve.
export function ItemQuickView({
  item,
  locations,
  onClose,
  onViewDetails,
  myReservation,
}: {
  item: ItemWithDetails;
  locations: Location[];
  onClose: () => void;
  onViewDetails: () => void;
  // Shown only when opened from My Reservations — highlights what this
  // user reserved, distinct from the item's overall availability below.
  myReservation?: { quantity: number; status: "active" | "cancelled" };
}) {
  const supabase = useSupabaseClient();
  const available = item.availability?.available_quantity ?? item.quantity;
  const photo = item.item_photos[0];
  const photoUrl = photo ? getItemPhotoUrl(supabase, photo.storage_path) : null;

  // Rendered via a portal to document.body: this overlay uses position:fixed
  // to cover the viewport, but the Browse page (and every other page) wraps
  // its content in an entrance-animation div that briefly has an active
  // `transform` — and a transformed ancestor becomes the containing block
  // for `position: fixed` descendants, so without the portal this could
  // anchor to that wrapper's box instead of the true viewport.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-md bg-surface shadow-[0_20px_60px_rgba(12,21,38,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[4/3] w-full bg-surface-alt">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={item.name} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-text-faint">
              <ImageOff size={32} strokeWidth={1.5} />
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text shadow-md"
          >
            <X size={16} strokeWidth={2} />
          </button>
          {item.item_photos.length > 1 ? (
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2 py-0.5 text-xs font-semibold text-white">
              +{item.item_photos.length - 1} more photo{item.item_photos.length > 2 ? "s" : ""}
            </span>
          ) : null}
        </div>

        <div className="p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <h3 className="min-w-0 truncate font-display text-lg font-black uppercase tracking-tight text-text">
              {item.name}
            </h3>
            <Badge
              label={`${formatQuantity(available, item.unit, item.is_approximate)} available`}
              tone={available > 0 ? "accent" : "danger"}
            />
          </div>

          {myReservation ? (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-sm border border-primary bg-primary-soft px-3 py-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-primary-dark">Your reservation</p>
                <p className="font-display text-base font-black text-primary-dark">
                  {formatQuantity(myReservation.quantity, item.unit, false)}
                </p>
              </div>
              <Badge
                label={myReservation.status === "active" ? "Active" : "Cancelled"}
                tone={myReservation.status === "active" ? "teal" : "neutral"}
              />
            </div>
          ) : null}

          <div className="mb-3 flex flex-col gap-1.5">
            {item.identification_number ? (
              <p className="flex items-center gap-2 text-sm text-text-muted">
                <Tag size={14} strokeWidth={2} /> ID: {item.identification_number}
              </p>
            ) : null}
            <LocationBreadcrumb locations={locations} locationId={item.location_id} className="text-sm" />
            {item.condition ? (
              <p className="flex items-center gap-2 text-sm text-text-muted">
                <PackageCheck size={14} strokeWidth={2} /> Condition: {item.condition}
              </p>
            ) : null}
          </div>

          {item.notes ? <p className="mb-3 text-sm leading-relaxed text-text">{item.notes}</p> : null}

          {item.creator ? (
            <div className="mb-4 rounded-sm border border-border bg-surface-alt p-2.5">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-text-faint">Added by</p>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-text">
                <User size={13} className="shrink-0 text-text-faint" strokeWidth={2} />
                {item.creator.name}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-text-muted">
                <Mail size={13} className="shrink-0 text-text-faint" strokeWidth={2} />
                {item.creator.email}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onViewDetails}
            className="w-full rounded-sm bg-primary py-2.5 text-sm font-bold uppercase tracking-wide text-primary-text transition-colors hover:bg-primary-dark"
          >
            View full details
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
