import {
  formatQuantity,
  getFriendlyErrorMessage,
  getItemPhotoUrl,
  reservationFormSchema,
  useItem,
  useLocations,
  useProfile,
  useReserveItem,
  useSession,
  useSupabaseClient,
} from "@ghella/shared";
import { Image } from "expo-image";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ImageOff, PackageCheck, Tag } from "lucide-react-native";
import { useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Badge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";
import { ErrorState } from "../../src/components/ErrorState";
import { LocationBreadcrumb } from "../../src/components/LocationBreadcrumb";
import { Screen } from "../../src/components/Screen";
import { StackLoader } from "../../src/components/StackLoader";
import { useSuccessOverlay } from "../../src/components/SuccessOverlay";
import { TextField } from "../../src/components/TextField";
import { colors, fonts, radius, shadow, spacing, typography } from "../../src/lib/theme";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { session, isLoading: isSessionLoading } = useSession();
  const { profile } = useProfile();
  const itemQuery = useItem(id, { enabled: !isSessionLoading && Boolean(session) });
  const locationsQuery = useLocations();
  const reserveItem = useReserveItem();
  const showSuccess = useSuccessOverlay();
  const { width } = useWindowDimensions();

  const [quantity, setQuantity] = useState("1");
  const [contactInfo, setContactInfo] = useState(profile?.email ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);

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

  const handleReserve = () => {
    setFormError(null);
    const result = reservationFormSchema(available).safeParse({
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
    <Screen scroll padded={false}>
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
                style={{ width, height: width * 0.75 }}
                contentFit="cover"
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
          <Badge
            label={`${formatQuantity(available, null, false)} of ${formatQuantity(item.quantity, item.unit, item.is_approximate)} available`}
            tone={available > 0 ? "success" : "danger"}
          />
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

        <View style={styles.divider} />

        {available > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Reserve this material</Text>
            <TextField
              label="Quantity needed"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              error={fieldErrors.quantity}
            />
            <TextField
              label="Contact info (name, phone, or email)"
              value={contactInfo}
              onChangeText={setContactInfo}
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
  metaList: { gap: spacing.xs + 2, marginBottom: spacing.sm },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  metaText: { ...typography.body, color: colors.textMuted },
  notes: { ...typography.body, color: colors.text, marginTop: spacing.sm, lineHeight: 21 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  sectionTitle: { ...typography.title, color: colors.text, marginBottom: spacing.md },
  formError: { color: colors.danger, fontFamily: fonts.bodySemiBold, marginBottom: spacing.md },
});
