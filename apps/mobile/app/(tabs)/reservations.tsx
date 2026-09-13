import {
  getFriendlyErrorMessage,
  useCancelReservation,
  useMyReservationsInfinite,
  type ReservationWithDetails,
} from "@ghella/shared";
import { router } from "expo-router";
import { CalendarClock, PackageOpen } from "lucide-react-native";
import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Badge } from "../../src/components/Badge";
import { Card } from "../../src/components/Card";
import { useConfirm } from "../../src/components/ConfirmDialog";
import { EmptyState } from "../../src/components/EmptyState";
import { PageHeading } from "../../src/components/PageHeading";
import { Screen } from "../../src/components/Screen";
import { StackLoader } from "../../src/components/StackLoader";
import { useSuccessOverlay } from "../../src/components/SuccessOverlay";
import { ThemedRefreshControl } from "../../src/components/ThemedRefreshControl";
import { useToast } from "../../src/components/Toast";
import { colors, fonts, spacing, typography } from "../../src/lib/theme";

export default function MyReservationsScreen() {
  const reservationsQuery = useMyReservationsInfinite();
  const cancelReservation = useCancelReservation();
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const showSuccess = useSuccessOverlay();
  const reservations = useMemo(
    () => reservationsQuery.data?.pages.flatMap((page) => page.reservations) ?? [],
    [reservationsQuery.data]
  );

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

      {reservationsQuery.isLoading ? (
        <StackLoader style={styles.loading} />
      ) : reservations.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Nothing reserved yet"
          subtitle="Materials you reserve will show up here."
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
          renderItem={({ item: reservation }) => (
            <Card
              style={styles.card}
              onPress={reservation.item ? () => router.push(`/item/${reservation.item!.id}`) : undefined}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.itemName, !reservation.item && styles.itemNameRemoved]}>
                  {reservation.item?.name ?? "Material removed"}
                </Text>
                <Badge
                  label={reservation.status === "active" ? "Active" : "Cancelled"}
                  tone={reservation.status === "active" ? "success" : "neutral"}
                />
              </View>
              {reservation.item?.identification_number ? (
                <Text style={styles.meta}>ID: {reservation.item.identification_number}</Text>
              ) : null}
              <Text style={styles.meta}>Quantity: {reservation.quantity}</Text>
              <View style={styles.dateRow}>
                <CalendarClock size={13} color={colors.textFaint} strokeWidth={2} />
                <Text style={styles.meta}>
                  {new Date(reservation.created_at).toLocaleDateString()}
                </Text>
              </View>
              {reservation.status === "active" ? (
                <Text
                  style={[
                    styles.cancelLink,
                    cancelReservation.isPending &&
                      cancelReservation.variables === reservation.id &&
                      styles.cancelLinkDisabled,
                  ]}
                  onPress={
                    cancelReservation.isPending && cancelReservation.variables === reservation.id
                      ? undefined
                      : () => handleCancel(reservation)
                  }
                >
                  {cancelReservation.isPending && cancelReservation.variables === reservation.id
                    ? "Cancelling…"
                    : "Cancel reservation"}
                </Text>
              ) : null}
            </Card>
          )}
        />
      )}
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
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  footer: { paddingVertical: spacing.lg },
  card: { marginBottom: spacing.sm + 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  itemName: { ...typography.subtitle, color: colors.text, flexShrink: 1 },
  itemNameRemoved: { color: colors.textFaint, fontStyle: "italic" },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  cancelLink: { color: colors.danger, fontSize: 13, fontFamily: fonts.bodyBold, marginTop: spacing.sm },
  cancelLinkDisabled: { opacity: 0.5 },
});
