import {
  buildLocationTree,
  filterLocationTree,
  flattenVisibleTree,
  getAllTreeIds,
  getFriendlyErrorMessage,
  getLocationPath,
  useCreateLocation,
  type FlatLocationRow,
  type Location,
} from "@ghella/shared";
import { Check, ChevronRight, MapPin, Plus, Search, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "./Button";
import { TextField } from "./TextField";
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
  const [isAdding, setIsAdding] = useState(false);
  const [pickingParent, setPickingParent] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | undefined>();
  const createLocation = useCreateLocation();
  const selectedLabel = value ? getLocationPath(locations, value) : "Select a location";
  const flatLocations = useMemo(
    () => [...locations].sort((a, b) => getLocationPath(locations, a.id).localeCompare(getLocationPath(locations, b.id))),
    [locations]
  );

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
    setIsAdding(false);
    setPickingParent(false);
  };

  const handleAddLocation = () => {
    if (!newName.trim()) {
      setAddError("Name is required");
      return;
    }
    setAddError(undefined);
    createLocation.mutate(
      { name: newName.trim(), parent_location_id: newParentId },
      {
        onSuccess: (created) => {
          onChange(created.id);
          setNewName("");
          setNewParentId(null);
          close();
        },
        onError: (err) => setAddError(getFriendlyErrorMessage(err)),
      }
    );
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
            <Text style={styles.modalTitle}>
              {pickingParent ? "Parent location" : isAdding ? "New location" : "Select location"}
            </Text>
            <Pressable
              onPress={() => {
                if (pickingParent) setPickingParent(false);
                else if (isAdding) setIsAdding(false);
                else close();
              }}
              hitSlop={8}
              style={styles.closeButton}
            >
              <X size={18} color={colors.text} strokeWidth={2} />
            </Pressable>
          </View>

          {pickingParent ? (
            <FlatList
              data={flatLocations}
              keyExtractor={(loc) => loc.id}
              ListHeaderComponent={
                <Pressable
                  style={styles.flatRow}
                  onPress={() => {
                    setNewParentId(null);
                    setPickingParent(false);
                  }}
                >
                  <Text style={styles.rowText}>No parent (top-level yard)</Text>
                  {newParentId === null ? <Check size={17} color={colors.primary} strokeWidth={2.5} /> : null}
                </Pressable>
              }
              renderItem={({ item: loc }) => (
                <Pressable
                  style={styles.flatRow}
                  onPress={() => {
                    setNewParentId(loc.id);
                    setPickingParent(false);
                  }}
                >
                  <Text style={styles.rowText} numberOfLines={1}>
                    {getLocationPath(locations, loc.id)}
                  </Text>
                  {newParentId === loc.id ? <Check size={17} color={colors.primary} strokeWidth={2.5} /> : null}
                </Pressable>
              )}
            />
          ) : isAdding ? (
            <View style={styles.addForm}>
              <TextField label="Location name *" value={newName} onChangeText={setNewName} error={addError} />
              <Text style={styles.label}>Parent location</Text>
              <Pressable style={styles.field} onPress={() => setPickingParent(true)}>
                <MapPin size={16} color={colors.textMuted} strokeWidth={2} />
                <Text style={[styles.fieldText, newParentId ? styles.value : styles.placeholder]} numberOfLines={1}>
                  {newParentId ? getLocationPath(locations, newParentId) : "No parent (top-level yard)"}
                </Text>
                <ChevronDown />
              </Pressable>
              <Button
                title="Add location"
                icon={Plus}
                onPress={handleAddLocation}
                loading={createLocation.isPending}
                style={styles.addButton}
              />
            </View>
          ) : (
            <>
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
                    {searching ? "No locations match your search." : "No locations yet — add one below."}
                  </Text>
                }
              />

              <Pressable style={styles.addNewRow} onPress={() => setIsAdding(true)}>
                <Plus size={16} color={colors.primary} strokeWidth={2.25} />
                <Text style={styles.addNewText}>Add new location</Text>
              </Pressable>
            </>
          )}
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
  addNewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  addNewText: { ...typography.bodyStrong, fontSize: 15, color: colors.primary },
  addForm: { paddingHorizontal: spacing.md },
  addButton: { marginTop: spacing.md },
  flatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
