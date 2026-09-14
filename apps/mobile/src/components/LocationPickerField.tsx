import {
  buildLocationTree,
  filterLocationTree,
  flattenVisibleTree,
  getAllTreeIds,
  getLocationPath,
  type FlatLocationRow,
  type Location,
} from "@ghella/shared";
import { Check, ChevronRight, MapPin, Search, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radius, spacing, typography } from "../lib/theme";

export function LocationPickerField({
  label,
  locations,
  value,
  onChange,
  error,
}: {
  label: string;
  locations: Location[];
  value: string | null;
  onChange: (locationId: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const selectedLabel = value ? getLocationPath(locations, value) : "Select a location";

  const tree = useMemo(() => buildLocationTree(locations), [locations]);
  const searching = search.trim().length > 0;
  const visibleTree = useMemo(
    () => (searching ? filterLocationTree(tree, search) : tree),
    [tree, search, searching]
  );
  const expandedIds = useMemo(
    () => (searching ? new Set(getAllTreeIds(visibleTree)) : expanded),
    [searching, visibleTree, expanded]
  );
  const rows = useMemo(() => flattenVisibleTree(visibleTree, expandedIds), [visibleTree, expandedIds]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.field, error && styles.fieldError]}
        onPress={() => setOpen(true)}
      >
        <MapPin size={16} color={colors.textMuted} strokeWidth={2} />
        <Text style={[value ? styles.value : styles.placeholder, styles.fieldText]} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <ChevronDown />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={styles.modal} edges={["top", "left", "right", "bottom"]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select location</Text>
            <Pressable onPress={close} hitSlop={8} style={styles.closeButton}>
              <X size={18} color={colors.text} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.searchBar}>
            <Search size={16} color={colors.textFaint} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search locations"
              placeholderTextColor={colors.textFaint}
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <X size={15} color={colors.textFaint} strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>

          <FlatList
            data={rows}
            keyExtractor={(row) => row.location.id}
            renderItem={({ item: row }) => (
              <TreeRow
                row={row}
                selected={value === row.location.id}
                expanded={expandedIds.has(row.location.id)}
                onToggle={() => toggleExpanded(row.location.id)}
                onSelect={() => {
                  onChange(row.location.id);
                  close();
                }}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {searching ? "No locations match your search." : "No locations yet — add one under Manage Locations."}
              </Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function ChevronDown() {
  return <ChevronRight size={16} color={colors.textFaint} strokeWidth={2} style={{ transform: [{ rotate: "90deg" }] }} />;
}

function TreeRow({
  row,
  selected,
  expanded,
  onToggle,
  onSelect,
}: {
  row: FlatLocationRow;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  return (
    <View style={[styles.row, { paddingLeft: spacing.sm + row.depth * 18 }]}>
      {row.hasChildren ? (
        <Pressable onPress={onToggle} hitSlop={8} style={styles.chevronButton}>
          <ChevronRight
            size={15}
            color={colors.textFaint}
            strokeWidth={2.25}
            style={expanded ? styles.chevronExpanded : undefined}
          />
        </Pressable>
      ) : (
        <View style={styles.chevronButton} />
      )}
      <Pressable style={styles.rowLabel} onPress={onSelect}>
        <Text style={[styles.rowText, selected && styles.rowTextSelected]} numberOfLines={1}>
          {row.location.name}
        </Text>
        {selected ? <Check size={17} color={colors.primary} strokeWidth={2.5} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { ...typography.bodyStrong, fontSize: 13, color: colors.text, marginBottom: spacing.xs },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surface,
  },
  fieldError: { borderColor: colors.danger },
  fieldText: { flex: 1 },
  value: { fontSize: 16, fontFamily: fonts.body, color: colors.text },
  placeholder: { fontSize: 16, fontFamily: fonts.body, color: colors.textFaint },
  error: { color: colors.danger, fontSize: 12, fontFamily: fonts.bodySemiBold, marginTop: spacing.xs },
  modal: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.md },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  modalTitle: { ...typography.title, color: colors.text },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 4,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm + 2, fontSize: 15, color: colors.text, fontFamily: fonts.body },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  chevronButton: {
    width: 32,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronExpanded: { transform: [{ rotate: "90deg" }] },
  rowLabel: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
  },
  rowText: { fontSize: 16, fontFamily: fonts.body, color: colors.text, flexShrink: 1 },
  rowTextSelected: { color: colors.primary, fontFamily: fonts.bodyBold },
  empty: { padding: spacing.md, fontFamily: fonts.body, color: colors.textMuted, textAlign: "center" },
});
