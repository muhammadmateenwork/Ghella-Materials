"use client";

import { getFriendlyErrorMessage, useCreateItem, useUploadItemPhoto } from "@ghella/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackButton } from "../../../../../components/BackButton";
import { ItemForm } from "../../../../../components/ItemForm";
import { PageTitle } from "../../../../../components/PageTitle";
import { PendingPhotoPicker } from "../../../../../components/PendingPhotoPicker";
import { useSuccessOverlay } from "../../../../../components/SuccessOverlay";
import { useToast } from "../../../../../components/Toast";

export default function NewItemPage() {
  const createItem = useCreateItem();
  const uploadPhoto = useUploadItemPhoto();
  const router = useRouter();
  const showToast = useToast();
  const showSuccess = useSuccessOverlay();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  return (
    <div className="mx-auto max-w-lg">
      <BackButton />
      <PageTitle>Add material</PageTitle>

      <PendingPhotoPicker files={pendingFiles} onChange={setPendingFiles} />

      <ItemForm
        submitLabel="Add item"
        isSubmitting={createItem.isPending || isUploadingPhotos}
        onSubmit={(values) =>
          createItem.mutate(values, {
            onSuccess: async (item) => {
              if (pendingFiles.length > 0) {
                setIsUploadingPhotos(true);
                for (const file of pendingFiles) {
                  const body = await file.arrayBuffer();
                  const contentType = file.type || "image/jpeg";
                  const fileExt = contentType.split("/")[1] ?? "jpg";
                  try {
                    await uploadPhoto.mutateAsync({ itemId: item.id, body, fileExt, contentType });
                  } catch {
                    // one photo failing shouldn't block navigating to the
                    // item — the edit page lets them retry individually.
                  }
                }
                setIsUploadingPhotos(false);
              }
              await showSuccess(`"${item.name}" added`);
              router.replace("/admin/items");
            },
            onError: (error) => showToast(`Couldn't add item: ${getFriendlyErrorMessage(error)}`, "error"),
          })
        }
      />
    </div>
  );
}
