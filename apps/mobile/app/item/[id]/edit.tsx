import { getFriendlyErrorMessage, useDeleteItem, useItem, useProfile, useUpdateItem } from "@ghella/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { Button } from "../../../src/components/Button";
import { useConfirm } from "../../../src/components/ConfirmDialog";
import { ErrorState } from "../../../src/components/ErrorState";
import { ItemForm } from "../../../src/components/ItemForm";
import { ItemPhotoManager } from "../../../src/components/ItemPhotoManager";
import { Screen } from "../../../src/components/Screen";
import { StackLoader } from "../../../src/components/StackLoader";
import { useToast } from "../../../src/components/Toast";
import { spacing } from "../../../src/lib/theme";

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useProfile();
  const itemQuery = useItem(id);
  const updateItem = useUpdateItem(id);
  const deleteItem = useDeleteItem();
  const confirmDialog = useConfirm();
  const showToast = useToast();

  // Only the item's own creator (or anyone, for legacy items added before
  // ownership was tracked) can edit it — everyone else gets bounced to the
  // regular read-only item view instead.
  const item = itemQuery.data;
  const canEdit = !item || item.created_by === null || item.created_by === profile?.id;
  useEffect(() => {
    if (item && !canEdit) router.replace(`/item/${id}`);
  }, [item, canEdit, id]);

  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: "Delete this material?",
      message: "This removes the item, its photos, and cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    deleteItem.mutate(id, {
      onSuccess: () => {
        showToast("Item deleted.");
        router.replace("/(tabs)/admin/items");
      },
      onError: (error) => showToast(`Couldn't delete item: ${getFriendlyErrorMessage(error)}`, "error"),
    });
  };

  if (itemQuery.isError) {
    return (
      <Screen>
        <ErrorState message={itemQuery.error?.message} onRetry={() => itemQuery.refetch()} />
      </Screen>
    );
  }

  if (itemQuery.isLoading || !item || !canEdit) {
    return (
      <Screen>
        <View style={styles.center}>
          <StackLoader />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ItemPhotoManager itemId={item.id} photos={item.item_photos} />

      <ItemForm
        initialValues={item}
        reservedQuantity={item.availability.reserved_quantity}
        submitLabel="Save changes"
        isSubmitting={updateItem.isPending}
        onSubmit={(values) =>
          updateItem.mutate(values, {
            onSuccess: () => showToast("Item details updated."),
            onError: (error) => showToast(`Couldn't save changes: ${getFriendlyErrorMessage(error)}`, "error"),
          })
        }
      />

      <Button
        title="Delete item"
        variant="danger"
        icon={Trash2}
        onPress={handleDelete}
        loading={deleteItem.isPending}
        style={styles.deleteButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  deleteButton: { marginTop: spacing.lg },
});
