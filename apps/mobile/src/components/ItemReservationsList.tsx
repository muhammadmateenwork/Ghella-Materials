import { formatQuantity, getFriendlyErrorMessage, useCancelReservation, useItemReservations } from "@ghella/shared";
import { ClipboardList, Mail, User } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "./Card";
import { useConfirm } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";
import { StackLoader } from "./StackLoader";
import { useToast } from "./Toast";
import { colors, spacing, typography } from "../lib/theme";

export function ItemReservationsList({
  itemId,
  unit,
  isApproximate,
  showEmptyState = false,
}: {
  itemId: string;
  unit: string | null;
  isApproximate: boolean;
  // Inline (edit-material screen) just shows nothing when there's nothing
  // to show. The dedicated reservations screen passes this so an empty
  // list still reads as "loaded, nothing here" rather than a blank screen.
  showEmptyState?: boolean;
}) {
  const reservationsQuery = useItemReservations(itemId);
  const cancelReservation = useCancelReservation();
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const reservations = reservationsQuery.data ?? [];

  const handleCancel = async (reservationId: string, reserverName: string) => {
    const confirmed = await confirmDialog({
      title: "Cancel this reservation?",
      message: `${reserverName} will be notified (email + app) that their reservation was cancelled.`,
      confirmLabel: "Cancel reservation",
      danger: true,
    });
    if (!confirmed) return;
    cancelReservation.mutate(reservationId, {
      onSuccess: () => showToast("Reservation cancelled."),
      onError: (error) => showToast(`Couldn't cancel: ${getFriendlyErrorMessage(error)}`, "error"),
    });
  };

  if (reservationsQuery.isLoading) {
    return <StackLoader size="sm" style={styles.loading} />;
  }

  if (reservations.length === 0) {
    if (!showEmptyState) return null;
    return (
      <EmptyState icon={ClipboardList} title="No reservations yet" subtitle="Nobody has reserved this material." />
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Reservations on this material ({reservations.length})</Text>
      <View style={styles.list}>
        {reservations.map((r) => (
          <Card key={r.id} style={styles.row}>
            <View style={styles.rowTop}>
              <View style={styles.rowInfo}>
                <View style={styles.nameRow}>
                  <User size={14} color={colors.textFaint} strokeWidth={2} />
                  <Text style={styles.name}>{r.user?.name ?? "Deleted user"}</Text>
                </View>
                {r.user?.email ? (
                  <View style={styles.nameRow}>
                    <Mail size={12} color={colors.textFaint} strokeWidth={2} />
                    <Text style={styles.email}>{r.user.email}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.quantity}>{formatQuantity(r.quantity, unit, isApproximate)}</Text>
            </View>
            {r.contact_info ? <Text style={styles.contactInfo}>{r.contact_info}</Text> : null}
            <Pressable
              onPress={() => handleCancel(r.id, r.user?.name ?? "This person")}
              disabled={cancelReservation.isPending && cancelReservation.variables === r.id}
              hitSlop={8}
            >
              <Text style={styles.cancelLink}>
                {cancelReservation.isPending && cancelReservation.variables === r.id
                  ? "Cancelling…"
                  : "Cancel reservation"}
              </Text>
            </Pressable>
          </Card>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { marginVertical: spacing.md },
  section: { marginBottom: spacing.lg },
  heading: { ...typography.bodyStrong, fontSize: 14, color: colors.text, marginBottom: spacing.sm },
  list: { gap: spacing.sm },
  row: {},
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.xs },
  rowInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { ...typography.bodyStrong, fontSize: 13, color: colors.text },
  email: { ...typography.caption, color: colors.textMuted },
  quantity: { ...typography.bodyStrong, fontSize: 13, color: colors.primary },
  contactInfo: {
    ...typography.caption,
    color: colors.textMuted,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  cancelLink: { ...typography.captionStrong, color: colors.danger },
});
