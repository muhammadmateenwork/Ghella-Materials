"use client";

import { getDescendantLocationIds, useItemsInfinite, useItemsStats, useLocations } from "@ghella/shared";
import { Boxes, PackageCheck, PackageSearch, PackageX, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { ItemCard } from "../../../components/ItemCard";
import { ItemCardSkeleton } from "../../../components/Skeleton";
import { StackLoader } from "../../../components/StackLoader";
import { LocationDrilldown } from "../../../components/LocationDrilldown";
import { PageTitle } from "../../../components/PageTitle";
import { StatTile } from "../../../components/StatTile";
import { useLoadMoreSentinel } from "../../../components/useLoadMoreSentinel";

export default function BrowsePage() {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  // A location breadcrumb elsewhere in the app (e.g. an item's card) can deep-link
  // here to jump straight into that location's filter.
  useEffect(() => {
    const locationParam = new URLSearchParams(window.location.search).get("location");
    if (locationParam) setSelectedLocationId(locationParam);
  }, []);

  const locationsQuery = useLocations();
  const locations = locationsQuery.data ?? [];

  const locationIds = useMemo(
    () => (selectedLocationId ? getDescendantLocationIds(locations, selectedLocationId) : null),
    [locations, selectedLocationId]
  );

  const itemsQuery = useItemsInfinite(locationIds, debouncedSearch, true);
  const items = useMemo(() => itemsQuery.data?.pages.flatMap((page) => page.items) ?? [], [itemsQuery.data]);
  const statsQuery = useItemsStats(locationIds);

  const sentinelRef = useLoadMoreSentinel(
    () => itemsQuery.fetchNextPage(),
    Boolean(itemsQuery.hasNextPage) && !itemsQuery.isFetchingNextPage
  );

  return (
    <div>
      <PageTitle className="mb-5">Materials</PageTitle>

      {statsQuery.data ? (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile value={statsQuery.data.materialTypes} label="Material types" icon={Boxes} tone="primary" />
          <StatTile
            value={statsQuery.data.unitsAvailable}
            label="Units available"
            icon={PackageCheck}
            tone="success"
          />
          <div className="col-span-2 sm:col-span-1">
            <StatTile
              value={statsQuery.data.fullyReservedCount}
              label="Fully reserved"
              icon={PackageX}
              tone="danger"
            />
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex items-center gap-2 rounded-sm border border-border bg-surface px-3.5 py-2.5">
        <Search size={17} className="text-text-faint" strokeWidth={2} />
        <input
          className="flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-text-faint"
          placeholder="Search by name or ID number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mb-6">
        <LocationDrilldown
          locations={locations}
          selectedId={selectedLocationId}
          onSelect={setSelectedLocationId}
        />
      </div>

      {itemsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      ) : itemsQuery.isError ? (
        <ErrorState message={itemsQuery.error?.message} onRetry={() => itemsQuery.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={debouncedSearch ? "No materials match your search" : "No materials recorded yet"}
          subtitle={debouncedSearch ? "Try a different name or ID number." : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item, index) => (
              <div key={item.id} className="card-in" style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}>
                <ItemCard item={item} locations={locations} />
              </div>
            ))}
          </div>
          <div ref={sentinelRef} className="flex justify-center py-8">
            {itemsQuery.isFetchingNextPage ? <StackLoader size="sm" /> : null}
          </div>
        </>
      )}
    </div>
  );
}
