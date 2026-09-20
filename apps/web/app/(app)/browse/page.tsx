"use client";

import {
  findMatchingLocationIds,
  getDescendantLocationIds,
  getFriendlyErrorMessage,
  useDeleteItem,
  useItemsInfinite,
  useItemsStats,
  useLocations,
  useProfile,
  type ItemWithDetails,
} from "@ghella/shared";
import { Boxes, PackageCheck, PackageSearch, PackageX, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useConfirm } from "../../../components/ConfirmDialog";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { ItemCard } from "../../../components/ItemCard";
import { ItemCardSkeleton } from "../../../components/Skeleton";
import { ItemQuickView } from "../../../components/ItemQuickView";
import { StackLoader } from "../../../components/StackLoader";
import { LocationDrilldown } from "../../../components/LocationDrilldown";
import { PageTitle } from "../../../components/PageTitle";
import { StatTile } from "../../../components/StatTile";
import { useToast } from "../../../components/Toast";
import { useLoadMoreSentinel } from "../../../components/useLoadMoreSentinel";

export default function BrowsePage() {
  const router = useRouter();
  const { profile, isMaxTier } = useProfile();
  const deleteItem = useDeleteItem();
  const confirmDialog = useConfirm();
  const showToast = useToast();

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [quickViewItem, setQuickViewItem] = useState<ItemWithDetails | null>(null);

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
  const matchingLocationIds = useMemo(
    () => findMatchingLocationIds(locations, debouncedSearch),
    [locations, debouncedSearch]
  );

  const itemsQuery = useItemsInfinite(locationIds, debouncedSearch, true, undefined, matchingLocationIds);
  const items = useMemo(() => itemsQuery.data?.pages.flatMap((page) => page.items) ?? [], [itemsQuery.data]);
  const statsQuery = useItemsStats(locationIds);

  // The empty state already offers its own "Add material" CTA — showing the
  // FAB too, on top of an otherwise empty page, was a redundant second way
  // to do the exact same thing. Gated on dataSettled (not just "not
  // loading") so the FAB doesn't flash visible during the initial fetch
  // and then disappear the instant the empty state resolves in.
  const dataSettled = !itemsQuery.isLoading && !itemsQuery.isError;
  const showEmptyAddCta = dataSettled && items.length === 0 && !debouncedSearch && isMaxTier;

  const sentinelRef = useLoadMoreSentinel(
    () => itemsQuery.fetchNextPage(),
    Boolean(itemsQuery.hasNextPage) && !itemsQuery.isFetchingNextPage
  );

  const handleDelete = async (item: { id: string; name: string }) => {
    const confirmed = await confirmDialog({
      title: "Delete this material?",
      message: `This removes "${item.name}" and its photos. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    deleteItem.mutate(item.id, {
      onSuccess: () => showToast(`"${item.name}" deleted.`),
      onError: (error) => showToast(`Couldn't delete item: ${getFriendlyErrorMessage(error)}`, "error"),
    });
  };

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
          className="flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-faint"
          placeholder="Search name, ID, location, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search ? (
          <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="text-text-faint hover:text-text">
            <X size={16} strokeWidth={2} />
          </button>
        ) : null}
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
          subtitle={debouncedSearch ? "Try a different name, ID, location, or note." : undefined}
          action={
            showEmptyAddCta
              ? { label: "Add material", icon: Plus, onClick: () => router.push("/admin/items/new") }
              : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item, index) => {
              const isOwner = isMaxTier && item.created_by === profile?.id;
              return (
                <div key={item.id} className="card-in" style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}>
                  <ItemCard
                    item={item}
                    locations={locations}
                    isOwner={isOwner}
                    onEdit={isOwner ? () => router.push(`/admin/items/${item.id}`) : undefined}
                    onDelete={isOwner ? () => handleDelete(item) : undefined}
                    onLongPress={() => setQuickViewItem(item)}
                  />
                </div>
              );
            })}
          </div>
          <div ref={sentinelRef} className="flex justify-center py-8">
            {itemsQuery.isFetchingNextPage ? <StackLoader size="sm" /> : null}
          </div>
        </>
      )}

      {isMaxTier && dataSettled && !showEmptyAddCta && typeof document !== "undefined"
        ? createPortal(
            // Portalled to document.body: the page content sits inside a
            // per-route entrance-animation wrapper that briefly has an
            // active `transform`, which would otherwise become the
            // containing block for this fixed-position button instead of
            // the real viewport.
            <button
              type="button"
              onClick={() => router.push("/admin/items/new")}
              aria-label="Add material"
              className="fixed bottom-20 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-primary pl-4 pr-5 text-primary-text shadow-[0_4px_16px_rgba(20,33,61,0.3)] transition-transform hover:-translate-y-0.5 active:scale-95 md:bottom-8 md:right-8"
            >
              <Plus size={22} strokeWidth={2.5} />
              <span className="text-sm font-bold uppercase tracking-wide">Add Material</span>
            </button>,
            document.body
          )
        : null}

      {quickViewItem ? (
        <ItemQuickView
          item={quickViewItem}
          locations={locations}
          onClose={() => setQuickViewItem(null)}
          onViewDetails={() => {
            router.push(`/items/${quickViewItem.id}`);
            setQuickViewItem(null);
          }}
        />
      ) : null}
    </div>
  );
}
