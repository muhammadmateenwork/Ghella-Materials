import { AlertTriangle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, spacing } from "../lib/theme";
import { Button } from "./Button";

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <AlertTriangle size={26} color={colors.danger} strokeWidth={1.75} />
      </View>
      <Text style={styles.title}>Couldn&apos;t load this</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? (
        <Button title="Try again" variant="secondary" size="sm" onPress={onRetry} style={styles.retry} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.xs },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: { fontSize: 15, fontFamily: fonts.bodySemiBold, color: colors.text, textAlign: "center" },
  message: { fontSize: 13, fontFamily: fonts.body, color: colors.textMuted, textAlign: "center" },
  retry: { marginTop: spacing.sm },
});
