import { formatQuantity, getFriendlyErrorMessage, reservationsToXlsx, useCancelReservation, useItemReservations } from "@ghella/shared";
import { ClipboardList, Download, Mail, MessageSquare, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "./Card";
import { useConfirm } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";
import { StackLoader } from "./StackLoader";
import { useToast } from "./Toast";
import { shareXlsx } from "../lib/exportFile";
import { colors, fonts, radius, spacing, typography } from "../lib/theme";

export function ItemReservationsList({
  itemId,
  itemName,
  unit,
  isApproximate,
  showEmptyState = false,
}: {
  itemId: string;
  itemName: string;
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
  const [isExporting, setIsExporting] = useState(false);

  const handleCancel = async (reservationId: string, reserverName: string) => {
    const confirmed = await confirmDialog({
      title: "Cancel this reservation?",
      message: `This cancels ${reserverName}'s reservation.`,
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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await shareXlsx(`${itemName}-reservations`, () => reservationsToXlsx(itemName, reservations));
    } catch (err) {
      showToast(getFriendlyErrorMessage(err), "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Reservations on this material ({reservations.length})</Text>
        <Pressable onPress={handleExport} disabled={isExporting} hitSlop={8} style={styles.exportLink}>
          <Download size={13} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.exportLinkText}>{isExporting ? "Preparing…" : "Export Excel"}</Text>
        </Pressable>
      </View>
      <View style={styles.list}>
        {reservations.map((r) => {
          const name = r.user?.name ?? "Deleted user";
          const isCancelling = cancelReservation.isPending && cancelReservation.variables === r.id;
          return (
            <Card key={r.id} style={styles.row}>
              <View style={styles.rowTop}>
                <View style={styles.identity}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                    {r.user?.email ? (
                      <View style={styles.emailRow}>
                        <Mail size={11} color={colors.textFaint} strokeWidth={2} />
                        <Text style={styles.email} numberOfLines={1}>{r.user.email}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.quantityBlock}>
                  <Text style={styles.quantityLabel}>Reserved</Text>
                  <Text style={styles.quantity}>{formatQuantity(r.quantity, unit, isApproximate)}</Text>
                </View>
              </View>

              {r.contact_info ? (
                <View style={styles.contactBox}>
                  <View style={styles.contactLabelRow}>
                    <MessageSquare size={11} color={colors.textFaint} strokeWidth={2} />
                    <Text style={styles.contactLabel}>Contact info</Text>
                  </View>
                  <Text style={styles.contactInfo}>{r.contact_info}</Text>
                </View>
              ) : null}

              {r.comments ? (
                <View style={styles.contactBox}>
                  <View style={styles.contactLabelRow}>
                    <MessageSquare size={11} color={colors.textFaint} strokeWidth={2} />
                    <Text style={styles.contactLabel}>Comments</Text>
                  </View>
                  <Text style={styles.contactInfo}>{r.comments}</Text>
                </View>
              ) : null}

              <View style={styles.cancelRow}>
                <Pressable
                  onPress={() => handleCancel(r.id, name)}
                  disabled={isCancelling}
                  hitSlop={8}
                  style={styles.cancelButton}
                >
                  <X size={13} color={colors.danger} strokeWidth={2.5} />
                  <Text style={styles.cancelLink}>{isCancelling ? "Cancelling…" : "Cancel reservation"}</Text>
                </Pressable>
              </View>
            </Card>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { marginVertical: spacing.md },
  section: { marginBottom: spacing.lg },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.sm },
  heading: { ...typography.bodyStrong, fontSize: 14, color: colors.text, flexShrink: 1 },
  exportLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  exportLinkText: { ...typography.captionStrong, color: colors.textMuted },
  list: { gap: spacing.sm + 2 },
  row: {},
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  identity: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, minWidth: 0 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { ...typography.bodyStrong, fontSize: 14, color: colors.primaryDark },
  rowInfo: { flex: 1, gap: 3, minWidth: 0 },
  emailRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { ...typography.bodyStrong, fontSize: 14, color: colors.text },
  email: { ...typography.caption, fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  quantityBlock: { alignItems: "flex-end" },
  quantityLabel: { ...typography.label, fontSize: 9, color: colors.textFaint },
  quantity: { fontFamily: fonts.display, fontSize: 18, color: colors.primary, marginTop: 1 },
  contactBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm + 2,
  },
  contactLabelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  contactLabel: { ...typography.label, fontSize: 9, color: colors.textFaint },
  contactInfo: { ...typography.caption, color: colors.text },
  cancelRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.sm + 2,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: { flexDirection: "row", alignItems: "center", gap: 5 },
  cancelLink: { ...typography.captionStrong, fontSize: 12, color: colors.danger },
});
