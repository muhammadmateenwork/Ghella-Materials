import { formatQuantity, getItemPhotoUrl, useSupabaseClient, type ItemWithDetails, type Location } from "@ghella/shared";
import { Image } from "expo-image";
import { ImageOff, Mail, PackageCheck, Tag, User, X } from "lucide-react-native";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { LocationBreadcrumb } from "./LocationBreadcrumb";
import { colors, fonts, radius, shadow, spacing, typography } from "../lib/theme";

// A press-and-hold "peek" at an item's fuller details without leaving
// Browse — mirrors holding a photo in a gallery app. Read-only (no reserve
// form here); "View full details" is the way through to actually reserve.
export function ItemQuickView({
  item,
  locations,
  visible,
  onClose,
  onViewDetails,
  myReservation,
}: {
  item: ItemWithDetails | null;
  locations: Location[];
  visible: boolean;
  onClose: () => void;
  onViewDetails: () => void;
  // Shown only when opened from My Reservations — highlights what this
  // user reserved, distinct from the item's overall availability below.
  myReservation?: { quantity: number; status: "active" | "cancelled" };
}) {
  const supabase = useSupabaseClient();
  if (!item) return null;

  const available = item.availability?.available_quantity ?? item.quantity;
  const photo = item.item_photos[0];
  const photoUrl = photo ? getItemPhotoUrl(supabase, photo.storage_path) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView bounces={false}>
            <View style={styles.photoWrap}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.photo} contentFit="contain" />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <ImageOff size={32} color={colors.textFaint} strokeWidth={1.5} />
                </View>
              )}
              <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
                <X size={16} color={colors.text} strokeWidth={2} />
              </Pressable>
              {item.item_photos.length > 1 ? (
                <View style={styles.morePhotos}>
                  <Text style={styles.morePhotosText}>+{item.item_photos.length - 1} more</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <Badge
                  label={`${formatQuantity(available, item.unit, item.is_approximate)} available`}
                  tone={available > 0 ? "accent" : "danger"}
                />
              </View>

              {myReservation ? (
                <View style={styles.reservationCard}>
                  <View>
                    <Text style={styles.reservationLabel}>Your reservation</Text>
                    <Text style={styles.reservationValue}>
                      {formatQuantity(myReservation.quantity, item.unit, false)}
                    </Text>
                  </View>
                  <Badge
                    label={myReservation.status === "active" ? "Active" : "Cancelled"}
                    tone={myReservation.status === "active" ? "teal" : "neutral"}
                  />
                </View>
              ) : null}

              {item.identification_number ? (
                <View style={styles.metaRow}>
                  <Tag size={14} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.metaText}>ID: {item.identification_number}</Text>
                </View>
              ) : null}
              <LocationBreadcrumb locations={locations} locationId={item.location_id} />
              {item.condition ? (
                <View style={styles.metaRow}>
                  <PackageCheck size={14} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.metaText}>Condition: {item.condition}</Text>
                </View>
              ) : null}

              {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}

              {item.creator ? (
                <View style={styles.creatorCard}>
                  <Text style={styles.creatorLabel}>Added by</Text>
                  <View style={styles.metaRow}>
                    <User size={13} color={colors.textFaint} strokeWidth={2} />
                    <Text style={styles.creatorName}>{item.creator.name}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Mail size={13} color={colors.textFaint} strokeWidth={2} />
                    <Text style={styles.metaText}>{item.creator.email}</Text>
                  </View>
                </View>
              ) : null}

              <Button title="View full details" onPress={onViewDetails} style={styles.detailsButton} />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(12,21,38,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: "hidden",
    ...shadow.lg,
  },
  photoWrap: { width: "100%", aspectRatio: 4 / 3, backgroundColor: colors.surfaceAlt },
  photo: { width: "100%", height: "100%" },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  closeButton: {
    position: "absolute",
    top: spacing.sm + 4,
    right: spacing.sm + 4,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },
  morePhotos: {
    position: "absolute",
    bottom: spacing.sm + 4,
    right: spacing.sm + 4,
    backgroundColor: "rgba(12,21,38,0.7)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  morePhotosText: { color: "#fff", fontSize: 11, fontFamily: typography.captionStrong.fontFamily },
  body: { padding: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.sm },
  name: { ...typography.title, color: colors.text, flexShrink: 1 },
  reservationCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  reservationLabel: { ...typography.caption, fontSize: 10, color: colors.primaryDark, textTransform: "uppercase" },
  reservationValue: { fontFamily: fonts.display, fontSize: 17, color: colors.primaryDark, marginTop: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  metaText: { ...typography.body, fontSize: 13, color: colors.textMuted },
  notes: { ...typography.body, color: colors.text, marginTop: spacing.xs, marginBottom: spacing.sm, lineHeight: 20 },
  creatorCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    gap: 2,
  },
  creatorLabel: { ...typography.caption, color: colors.textFaint, marginBottom: 2 },
  creatorName: { ...typography.bodyStrong, fontSize: 13, color: colors.text },
  detailsButton: { marginTop: spacing.sm },
});
