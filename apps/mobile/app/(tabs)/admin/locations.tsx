import {
  getDescendantLocationIds,
  getFriendlyErrorMessage,
  getLocationPath,
  locationFormSchema,
  useCreateLocation,
  useDeleteLocation,
  useLocations,
  useUpdateLocation,
  type Location,
} from "@ghella/shared";
import { Check, MapPinned, Pencil, Plus, Trash2, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { useConfirm } from "../../../src/components/ConfirmDialog";
import { EmptyState } from "../../../src/components/EmptyState";
import { LocationPickerField } from "../../../src/components/LocationPickerField";
import { Screen } from "../../../src/components/Screen";
import { StackLoader } from "../../../src/components/StackLoader";
import { TextField } from "../../../src/components/TextField";
import { useToast } from "../../../src/components/Toast";
import { colors, radius, spacing, typography } from "../../../src/lib/theme";

const NO_PARENT_OPTION: Location = {
  id: "",
  name: "No parent (top-level yard)",
  parent_location_id: null,
  created_at: "",
  created_by: null,
};

export default function AdminLocationsScreen() {
  const locationsQuery = useLocations();
  const locations = locationsQuery.data ?? [];
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();
  const confirmDialog = useConfirm();
  const showToast = useToast();

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | undefined>();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | undefined>();

  const handleAdd = () => {
    const result = locationFormSchema.safeParse({ name, parent_location_id: parentId });
    if (!result.success) {
      setNameError(result.error.issues[0]?.message);
      return;
    }
    setNameError(undefined);
    createLocation.mutate(result.data, {
      onSuccess: () => {
        setName("");
        setParentId(null);
        showToast(`"${result.data.name}" added.`);
      },
      onError: (error) => showToast(`Couldn't add location: ${getFriendlyErrorMessage(error)}`, "error"),
    });
  };

  const startEdit = (location: Location) => {
    setEditingId(location.id);
    setEditName(location.name);
    setEditParentId(location.parent_location_id);
    setEditError(undefined);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const result = locationFormSchema.safeParse({ name: editName, parent_location_id: editParentId });
    if (!result.success) {
      setEditError(result.error.issues[0]?.message);
      return;
    }
    setEditError(undefined);
    updateLocation.mutate(
      { id: editingId, ...result.data },
      {
        onSuccess: () => {
          setEditingId(null);
          showToast(`"${result.data.name}" updated.`);
        },
        onError: (error) => showToast(`Couldn't update location: ${getFriendlyErrorMessage(error)}`, "error"),
      }
    );
  };

  const handleDelete = async (location: Location) => {
    const descendantCount = getDescendantLocationIds(locations, location.id).length - 1;
    const confirmed = await confirmDialog({
      title: "Delete this location?",
      message:
        descendantCount > 0
          ? `This also removes its ${descendantCount} sub-location${descendantCount === 1 ? "" : "s"}. This can't be undone.`
          : "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    deleteLocation.mutate(location.id, {
      onSuccess: () => showToast(`"${location.name}" deleted.`),
      onError: (error) => showToast(getFriendlyErrorMessage(error), "error"),
    });
  };

  const editExcludedIds = editingId ? new Set(getDescendantLocationIds(locations, editingId)) : new Set<string>();

  return (
    <Screen scroll>
      <Card style={styles.form}>
        <Text style={styles.sectionTitle}>Add a location</Text>
        <TextField label="Name *" value={name} onChangeText={setName} error={nameError} />
        <LocationPickerField
          label="Parent location (pick 'No parent' for a top-level yard)"
          locations={[NO_PARENT_OPTION, ...locations]}
          value={parentId ?? ""}
          onChange={(id) => setParentId(id === "" ? null : id)}
        />
        <Button title="Add location" icon={Plus} onPress={handleAdd} loading={createLocation.isPending} />
      </Card>

      <Text style={styles.sectionTitle}>Existing locations</Text>
      {locationsQuery.isLoading ? (
        <StackLoader size="sm" style={styles.loading} />
      ) : locations.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="No locations yet"
          subtitle="Add your first yard above — materials need a location before they can be added."
        />
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(loc) => loc.id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            if (editingId === item.id) {
              return (
                <Card style={styles.editCard}>
                  <TextField label="Name *" value={editName} onChangeText={setEditName} error={editError} />
                  <LocationPickerField
                    label="Parent location"
                    locations={[NO_PARENT_OPTION, ...locations.filter((l) => !editExcludedIds.has(l.id))]}
                    value={editParentId ?? ""}
                    onChange={(id) => setEditParentId(id === "" ? null : id)}
                  />
                  <View style={styles.editActions}>
                    <Button title="Save" icon={Check} size="sm" onPress={handleSaveEdit} loading={updateLocation.isPending} />
                    <Button title="Cancel" icon={X} variant="ghost" size="sm" onPress={() => setEditingId(null)} />
                  </View>
                </Card>
              );
            }

            return (
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <MapPinned size={15} color={colors.textMuted} strokeWidth={2} />
                </View>
                <Text style={styles.rowText} numberOfLines={1}>
                  {getLocationPath(locations, item.id)}
                </Text>
                <Pressable
                  onPress={() => startEdit(item)}
                  disabled={deleteLocation.isPending && deleteLocation.variables === item.id}
                  hitSlop={8}
                  style={styles.iconButton}
                  accessibilityLabel={`Edit ${item.name}`}
                >
                  <Pencil size={16} color={colors.textMuted} strokeWidth={2} />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(item)}
                  disabled={deleteLocation.isPending && deleteLocation.variables === item.id}
                  hitSlop={8}
                  style={styles.iconButton}
                  accessibilityLabel={`Delete ${item.name}`}
                >
                  {deleteLocation.isPending && deleteLocation.variables === item.id ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <Trash2 size={16} color={colors.danger} strokeWidth={2} />
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { marginBottom: spacing.lg },
  editCard: { marginBottom: spacing.xs },
  editActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  sectionTitle: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm },
  loading: { marginTop: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 4,
    marginBottom: spacing.xs,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { ...typography.body, color: colors.text, flex: 1 },
  iconButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
});
