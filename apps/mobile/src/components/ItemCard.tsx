import { formatQuantity, getItemPhotoUrl, useSupabaseClient, type ItemWithDetails, type Location } from "@ghella/shared";
import { Image } from "expo-image";
import { ImageOff, Pencil, Trash2 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge } from "./Badge";
import { LocationBreadcrumb } from "./LocationBreadcrumb";
import { colors, radius, shadow, spacing, typography } from "../lib/theme";

export function ItemCard({
  item,
  locations,
  onPress,
  onLongPress,
  onNavigateLocation,
  isOwner = false,
  onEdit,
  onDelete,
}: {
  item: ItemWithDetails;
  locations: Location[];
  onPress: () => void;
  onLongPress?: () => void;
  onNavigateLocation?: (locationId: string) => void;
  // Adds inline edit/delete controls for a maximum-tier user's own material
  // right on the Browse card — they don't need to go find it in Manage
  // Materials just to fix a typo.
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const supabase = useSupabaseClient();
  const available = item.availability?.available_quantity ?? item.quantity;
  const photo = item.item_photos[0];
  const photoUrl = photo ? getItemPhotoUrl(supabase, photo.storage_path) : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.thumb} contentFit="contain" transition={150} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <ImageOff size={20} color={colors.textFaint} strokeWidth={1.75} />
        </View>
      )}

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          {isOwner ? (
            <View style={styles.ownerActions}>
              {onEdit ? (
                <Pressable onPress={onEdit} hitSlop={8} style={styles.ownerButton}>
                  <Pencil size={13} color={colors.textMuted} strokeWidth={2} />
                </Pressable>
              ) : null}
              {onDelete ? (
                <Pressable onPress={onDelete} hitSlop={8} style={styles.ownerButton}>
                  <Trash2 size={13} color={colors.danger} strokeWidth={2} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
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
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
  name: { ...typography.subtitle, color: colors.text, flexShrink: 1 },
  ownerActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  ownerButton: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  idNumber: { ...typography.caption, color: colors.textMuted },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
  condition: { ...typography.caption, color: colors.textFaint, flexShrink: 1 },
});
