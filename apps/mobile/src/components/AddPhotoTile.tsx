import { Camera, ImagePlus } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { colors } from "../lib/theme";
import { photoPickerStyles as styles } from "./photoPickerStyles";

export function AddPhotoTile({ onPress, loading }: { onPress: () => void; loading?: boolean }) {
  return (
    <Pressable style={styles.addPhoto} onPress={onPress} disabled={loading}>
      {loading ? (
        <Text style={styles.addPhotoText}>Uploading…</Text>
      ) : (
        <>
          <View style={styles.addPhotoIcons}>
            <Camera size={16} color={colors.primary} strokeWidth={2} />
            <ImagePlus size={16} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.addPhotoText}>Add</Text>
        </>
      )}
    </Pressable>
  );
}
