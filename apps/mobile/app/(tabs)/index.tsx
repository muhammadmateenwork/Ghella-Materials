import {
  findMatchingLocationIds,
  getDescendantLocationIds,
  getFriendlyErrorMessage,
  useDeleteItem,
  useItemsInfinite,
  useLocations,
  useProfile,
  type ItemWithDetails,
} from "@ghella/shared";
import { router, useLocalSearchParams } from "expo-router";
import { PackageSearch, Plus, Search, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useConfirm } from "../../src/components/ConfirmDialog";
import { EmptyState } from "../../src/components/EmptyState";
import { ErrorState } from "../../src/components/ErrorState";
import { ItemCard } from "../../src/components/ItemCard";
import { ItemCardSkeleton } from "../../src/components/Skeleton";
import { ItemQuickView } from "../../src/components/ItemQuickView";
import { LocationDrilldown } from "../../src/components/LocationDrilldown";
import { PageHeading } from "../../src/components/PageHeading";
import { Screen } from "../../src/components/Screen";
import { StackLoader } from "../../src/components/StackLoader";
import { ThemedRefreshControl } from "../../src/components/ThemedRefreshControl";
import { useToast } from "../../src/components/Toast";
import { colors, radius, shadow, spacing, typography } from "../../src/lib/theme";

export default function BrowseScreen() {
  const { location: locationParam } = useLocalSearchParams<{ location?: string }>();
  const { profile, isMaxTier } = useProfile();
  const deleteItem = useDeleteItem();
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(locationParam ?? null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [quickViewItem, setQuickViewItem] = useState<ItemWithDetails | null>(null);

  // A location breadcrumb elsewhere (e.g. an item card) can deep-link here via
  // the `location` param to jump straight into that location's filter.
  useEffect(() => {
    if (locationParam) setSelectedLocationId(locationParam);
  }, [locationParam]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const locationsQuery = useLocations();
  const locations = locationsQuery.data ?? [];

  const locationIds = useMemo(
    () =>
      selectedLocationId
        ? getDescendantLocationIds(locations, selectedLocationId)
        : null,
    [locations, selectedLocationId]
  );
  const matchingLocationIds = useMemo(
    () => findMatchingLocationIds(locations, debouncedSearch),
    [locations, debouncedSearch]
  );

  // FlatList only ever mounts the rows near the viewport (it's already a
  // "recycler view"); pairing it with a paginated query means the database
  // is never asked for the whole materials table at once either.
  const itemsQuery = useItemsInfinite(locationIds, debouncedSearch, true, undefined, matchingLocationIds);
  const items = useMemo(() => itemsQuery.data?.pages.flatMap((page) => page.items) ?? [], [itemsQuery.data]);

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
    <Screen padded={false}>
      <View style={styles.header}>
        <PageHeading style={styles.title}>Materials</PageHeading>
        <View style={styles.searchBar}>
          <Search size={17} color={colors.textFaint} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, ID, location, notes…"
            placeholderTextColor={colors.textFaint}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")} hitSlop={8} accessibilityLabel="Clear search">
              <X size={16} color={colors.textFaint} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
        <LocationDrilldown
          locations={locations}
          selectedId={selectedLocationId}
          onSelect={setSelectedLocationId}
        />
      </View>

      {itemsQuery.isLoading ? (
        <View style={styles.list}>
          {Array.from({ length: 6 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </View>
      ) : itemsQuery.isError ? (
        <ErrorState message={itemsQuery.error?.message} onRetry={() => itemsQuery.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={debouncedSearch ? "No materials match your search" : "No materials recorded yet"}
          subtitle={debouncedSearch ? "Try a different name, ID, location, or note." : undefined}
          action={
            !debouncedSearch && isMaxTier
              ? { label: "Add material", icon: Plus, onPress: () => router.push("/(tabs)/admin/items/new") }
              : undefined
          }
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isOwner = isMaxTier && item.created_by === profile?.id;
            return (
              <ItemCard
                item={item}
                locations={locations}
                onPress={() => router.push(`/item/${item.id}`)}
                onLongPress={() => setQuickViewItem(item)}
                onNavigateLocation={(locationId) =>
                  router.push({ pathname: "/(tabs)", params: { location: locationId } })
                }
                isOwner={isOwner}
                onEdit={isOwner ? () => router.push(`/item/${item.id}/edit`) : undefined}
                onDelete={isOwner ? () => handleDelete(item) : undefined}
              />
            );
          }}
          refreshControl={
            <ThemedRefreshControl refreshing={itemsQuery.isRefetching} onRefresh={() => itemsQuery.refetch()} />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (itemsQuery.hasNextPage && !itemsQuery.isFetchingNextPage) {
              itemsQuery.fetchNextPage();
            }
          }}
          ListFooterComponent={
            itemsQuery.isFetchingNextPage ? (
              <View style={styles.footer}>
                <StackLoader size="sm" />
              </View>
            ) : null
          }
        />
      )}

      {isMaxTier ? (
        <Pressable
          onPress={() => router.push("/(tabs)/admin/items/new")}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <Plus size={20} color={colors.primaryText} strokeWidth={2.5} />
          <Text style={styles.fabText}>Add Material</Text>
        </Pressable>
      ) : null}

      <ItemQuickView
        item={quickViewItem}
        locations={locations}
        visible={quickViewItem !== null}
        onClose={() => setQuickViewItem(null)}
        onViewDetails={() => {
          if (quickViewItem) router.push(`/item/${quickViewItem.id}`);
          setQuickViewItem(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { marginBottom: spacing.md },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm + 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    fontSize: 15,
    color: colors.text,
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  footer: { paddingVertical: spacing.lg },
  fab: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.lg,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: spacing.sm + 4,
    paddingRight: spacing.md + 2,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    ...shadow.lg,
  },
  fabPressed: { transform: [{ scale: 0.95 }] },
  fabText: { ...typography.captionStrong, fontSize: 13, color: colors.primaryText, textTransform: "uppercase", letterSpacing: 0.4 },
});
