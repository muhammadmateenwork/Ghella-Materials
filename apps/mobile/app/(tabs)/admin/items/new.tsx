import { getFriendlyErrorMessage, useCreateItem, useUploadItemPhoto } from "@ghella/shared";
import { File } from "expo-file-system";
import type { ImagePickerAsset } from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { ItemForm } from "../../../../src/components/ItemForm";
import { PendingPhotoPicker } from "../../../../src/components/PendingPhotoPicker";
import { Screen } from "../../../../src/components/Screen";
import { useSuccessOverlay } from "../../../../src/components/SuccessOverlay";
import { useToast } from "../../../../src/components/Toast";

export default function NewItemScreen() {
  const createItem = useCreateItem();
  const uploadPhoto = useUploadItemPhoto();
  const showToast = useToast();
  const showSuccess = useSuccessOverlay();
  const [pendingAssets, setPendingAssets] = useState<ImagePickerAsset[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  return (
    <Screen scroll>
      <PendingPhotoPicker assets={pendingAssets} onChange={setPendingAssets} />

      <ItemForm
        submitLabel="Add item"
        isSubmitting={createItem.isPending || isUploadingPhotos}
        onSubmit={(values) =>
          createItem.mutate(values, {
            onSuccess: async (item) => {
              if (pendingAssets.length > 0) {
                setIsUploadingPhotos(true);
                for (const asset of pendingAssets) {
                  const file = new File(asset.uri);
                  const body = await file.arrayBuffer();
                  const contentType = asset.mimeType ?? "image/jpeg";
                  const fileExt = contentType.split("/")[1] ?? "jpg";
                  try {
                    await uploadPhoto.mutateAsync({ itemId: item.id, body, fileExt, contentType });
                  } catch {
                    // one photo failing shouldn't block navigating to the
                    // item — the edit screen lets them retry individually.
                  }
                }
                setIsUploadingPhotos(false);
              }
              await showSuccess(`"${item.name}" added`);
              router.replace("/(tabs)/admin/items");
            },
            onError: (error) => showToast(`Couldn't add item: ${getFriendlyErrorMessage(error)}`, "error"),
          })
        }
      />
    </Screen>
  );
}
