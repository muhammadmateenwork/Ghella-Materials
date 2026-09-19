import {
  formatQuantity,
  getFriendlyErrorMessage,
  getItemPhotoUrl,
  reservationFormSchema,
  useDeleteItem,
  useItem,
  useLocations,
  useProfile,
  useReserveItem,
  useSession,
  useSupabaseClient,
} from "@ghella/shared";
import { Image } from "expo-image";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ImageOff, Mail, PackageCheck, Pencil, Tag, Trash2, User } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Badge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";
import { useConfirm } from "../../src/components/ConfirmDialog";
import { ErrorState } from "../../src/components/ErrorState";
import { LocationBreadcrumb } from "../../src/components/LocationBreadcrumb";
import { Screen } from "../../src/components/Screen";
import { StackLoader } from "../../src/components/StackLoader";
import { useSuccessOverlay } from "../../src/components/SuccessOverlay";
import { TextField } from "../../src/components/TextField";
import { useToast } from "../../src/components/Toast";
import { colors, fonts, radius, shadow, spacing, typography } from "../../src/lib/theme";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { session, isLoading: isSessionLoading } = useSession();
  const { profile, isMaxTier } = useProfile();
  const itemQuery = useItem(id, { enabled: !isSessionLoading && Boolean(session) });
  const locationsQuery = useLocations();
  const reserveItem = useReserveItem();
  const deleteItem = useDeleteItem();
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const showSuccess = useSuccessOverlay();
  const { width } = useWindowDimensions();

  const [quantity, setQuantity] = useState("1");
  const [contactInfo, setContactInfo] = useState("");
  const [contactInfoTouched, setContactInfoTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    if (!contactInfoTouched && profile?.email) {
      setContactInfo(profile.email);
    }
  }, [contactInfoTouched, profile?.email]);

  if (!isSessionLoading && !session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (itemQuery.isError) {
    return (
      <Screen>
        <ErrorState message={itemQuery.error?.message} onRetry={() => itemQuery.refetch()} />
      </Screen>
    );
  }

  if (itemQuery.isLoading || !itemQuery.data) {
    return (
      <Screen>
        <View style={styles.center}>
          <StackLoader />
        </View>
      </Screen>
    );
  }

  const item = itemQuery.data;
  const available = item.availability?.available_quantity ?? item.quantity;
  const allowDecimal = !Number.isInteger(item.quantity);
  const isOwner = isMaxTier && item.created_by === profile?.id;

  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: "Delete this material?",
      message: "This removes the item, its photos, and cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    deleteItem.mutate(item.id, {
      onSuccess: () => {
        showToast("Item deleted.");
        router.back();
      },
      onError: (error) => showToast(`Couldn't delete item: ${getFriendlyErrorMessage(error)}`, "error"),
    });
  };

  const handleReserve = () => {
    setFormError(null);
    const result = reservationFormSchema(available, allowDecimal).safeParse({
      quantity,
      contact_info: contactInfo,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    reserveItem.mutate(
      {
        itemId: item.id,
        quantity: result.data.quantity,
        contactInfo: result.data.contact_info,
      },
      {
        onSuccess: async () => {
          await showSuccess(`Reserved ${result.data.quantity} x ${item.name}`);
          router.back();
        },
        onError: (error) => setFormError(getFriendlyErrorMessage(error)),
      }
    );
  };

  const handlePhotoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    setActivePhoto(page);
  };

  return (
    <Screen scroll padded={false} bottomSafeArea>
      {item.item_photos.length > 0 ? (
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handlePhotoScroll}
          >
            {item.item_photos.map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: getItemPhotoUrl(supabase, photo.storage_path) }}
                style={[{ width, height: width * 0.75 }, styles.photoBg]}
                contentFit="contain"
                transition={150}
              />
            ))}
          </ScrollView>
          {item.item_photos.length > 1 ? (
            <View style={styles.dots}>
              {item.item_photos.map((photo, index) => (
                <View
                  key={photo.id}
                  style={[styles.dot, index === activePhoto && styles.dotActive]}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={[styles.photoPlaceholder, { width, height: width * 0.6 }]}>
          <ImageOff size={32} color={colors.textFaint} strokeWidth={1.5} />
          <Text style={styles.photoPlaceholderText}>No photos yet</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.titleMetaRow}>
            <Badge
              label={`${formatQuantity(available, null, false)} of ${formatQuantity(item.quantity, item.unit, item.is_approximate)} available`}
              tone={available > 0 ? "success" : "danger"}
            />
            {isOwner ? (
              <View style={styles.ownerActions}>
                <Pressable
                  onPress={() => router.push(`/item/${item.id}/edit`)}
                  style={styles.ownerButton}
                  hitSlop={8}
                  accessibilityLabel="Edit material"
                >
                  <Pencil size={15} color={colors.textMuted} strokeWidth={2} />
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  disabled={deleteItem.isPending}
                  style={styles.ownerButton}
                  hitSlop={8}
                  accessibilityLabel="Delete material"
                >
                  <Trash2 size={15} color={colors.danger} strokeWidth={2} />
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.metaList}>
          {item.identification_number ? (
            <View style={styles.metaRow}>
              <Tag size={15} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.metaText}>ID: {item.identification_number}</Text>
            </View>
          ) : null}
          <LocationBreadcrumb
            locations={locationsQuery.data ?? []}
            locationId={item.location_id}
            onNavigate={(locationId) =>
              router.push({ pathname: "/(tabs)", params: { location: locationId } })
            }
            textStyle={styles.metaText}
          />
          {item.condition ? (
            <View style={styles.metaRow}>
              <PackageCheck size={15} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.metaText}>Condition: {item.condition}</Text>
            </View>
          ) : null}
        </View>

        {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}

        {item.creator ? (
          <View style={styles.creatorCard}>
            <Text style={styles.creatorLabel}>Added by</Text>
            <View style={styles.metaRow}>
              <User size={14} color={colors.textFaint} strokeWidth={2} />
              <Text style={styles.creatorName}>{item.creator.name}</Text>
            </View>
            <Pressable
              onPress={() => Linking.openURL(`mailto:${item.creator!.email}`)}
              style={styles.metaRow}
              hitSlop={6}
            >
              <Mail size={14} color={colors.textFaint} strokeWidth={2} />
              <Text style={styles.creatorEmail}>{item.creator.email}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.divider} />

        {available > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Reserve this material</Text>
            <TextField
              label="Quantity needed *"
              value={quantity}
              onChangeText={(text) => setQuantity(allowDecimal ? text : text.replace(/[.,]/g, ""))}
              keyboardType={allowDecimal ? "decimal-pad" : "number-pad"}
              error={fieldErrors.quantity}
            />
            <TextField
              label="Contact info (name, phone, email — anything that helps) *"
              value={contactInfo}
              onChangeText={(text) => {
                setContactInfoTouched(true);
                setContactInfo(text);
              }}
              multiline
              numberOfLines={3}
              error={fieldErrors.contact_info}
            />
            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            <Button
              title="Reserve"
              onPress={handleReserve}
              loading={reserveItem.isPending}
            />
          </View>
        ) : (
          <Text style={styles.metaText}>None currently available to reserve.</Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  photoBg: { backgroundColor: colors.surfaceAlt },
  photoPlaceholder: {
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  photoPlaceholderText: { ...typography.caption, color: colors.textFaint },
  dots: {
    position: "absolute",
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  dotActive: { backgroundColor: "#fff", width: 18 },
  body: { padding: spacing.md },
  titleRow: { gap: spacing.sm, marginBottom: spacing.md },
  name: { ...typography.display, color: colors.text },
  titleMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  ownerActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  ownerButton: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  metaList: { gap: spacing.xs + 2, marginBottom: spacing.sm },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  metaText: { ...typography.body, color: colors.textMuted },
  notes: { ...typography.body, color: colors.text, marginTop: spacing.sm, lineHeight: 21 },
  creatorCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.sm + 4,
    marginTop: spacing.md,
    gap: 4,
  },
  creatorLabel: { ...typography.caption, color: colors.textFaint, marginBottom: 2 },
  creatorName: { ...typography.bodyStrong, fontSize: 14, color: colors.text },
  creatorEmail: { ...typography.body, fontSize: 13, color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  sectionTitle: { ...typography.title, color: colors.text, marginBottom: spacing.md },
  formError: { color: colors.danger, fontFamily: fonts.bodySemiBold, marginBottom: spacing.md },
});
