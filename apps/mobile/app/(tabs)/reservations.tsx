import {
  getFriendlyErrorMessage,
  getItemPhotoUrl,
  useCancelReservation,
  useItem,
  useLocations,
  useMyReservationsInfinite,
  useSupabaseClient,
  type ReservationWithDetails,
} from "@ghella/shared";
import { Image } from "expo-image";
import { router } from "expo-router";
import { CalendarClock, ImageOff, PackageOpen, PackageSearch } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Badge } from "../../src/components/Badge";
import { Card } from "../../src/components/Card";
import { useConfirm } from "../../src/components/ConfirmDialog";
import { EmptyState } from "../../src/components/EmptyState";
import { ItemQuickView } from "../../src/components/ItemQuickView";
import { PageHeading } from "../../src/components/PageHeading";
import { Screen } from "../../src/components/Screen";
import { StackLoader } from "../../src/components/StackLoader";
import { useSuccessOverlay } from "../../src/components/SuccessOverlay";
import { ThemedRefreshControl } from "../../src/components/ThemedRefreshControl";
import { useToast } from "../../src/components/Toast";
import { colors, fonts, radius, spacing, typography } from "../../src/lib/theme";

type StatusFilter = "all" | "active" | "cancelled";
const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "cancelled", label: "Cancelled" },
];

