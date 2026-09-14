"use client";

import { getFriendlyErrorMessage, useDeleteItem, useItem, useProfile, useUpdateItem } from "@ghella/shared";
import { Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
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
  const { profile } = useProfile();
  const itemQuery = useItem(id);
  const updateItem = useUpdateItem(id);
  const deleteItem = useDeleteItem();
  const confirmDialog = useConfirm();
  const showToast = useToast();

  // Only the item's own creator (or anyone, for legacy items added before
  // ownership was tracked) can edit it — everyone else lands on the
  // regular read-only item view instead.
  const item = itemQuery.data;
  const canEdit = !item || item.created_by === null || item.created_by === profile?.id;
  useEffect(() => {
    if (item && !canEdit) router.replace(`/items/${id}`);
  }, [item, canEdit, id, router]);

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

  if (itemQuery.isLoading || !item || !canEdit) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <StackLoader />
      </div>
    );
  }

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
