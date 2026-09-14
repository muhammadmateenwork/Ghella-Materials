import type { ImagePickerAsset } from "expo-image-picker";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { pickImages } from "../lib/imagePicker";
import { AddPhotoTile } from "./AddPhotoTile";
import { photoPickerStyles as styles } from "./photoPickerStyles";

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
  const handleAdd = async () => {
    const picked = await pickImages();
    if (picked.length > 0) onChange([...assets, ...picked]);
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
