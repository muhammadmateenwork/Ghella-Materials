import { formatQuantity, getItemPhotoUrl, useSupabaseClient, type ItemWithDetails, type Location } from "@ghella/shared";
import { Image } from "expo-image";
import { ImageOff } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge } from "./Badge";
import { LocationBreadcrumb } from "./LocationBreadcrumb";
import { colors, radius, shadow, spacing, typography } from "../lib/theme";

export function ItemCard({
  item,
  locations,
  onPress,
  onNavigateLocation,
}: {
  item: ItemWithDetails;
  locations: Location[];
  onPress: () => void;
  onNavigateLocation?: (locationId: string) => void;
}) {
  const supabase = useSupabaseClient();
  const available = item.availability?.available_quantity ?? item.quantity;
  const photo = item.item_photos[0];
  const photoUrl = photo ? getItemPhotoUrl(supabase, photo.storage_path) : null;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.thumb} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <ImageOff size={20} color={colors.textFaint} strokeWidth={1.75} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        {item.identification_number ? (
          <Text style={styles.idNumber} numberOfLines={1}>
            ID: {item.identification_number}
          </Text>
        ) : null}
        <LocationBreadcrumb
          locations={locations}
          locationId={item.location_id}
          onNavigate={onNavigateLocation}
        />
        <View style={styles.badgeRow}>
          <Badge
            label={`${formatQuantity(available, item.unit, item.is_approximate)} available`}
            tone={available > 0 ? "success" : "danger"}
          />
          {item.condition ? (
            <Text style={styles.condition} numberOfLines={1}>
              {item.condition}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const THUMB_SIZE = 68;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm + 2,
    gap: spacing.sm + 2,
    ...shadow.xs,
  },
  pressed: { opacity: 0.85 },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, justifyContent: "center", gap: 3 },
  name: { ...typography.subtitle, color: colors.text },
  idNumber: { ...typography.caption, color: colors.textMuted },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
  condition: { ...typography.caption, color: colors.textFaint },
});
