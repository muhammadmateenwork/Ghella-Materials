import {
  getFriendlyErrorMessage,
  getItemPhotoUrl,
  useDeleteItemPhoto,
  useSupabaseClient,
  useUploadItemPhoto,
  type ItemPhoto,
} from "@ghella/shared";
import { File } from "expo-file-system";
import { Image } from "expo-image";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { pickFromLibrary, takePhoto } from "../lib/imagePicker";
import { photoPickerStyles as styles } from "./photoPickerStyles";
import { AddPhotoTile } from "./AddPhotoTile";
import { useConfirm } from "./ConfirmDialog";
import { usePhotoSource } from "./PhotoSourceSheet";
import { useToast } from "./Toast";
import { X } from "lucide-react-native";

export function ItemPhotoManager({ itemId, photos }: { itemId: string; photos: ItemPhoto[] }) {
  const supabase = useSupabaseClient();
  const uploadPhoto = useUploadItemPhoto();
  const deletePhoto = useDeleteItemPhoto();
  const confirmDialog = useConfirm();
  const pickPhotoSource = usePhotoSource();
  const showToast = useToast();

  const handleAddPhoto = async () => {
    let assets;
    try {
      if (Platform.OS === "web") {
        assets = await pickFromLibrary();
      } else {
        const source = await pickPhotoSource();
        if (!source) return;
        assets = source === "camera" ? await takePhoto() : await pickFromLibrary();
      }
    } catch (error) {
      showToast(getFriendlyErrorMessage(error), "error");
      return;
    }
    for (const asset of assets) {
      const file = new File(asset.uri);
      const body = await file.arrayBuffer();
      const contentType = asset.mimeType ?? "image/jpeg";
      const fileExt = contentType.split("/")[1] ?? "jpg";
      uploadPhoto.mutate(
        { itemId, body, fileExt, contentType },
        { onError: (error) => showToast(`Upload failed: ${getFriendlyErrorMessage(error)}`, "error") }
      );
    }
  };

  const handleDeletePhoto = async (photo: ItemPhoto) => {
    const confirmed = await confirmDialog({ title: "Remove photo?", confirmLabel: "Remove", danger: true });
    if (!confirmed) return;
    deletePhoto.mutate(
      { id: photo.id, item_id: photo.item_id, storage_path: photo.storage_path },
      { onError: (error) => showToast(`Remove failed: ${getFriendlyErrorMessage(error)}`, "error") }
    );
  };

  return (
    <View>
      <Text style={styles.label}>Photos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {photos.map((photo) => {
          const isDeleting = deletePhoto.isPending && deletePhoto.variables?.id === photo.id;
          return (
            <View key={photo.id} style={styles.photoWrap}>
              <Image
                source={{ uri: getItemPhotoUrl(supabase, photo.storage_path) }}
                style={styles.photo}
                contentFit="cover"
              />
              <Pressable
                style={styles.removeBadge}
                onPress={() => handleDeletePhoto(photo)}
                disabled={isDeleting}
                hitSlop={8}
              >
                {isDeleting ? <ActivityIndicator size="small" color="#fff" /> : <X size={13} color="#fff" strokeWidth={2.5} />}
              </Pressable>
            </View>
          );
        })}
        <AddPhotoTile onPress={handleAddPhoto} loading={uploadPhoto.isPending} />
      </ScrollView>
    </View>
  );
}
