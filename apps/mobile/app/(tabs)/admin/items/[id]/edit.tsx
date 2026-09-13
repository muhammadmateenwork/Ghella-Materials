import { getFriendlyErrorMessage, useDeleteItem, useItem, useUpdateItem } from "@ghella/shared";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { Button } from "../../../../../src/components/Button";
import { useConfirm } from "../../../../../src/components/ConfirmDialog";
import { ErrorState } from "../../../../../src/components/ErrorState";
import { ItemForm } from "../../../../../src/components/ItemForm";
import { ItemPhotoManager } from "../../../../../src/components/ItemPhotoManager";
import { PageHeading } from "../../../../../src/components/PageHeading";
import { Screen } from "../../../../../src/components/Screen";
import { StackLoader } from "../../../../../src/components/StackLoader";
import { useToast } from "../../../../../src/components/Toast";
import { spacing } from "../../../../../src/lib/theme";

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemQuery = useItem(id);
  const updateItem = useUpdateItem(id);
  const deleteItem = useDeleteItem();
  const confirmDialog = useConfirm();
  const showToast = useToast();

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

  if (itemQuery.isLoading || !itemQuery.data) {
    return (
      <Screen>
        <View style={styles.center}>
          <StackLoader />
        </View>
      </Screen>
    );
  }

  const item = itemQuery.data;

  return (
    <Screen scroll>
      <PageHeading style={styles.title}>Edit material</PageHeading>

      <ItemPhotoManager itemId={item.id} photos={item.item_photos} />

      <ItemForm
        initialValues={item}
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
  title: { marginBottom: spacing.md },
  deleteButton: { marginTop: spacing.lg },
});
