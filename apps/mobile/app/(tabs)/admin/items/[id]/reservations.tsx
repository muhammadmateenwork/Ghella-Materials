import { useItem, useProfile } from "@ghella/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ErrorState } from "../../../../../src/components/ErrorState";
import { ItemReservationsList } from "../../../../../src/components/ItemReservationsList";
import { Screen } from "../../../../../src/components/Screen";
import { StackLoader } from "../../../../../src/components/StackLoader";
import { colors, spacing, typography } from "../../../../../src/lib/theme";

export default function ItemReservationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useProfile();
  const itemQuery = useItem(id);

  // Same ownership rule as the edit screen — reservations against an item
  // are only visible to the item's own owner (RLS enforces this too; this
  // just bounces a non-owner before they see a permission-denied empty
  // state).
  const item = itemQuery.data;
  const canView = !item || item.created_by === null || item.created_by === profile?.id;
  useEffect(() => {
    if (item && !canView) router.replace(`/item/${id}`);
  }, [item, canView, id]);

  if (itemQuery.isError) {
    return (
      <Screen>
        <ErrorState message={itemQuery.error?.message} onRetry={() => itemQuery.refetch()} />
      </Screen>
    );
  }

  if (itemQuery.isLoading || !item || !canView) {
    return (
      <Screen>
        <View style={styles.center}>
          <StackLoader />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.itemName}>{item.name}</Text>
      <ItemReservationsList itemId={item.id} unit={item.unit} isApproximate={item.is_approximate} showEmptyState />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  itemName: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
});
