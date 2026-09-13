import type { LucideIcon } from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, fonts, radius, shadow, spacing } from "../lib/theme";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "md" | "sm";

const TEXT_COLOR: Record<Variant, string> = {
  primary: colors.primaryText, // navy text on orange — matches real safety-signage contrast
  secondary: colors.ink,
  danger: "#FFFFFF",
  ghost: colors.textMuted,
};

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon: Icon,
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const textColor = TEXT_COLOR[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        size === "sm" && styles.sm,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {Icon ? <Icon size={size === "sm" ? 15 : 17} color={textColor} strokeWidth={2.25} /> : null}
          <Text style={[styles.text, size === "sm" && styles.textSm, { color: textColor }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm + 6,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.sm,
    minHeight: 46,
  },
  sm: { paddingVertical: spacing.xs + 5, paddingHorizontal: spacing.sm + 6, minHeight: 36 },
  text: { fontSize: 13, fontFamily: fonts.bodyBold, letterSpacing: 0.5, textTransform: "uppercase" },
  textSm: { fontSize: 11 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary, ...shadow.sm },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  danger: { backgroundColor: colors.danger, ...shadow.sm },
  ghost: { backgroundColor: colors.surfaceAlt },
});
