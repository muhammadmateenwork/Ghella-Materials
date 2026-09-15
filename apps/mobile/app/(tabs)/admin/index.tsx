import { router } from "expo-router";
import { ChevronRight, MapPinned, Package, Users, type LucideIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "../../../src/components/Card";
import { Screen } from "../../../src/components/Screen";
import { colors, radius, spacing, typography } from "../../../src/lib/theme";

const LINKS: { href: string; title: string; subtitle: string; icon: LucideIcon }[] = [
  { href: "/(tabs)/admin/items", title: "Manage Materials", subtitle: "Add, edit, or remove items and photos", icon: Package },
  { href: "/(tabs)/admin/locations", title: "Manage Locations", subtitle: "Add yards and sub-locations", icon: MapPinned },
  { href: "/(tabs)/admin/users", title: "Manage Users", subtitle: "View accounts, change access level", icon: Users },
];

export default function AdminHubScreen() {
  return (
    <Screen>
      <View style={styles.list}>
        {LINKS.map((link) => (
          <Card key={link.href} onPress={() => router.push(link.href)} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.iconWrap}>
                <link.icon size={20} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{link.title}</Text>
                <Text style={styles.cardSubtitle}>{link.subtitle}</Text>
              </View>
              <ChevronRight size={18} color={colors.textFaint} strokeWidth={2} />
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm + 2 },
  card: {},
  cardRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardTitle: { ...typography.subtitle, color: colors.text },
  cardSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
});
