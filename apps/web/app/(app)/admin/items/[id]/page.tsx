"use client";

import { getFriendlyErrorMessage, useDeleteItem, useItem, useUpdateItem } from "@ghella/shared";
import { Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "../../../../../components/Button";
import { useConfirm } from "../../../../../components/ConfirmDialog";
import { ErrorState } from "../../../../../components/ErrorState";
import { ItemForm } from "../../../../../components/ItemForm";
import { ItemPhotoManager } from "../../../../../components/ItemPhotoManager";
import { PageTitle } from "../../../../../components/PageTitle";
import { StackLoader } from "../../../../../components/StackLoader";
import { useToast } from "../../../../../components/Toast";

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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
      onSuccess: () => router.replace("/admin/items"),
      onError: (error) => showToast(`Couldn't delete item: ${getFriendlyErrorMessage(error)}`, "error"),
    });
  };

  if (itemQuery.isError) {
    return <ErrorState message={itemQuery.error?.message} onRetry={() => itemQuery.refetch()} />;
  }

  if (itemQuery.isLoading || !itemQuery.data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <StackLoader />
      </div>
    );
  }

  const item = itemQuery.data;

  return (
    <div className="mx-auto max-w-lg">
      <PageTitle>Edit material</PageTitle>

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

      <Button variant="danger" icon={Trash2} loading={deleteItem.isPending} className="mt-6" onClick={handleDelete}>
        Delete item
      </Button>
    </div>
  );
}
