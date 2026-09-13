"use client";

import { getLocationAncestors, type Location } from "@ghella/shared";
import { ChevronRight, MapPin } from "lucide-react";
import { useMemo } from "react";

export function LocationBreadcrumb({
  locations,
  locationId,
  onNavigate,
  className = "",
}: {
  locations: Location[];
  locationId: string;
  onNavigate?: (locationId: string) => void;
  className?: string;
}) {
  const ancestors = useMemo(() => getLocationAncestors(locations, locationId), [locations, locationId]);

  return (
    <p className={`flex flex-wrap items-center gap-1 text-text-muted ${className}`}>
      <MapPin size={13} className="mr-0.5 shrink-0" strokeWidth={2} />
      {ancestors.map((loc, index) => (
        <span key={loc.id} className="flex items-center gap-1">
          {index > 0 ? <ChevronRight size={11} className="text-text-faint" strokeWidth={2} /> : null}
          {onNavigate ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNavigate(loc.id);
              }}
              className="truncate hover:text-primary hover:underline"
            >
              {loc.name}
            </button>
          ) : (
            <span className="truncate">{loc.name}</span>
          )}
        </span>
      ))}
    </p>
  );
}
