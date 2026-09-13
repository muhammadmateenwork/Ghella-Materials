import { buildLocationTree, findTreeNode, getLocationAncestors, type Location } from "@ghella/shared";
import { ChevronRight } from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../lib/theme";

export function LocationDrilldown({
  locations,
  selectedId,
  onSelect,
}: {
  locations: Location[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const tree = useMemo(() => buildLocationTree(locations), [locations]);
  const ancestors = useMemo(
    () => (selectedId ? getLocationAncestors(locations, selectedId) : []),
    [locations, selectedId]
  );
  const children = useMemo(
    () => (selectedId ? findTreeNode(tree, selectedId)?.children ?? [] : tree),
    [tree, selectedId]
  );

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbRow}>
        <Pressable onPress={() => onSelect(null)}>
          <Text style={[styles.crumb, selectedId === null && styles.crumbActive]}>All yards</Text>
        </Pressable>
        {ancestors.map((loc) => (
          <View key={loc.id} style={styles.crumbGroup}>
            <ChevronRight size={12} color={colors.textFaint} strokeWidth={2} />
            <Pressable onPress={() => onSelect(loc.id)}>
              <Text style={[styles.crumb, loc.id === selectedId && styles.crumbActive]}>{loc.name}</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {children.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {children.map((node) => (
            <Pressable key={node.location.id} style={styles.chip} onPress={() => onSelect(node.location.id)}>
              <Text style={styles.chipText}>
                {node.location.name}
                {node.children.length > 0 ? " ›" : ""}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  breadcrumbRow: { alignItems: "center", gap: 4, paddingBottom: 2 },
  crumbGroup: { flexDirection: "row", alignItems: "center", gap: 4 },
  crumb: { ...typography.captionStrong, color: colors.textMuted },
  crumbActive: { color: colors.primary },
  chipRow: { gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { ...typography.captionStrong, color: colors.textMuted },
});
