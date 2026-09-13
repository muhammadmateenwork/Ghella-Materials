import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, spacing } from "../lib/theme";

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, { opacity }, style]} />;
}

export function ItemCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton style={styles.thumb} />
      <View style={styles.info}>
        <Skeleton style={{ height: 14, width: "70%", borderRadius: 4 }} />
        <Skeleton style={{ height: 11, width: "40%", borderRadius: 4, marginTop: 6 }} />
        <Skeleton style={{ height: 11, width: "55%", borderRadius: 4, marginTop: 6 }} />
        <Skeleton style={{ height: 18, width: 90, borderRadius: radius.full, marginTop: 6 }} />
      </View>
    </View>
  );
}

const THUMB_SIZE = 68;

const styles = StyleSheet.create({
  base: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm },
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm + 2,
    gap: spacing.sm + 2,
  },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: radius.sm },
  info: { flex: 1, justifyContent: "center" },
});
