import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, spacing, typography } from "../lib/theme";

/** The recurring page-heading signature: a short orange registration tick
 * beside a bold condensed caps title, echoing the corner mark on the brand
 * logomark — mirrors the web app's PageTitle component. */
export function PageHeading({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.bar} />
      <Text style={styles.title}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bar: { width: 4, height: 20, backgroundColor: colors.primary },
  title: { ...typography.display, fontSize: 24, color: colors.text },
});