export default function MyReservationsScreen() {
  const supabase = useSupabaseClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [quickViewReservation, setQuickViewReservation] = useState<ReservationWithDetails | null>(null);
  const reservationsQuery = useMyReservationsInfinite();
  const locationsQuery = useLocations();
  const cancelReservation = useCancelReservation();
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const showSuccess = useSuccessOverlay();
  const allReservations = useMemo(
    () => reservationsQuery.data?.pages.flatMap((page) => page.reservations) ?? [],
    [reservationsQuery.data]
  );
  const reservations = useMemo(
    () => (statusFilter === "all" ? allReservations : allReservations.filter((r) => r.status === statusFilter)),
    [allReservations, statusFilter]
  );

  // The list only carries a thumbnail-sized slice of the item — the quick
  // view needs the item's full details (location, condition, notes,
  // creator), so fetch those lazily only once a reservation is tapped.
  const quickViewItemQuery = useItem(quickViewReservation?.item?.id ?? "", {
    enabled: Boolean(quickViewReservation?.item),
  });

  const handleCancel = async (reservation: ReservationWithDetails) => {
    const confirmed = await confirmDialog({
      title: "Cancel reservation?",
      message: `Cancel your reservation of ${reservation.quantity} x ${reservation.item?.name ?? "this material"}?`,
      confirmLabel: "Cancel reservation",
      danger: true,
    });
    if (!confirmed) return;
    cancelReservation.mutate(reservation.id, {
      onSuccess: () => showSuccess("Reservation cancelled"),
      onError: (error) => showToast(getFriendlyErrorMessage(error), "error"),
    });
  };

  return (
    <Screen padded={false}>
      <PageHeading style={styles.title}>My Reservations</PageHeading>

      <View style={styles.tabRow}>
        {STATUS_TABS.map((tab) => (
          <Pressable
            key={tab.value}
            onPress={() => setStatusFilter(tab.value)}
            style={[styles.tabChip, statusFilter === tab.value && styles.tabChipSelected]}
          >
            <Text style={[styles.tabChipText, statusFilter === tab.value && styles.tabChipTextSelected]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {reservationsQuery.isLoading ? (
        <StackLoader style={styles.loading} />
      ) : reservations.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={statusFilter === "all" ? "Nothing reserved yet" : `No ${statusFilter} reservations`}
          subtitle={statusFilter === "all" ? "Materials you reserve will show up here." : "Try a different filter above."}
          action={
            statusFilter === "all"
              ? { label: "Browse materials", icon: PackageSearch, onPress: () => router.push("/(tabs)") }
              : undefined
          }
        />
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <ThemedRefreshControl
              refreshing={reservationsQuery.isRefetching}
              onRefresh={() => reservationsQuery.refetch()}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (reservationsQuery.hasNextPage && !reservationsQuery.isFetchingNextPage) {
              reservationsQuery.fetchNextPage();
            }
          }}
          ListFooterComponent={
            reservationsQuery.isFetchingNextPage ? (
              <View style={styles.footer}>
                <StackLoader size="sm" />
              </View>
            ) : null
          }
          renderItem={({ item: reservation }) => {
            const photo = reservation.item?.item_photos[0];
            const photoUrl = photo ? getItemPhotoUrl(supabase, photo.storage_path) : null;
            return (
            <Card
              style={styles.card}
              onPress={reservation.item ? () => setQuickViewReservation(reservation) : undefined}
            >
              <View style={styles.cardTop}>
                <View style={styles.thumb}>
                  {photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={styles.thumbImage} contentFit="contain" />
                  ) : (
                    <ImageOff size={16} color={colors.textFaint} strokeWidth={1.75} />
                  )}
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.itemName, !reservation.item && styles.itemNameRemoved]}>
                      {reservation.item?.name ?? "Material removed"}
                    </Text>
                    <Badge
                      label={reservation.status === "active" ? "Active" : "Cancelled"}
                      tone={reservation.status === "active" ? "teal" : "neutral"}
                    />
                  </View>
                  {reservation.item?.identification_number ? (
                    <Text style={styles.meta}>ID: {reservation.item.identification_number}</Text>
                  ) : null}
                  <Text style={styles.meta}>
                    Quantity: {reservation.quantity}
                    {reservation.item?.unit ? ` ${reservation.item.unit}` : ""}
                  </Text>
                  <View style={styles.dateRow}>
                    <CalendarClock size={13} color={colors.textFaint} strokeWidth={2} />
                    <Text style={styles.meta}>
                      {new Date(reservation.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
              {reservation.status === "active" ? (
                <Pressable
                  hitSlop={8}
                  disabled={cancelReservation.isPending && cancelReservation.variables === reservation.id}
                  onPress={() => handleCancel(reservation)}
                  style={styles.cancelLinkWrap}
                >
                  <Text
                    style={[
                      styles.cancelLink,
                      cancelReservation.isPending &&
                        cancelReservation.variables === reservation.id &&
                        styles.cancelLinkDisabled,
                    ]}
                  >
                    {cancelReservation.isPending && cancelReservation.variables === reservation.id
                      ? "Cancelling…"
                      : "Cancel reservation"}
                  </Text>
                </Pressable>
              ) : null}
            </Card>
            );
          }}
        />
      )}

      <ItemQuickView
        item={quickViewItemQuery.data ?? null}
        locations={locationsQuery.data ?? []}
        visible={Boolean(quickViewReservation)}
        myReservation={
          quickViewReservation ? { quantity: quickViewReservation.quantity, status: quickViewReservation.status } : undefined
        }
        onClose={() => setQuickViewReservation(null)}
        onViewDetails={() => {
          if (quickViewReservation?.item) router.push(`/item/${quickViewReservation.item.id}`);
          setQuickViewReservation(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  loading: { marginTop: spacing.xl },
  tabRow: {
    flexDirection: "row",
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  tabChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabChipText: { ...typography.captionStrong, color: colors.textMuted },
  tabChipTextSelected: { color: colors.primaryText },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  footer: { paddingVertical: spacing.lg },
  card: { marginBottom: spacing.sm + 2 },
  cardTop: { flexDirection: "row", gap: spacing.sm + 2 },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: { width: "100%", height: "100%" },
  cardInfo: { flex: 1, minWidth: 0 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  itemName: { ...typography.subtitle, color: colors.text, flexShrink: 1 },
  itemNameRemoved: { color: colors.textFaint, fontStyle: "italic" },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  cancelLinkWrap: { alignSelf: "flex-start", marginTop: spacing.sm, paddingVertical: 4 },
  cancelLink: { color: colors.danger, fontSize: 13, fontFamily: fonts.bodyBold },
  cancelLinkDisabled: { opacity: 0.5 },
});
