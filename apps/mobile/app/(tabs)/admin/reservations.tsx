import { useAllReservationsInfinite } from "@ghella/shared";
import { router } from "expo-router";
import { CalendarClock, ClipboardList, Phone, User } from "lucide-react-native";
import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Badge } from "../../../src/components/Badge";
import { Card } from "../../../src/components/Card";
import { EmptyState } from "../../../src/components/EmptyState";
import { Screen } from "../../../src/components/Screen";
import { StackLoader } from "../../../src/components/StackLoader";
import { ThemedRefreshControl } from "../../../src/components/ThemedRefreshControl";
import { colors, spacing, typography } from "../../../src/lib/theme";

export default function AdminReservationsScreen() {
  const reservationsQuery = useAllReservationsInfinite();
  const reservations = useMemo(
    () => reservationsQuery.data?.pages.flatMap((page) => page.reservations) ?? [],
    [reservationsQuery.data]
  );

  return (
    <Screen padded={false}>
      {reservationsQuery.isLoading ? (
        <StackLoader style={styles.loading} />
      ) : reservations.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No reservations yet" />
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
              style={styles.row}
              onPress={reservation.item ? () => router.push(`/item/${reservation.item!.id}`) : undefined}
            >
              <View style={styles.rowHeader}>
                <Text style={[styles.itemName, !reservation.item && styles.itemNameRemoved]}>
                  {reservation.item?.name ?? "Material deleted"}
                </Text>
                <Badge
                  label={reservation.status === "active" ? "Active" : "Cancelled"}
                  tone={reservation.status === "active" ? "success" : "neutral"}
                />
              </View>
              <View style={styles.metaRow}>
                <User size={13} color={colors.textFaint} strokeWidth={2} />
                <Text style={styles.meta}>
                  {reservation.user ? `${reservation.user.name} (${reservation.user.email})` : "Deleted user"}
                </Text>
              </View>
              <Text style={styles.meta}>Quantity: {reservation.quantity}</Text>
              {reservation.contact_info ? (
                <View style={styles.metaRow}>
                  <Phone size={13} color={colors.textFaint} strokeWidth={2} />
                  <Text style={styles.meta}>{reservation.contact_info}</Text>
                </View>
              ) : null}
              <View style={styles.metaRow}>
                <CalendarClock size={13} color={colors.textFaint} strokeWidth={2} />
                <Text style={styles.meta}>{new Date(reservation.created_at).toLocaleString()}</Text>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  list: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg },
  footer: { paddingVertical: spacing.lg },
  row: { marginBottom: spacing.sm + 2 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.xs },
  itemName: { ...typography.subtitle, color: colors.text, flexShrink: 1 },
  itemNameRemoved: { color: colors.textFaint, fontStyle: "italic" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  meta: { ...typography.caption, color: colors.textMuted, flexShrink: 1 },
});
