import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing } from "../lib/theme";

type Tone = "primary" | "success" | "danger" | "warning" | "neutral";

const TONE_STYLES: Record<Tone, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primarySoft, fg: colors.primaryDark, border: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success, border: colors.success },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.danger },
  warning: { bg: colors.warningSoft, fg: colors.warning, border: colors.warning },
  neutral: { bg: colors.surfaceAlt, fg: colors.textMuted, border: colors.borderStrong },
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const toneStyle = TONE_STYLES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: toneStyle.bg, borderLeftColor: toneStyle.border }]}>
      <Text style={[styles.text, { color: toneStyle.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.xs + 4,
    paddingVertical: 3,
    borderRadius: 2,
    borderLeftWidth: 2,
  },
  text: { fontSize: 11, fontFamily: fonts.bodyBold, letterSpacing: 0.4, textTransform: "uppercase" },
});
