import { getDescendantLocationIds, useItemsInfinite, useLocations } from "@ghella/shared";
import { router, useLocalSearchParams } from "expo-router";
import { PackageSearch, Search } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { EmptyState } from "../../src/components/EmptyState";
import { ErrorState } from "../../src/components/ErrorState";
import { ItemCard } from "../../src/components/ItemCard";
import { ItemCardSkeleton } from "../../src/components/Skeleton";
import { LocationDrilldown } from "../../src/components/LocationDrilldown";
import { PageHeading } from "../../src/components/PageHeading";
import { Screen } from "../../src/components/Screen";
import { StackLoader } from "../../src/components/StackLoader";
import { ThemedRefreshControl } from "../../src/components/ThemedRefreshControl";
import { colors, radius, spacing } from "../../src/lib/theme";

export default function BrowseScreen() {
  const { location: locationParam } = useLocalSearchParams<{ location?: string }>();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(locationParam ?? null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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

  // FlatList only ever mounts the rows near the viewport (it's already a
  // "recycler view"); pairing it with a paginated query means the database
  // is never asked for the whole materials table at once either.
  const itemsQuery = useItemsInfinite(locationIds, debouncedSearch, true);
  const items = useMemo(() => itemsQuery.data?.pages.flatMap((page) => page.items) ?? [], [itemsQuery.data]);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <PageHeading style={styles.title}>Materials</PageHeading>
        <View style={styles.searchBar}>
          <Search size={17} color={colors.textFaint} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or ID number"
            placeholderTextColor={colors.textFaint}
            value={search}
            onChangeText={setSearch}
          />
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
          subtitle={debouncedSearch ? "Try a different name or ID number." : undefined}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              locations={locations}
              onPress={() => router.push(`/item/${item.id}`)}
              onNavigateLocation={(locationId) =>
                router.push({ pathname: "/(tabs)", params: { location: locationId } })
              }
            />
          )}
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
});
