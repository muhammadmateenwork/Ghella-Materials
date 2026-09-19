import {
  formatQuantity,
  getFriendlyErrorMessage,
  getItemPhotoUrl,
  useDeleteItem,
  useItemsInfinite,
  useProfile,
  useSupabaseClient,
} from "@ghella/shared";
import { router } from "expo-router";
import { Image } from "expo-image";
import { ClipboardList, Download, ImageOff, Package, Pencil, Plus, Trash2 } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../../src/components/Button";
import { Card } from "../../../../src/components/Card";
import { useConfirm } from "../../../../src/components/ConfirmDialog";
import { EmptyState } from "../../../../src/components/EmptyState";
import { ErrorState } from "../../../../src/components/ErrorState";
import { ExportMaterialsModal } from "../../../../src/components/ExportMaterialsModal";
import { Screen } from "../../../../src/components/Screen";
import { StackLoader } from "../../../../src/components/StackLoader";
import { ThemedRefreshControl } from "../../../../src/components/ThemedRefreshControl";
import { useToast } from "../../../../src/components/Toast";
import { colors, spacing, typography } from "../../../../src/lib/theme";

export default function AdminItemsScreen() {
  const supabase = useSupabaseClient();
  const { profile } = useProfile();
  const itemsQuery = useItemsInfinite(undefined, undefined, false, profile?.id);
  const deleteItem = useDeleteItem();
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const items = useMemo(() => itemsQuery.data?.pages.flatMap((page) => page.items) ?? [], [itemsQuery.data]);
  const [exportOpen, setExportOpen] = useState(false);

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
        <Button title="Export" icon={Download} variant="ghost" size="sm" onPress={() => setExportOpen(true)} />
        <Button
          title="Add item"
          icon={Plus}
          size="sm"
          onPress={() => router.push("/(tabs)/admin/items/new")}
        />
      </View>

      {itemsQuery.isLoading ? (
        <StackLoader style={styles.loading} />
      ) : itemsQuery.isError ? (
        <ErrorState message={itemsQuery.error?.message} onRetry={() => itemsQuery.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Package} title="No materials yet" subtitle="Add the first item to get started." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
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
          renderItem={({ item }) => (
            <Card style={styles.row} onPress={() => router.push(`/(tabs)/admin/items/${item.id}/edit`)}>
              <View style={styles.rowContent}>
                {item.item_photos[0] ? (
                  <Image
                    source={{ uri: getItemPhotoUrl(supabase, item.item_photos[0].storage_path) }}
                    style={styles.thumb}
                    contentFit="contain"
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <ImageOff size={18} color={colors.textFaint} strokeWidth={1.75} />
                  </View>
                )}
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowMeta}>
                    {item.location.name} · Qty {formatQuantity(item.quantity, item.unit, item.is_approximate)}
                  </Text>
                </View>
                <View style={styles.rowActions}>
                  <Pressable
                    onPress={() => router.push(`/(tabs)/admin/items/${item.id}/reservations`)}
                    disabled={deleteItem.isPending && deleteItem.variables === item.id}
                    hitSlop={8}
                    style={styles.iconButton}
                    accessibilityLabel={`Reservations for ${item.name}`}
                  >
                    <ClipboardList size={16} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                  <Pressable
                    onPress={() => router.push(`/(tabs)/admin/items/${item.id}/edit`)}
                    disabled={deleteItem.isPending && deleteItem.variables === item.id}
                    hitSlop={8}
                    style={styles.iconButton}
                    accessibilityLabel={`Edit ${item.name}`}
                  >
                    <Pencil size={16} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(item)}
                    disabled={deleteItem.isPending && deleteItem.variables === item.id}
                    hitSlop={8}
                    style={styles.iconButton}
                    accessibilityLabel={`Delete ${item.name}`}
                  >
                    {deleteItem.isPending && deleteItem.variables === item.id ? (
                      <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                      <Trash2 size={16} color={colors.danger} strokeWidth={2} />
                    )}
                  </Pressable>
                </View>
              </View>
            </Card>
          )}
        />
      )}

      <ExportMaterialsModal
        visible={exportOpen}
        onClose={() => setExportOpen(false)}
        ownedByUserId={profile?.id}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  loading: { marginTop: spacing.xl },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  footer: { paddingVertical: spacing.lg },
  row: { marginBottom: spacing.sm },
  rowContent: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  thumb: { width: 44, height: 44, borderRadius: 6, backgroundColor: colors.surfaceAlt },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { ...typography.subtitle, color: colors.text },
  rowMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  rowActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  iconButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
});
