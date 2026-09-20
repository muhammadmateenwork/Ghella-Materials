import {
  fetchItemsForExport,
  getFriendlyErrorMessage,
  itemsToXlsx,
  useLocations,
  useSupabaseClient,
  type ExportReservationStatus,
} from "@ghella/shared";
import { Download, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Button } from "./Button";
import { DatePickerField } from "./DatePickerField";
import { useToast } from "./Toast";
import { shareXlsx } from "../lib/exportFile";
import { colors, radius, shadow, spacing, typography } from "../lib/theme";

const STATUS_OPTIONS: { value: ExportReservationStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "none", label: "Not reserved" },
  { value: "partial", label: "Partial" },
  { value: "full", label: "Fully reserved" },
];

export function ExportMaterialsModal({
  visible,
  onClose,
  ownedByUserId,
}: {
  visible: boolean;
  onClose: () => void;
  ownedByUserId?: string | null;
}) {
  const supabase = useSupabaseClient();
  const locationsQuery = useLocations();
  const showToast = useToast();
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [status, setStatus] = useState<ExportReservationStatus>("all");
  const [includeDetails, setIncludeDetails] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const items = await fetchItemsForExport(supabase, {
        ownedByUserId,
        createdFrom: createdFrom.trim() || null,
        createdTo: createdTo.trim() || null,
        reservationStatus: status,
        includeReservationDetails: includeDetails,
      });
      if (items.length === 0) {
        showToast("No materials match those filters.", "error");
        return;
      }
      await shareXlsx("ghella-materials", () => itemsToXlsx(items, locationsQuery.data ?? [], includeDetails));
      onClose();
    } catch (err) {
      showToast(`Couldn't export: ${getFriendlyErrorMessage(err)}`, "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Export Excel</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={18} color={colors.textFaint} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <DatePickerField label="Added from" value={createdFrom} onChange={setCreatedFrom} />
            </View>
            <View style={styles.dateField}>
              <DatePickerField label="Added to" value={createdTo} onChange={setCreatedTo} />
            </View>
          </View>

          <Text style={styles.label}>Reservation status</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setStatus(opt.value)}
                style={[styles.statusChip, status === opt.value && styles.statusChipSelected]}
              >
                <Text style={[styles.statusChipText, status === opt.value && styles.statusChipTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Include who reserved what{"\n"}(one row per reservation)</Text>
            <Switch
              value={includeDetails}
              onValueChange={setIncludeDetails}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={includeDetails ? colors.primary : colors.surface}
            />
          </View>

          <Button title="Export Excel" icon={Download} onPress={handleExport} loading={isExporting} style={styles.exportButton} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(12,21,38,0.5)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  card: { width: "100%", maxWidth: 400, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.lg, ...shadow.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  title: { ...typography.title, color: colors.text },
  dateRow: { flexDirection: "row", gap: spacing.sm },
  dateField: { flex: 1 },
  label: { ...typography.bodyStrong, fontSize: 13, color: colors.text, marginBottom: spacing.xs },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  statusChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusChipText: { ...typography.captionStrong, color: colors.textMuted },
  statusChipTextSelected: { color: colors.primaryText },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.md },
  switchLabel: { ...typography.caption, color: colors.textMuted, flex: 1, lineHeight: 16 },
  exportButton: {},
});
