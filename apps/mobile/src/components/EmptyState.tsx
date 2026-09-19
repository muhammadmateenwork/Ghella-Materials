import type { LucideIcon } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { colors, radius, spacing, typography } from "../lib/theme";

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  // A concrete next step right where the user is looking, instead of just
  // describing the empty state and leaving them to find the action
  // elsewhere on the screen.
  action?: { label: string; onPress: () => void; icon?: LucideIcon };
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [anim]);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
    >
      <View style={styles.iconWrap}>
        <Icon size={26} color={colors.textFaint} strokeWidth={1.75} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? (
        <Button title={action.label} icon={action.icon} size="sm" onPress={action.onPress} style={styles.action} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.xs,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: { ...typography.bodyStrong, color: colors.text, textAlign: "center" },
  subtitle: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
  action: { marginTop: spacing.md },
});
