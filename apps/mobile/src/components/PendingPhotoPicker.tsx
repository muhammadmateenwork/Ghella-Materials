import { getFriendlyErrorMessage } from "@ghella/shared";
import type { ImagePickerAsset } from "expo-image-picker";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { pickFromLibrary, takePhoto } from "../lib/imagePicker";
import { AddPhotoTile } from "./AddPhotoTile";
import { photoPickerStyles as styles } from "./photoPickerStyles";
import { usePhotoSource } from "./PhotoSourceSheet";
import { useToast } from "./Toast";

/**
 * Lets a user stage photos before the record they belong to exists yet
 * (e.g. while creating a new item). Nothing is uploaded until the caller
 * does so explicitly, once it has a real item id to attach them to.
 */
export function PendingPhotoPicker({
  assets,
  onChange,
}: {
  assets: ImagePickerAsset[];
  onChange: (assets: ImagePickerAsset[]) => void;
}) {
  const pickPhotoSource = usePhotoSource();
  const showToast = useToast();

  const handleAdd = async () => {
    try {
      let picked;
      if (Platform.OS === "web") {
        picked = await pickFromLibrary();
      } else {
        const source = await pickPhotoSource();
        if (!source) return;
        picked = source === "camera" ? await takePhoto() : await pickFromLibrary();
      }
      if (picked.length > 0) onChange([...assets, ...picked]);
    } catch (error) {
      showToast(getFriendlyErrorMessage(error), "error");
    }
  };

  const handleRemove = (uri: string) => {
    onChange(assets.filter((asset) => asset.uri !== uri));
  };

  return (
    <View>
      <Text style={styles.label}>Photos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {assets.map((asset) => (
          <View key={asset.uri} style={styles.photoWrap}>
            <Image source={{ uri: asset.uri }} style={styles.photo} contentFit="cover" />
            <Pressable style={styles.removeBadge} onPress={() => handleRemove(asset.uri)} hitSlop={8}>
              <X size={13} color="#fff" strokeWidth={2.5} />
            </Pressable>
          </View>
        ))}
        <AddPhotoTile onPress={handleAdd} />
      </ScrollView>
    </View>
  );
}
