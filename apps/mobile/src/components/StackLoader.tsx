import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Rect, G } from "react-native-svg";
import { colors, fonts } from "../lib/theme";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedG = Animated.createAnimatedComponent(G);

const SIZES = { sm: 28, md: 40, lg: 56 };

// Bottom edge every bar is pinned to, and each bar's full (grown) height —
// matches the brand mark's geometry (viewBox 0 0 100 100).
const BASELINE = 76;
const BAR_HEIGHTS = [22, 32, 44];
const BAR_X = [20, 43, 66];

/** A loading indicator built from the actual brand mark — the three
 * ascending stacked-material bars rise and settle on their foundation
 * line, with the drafting corner-registration tick blinking like a
 * cursor, rather than a generic spinner unrelated to the logo. */
export function StackLoader({
  label,
  size = "md",
  style,
}: {
  label?: string;
  size?: keyof typeof SIZES;
  style?: StyleProp<ViewStyle>;
}) {
  const px = SIZES[size];
  const values = useRef(BAR_HEIGHTS.map(() => new Animated.Value(0))).current;
  const tickValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loops = values.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(value, { toValue: 1, duration: 500, useNativeDriver: false }),
          Animated.timing(value, { toValue: 0, duration: 800, useNativeDriver: false }),
          Animated.delay((BAR_HEIGHTS.length - 1 - i) * 150),
        ])
      )
    );
    const tickLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(tickValue, { toValue: 1, duration: 650, useNativeDriver: false }),
        Animated.timing(tickValue, { toValue: 0, duration: 650, useNativeDriver: false }),
      ])
    );
    [...loops, tickLoop].forEach((loop) => loop.start());
    return () => [...loops, tickLoop].forEach((loop) => loop.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.container, style]}>
      <Svg width={px} height={px} viewBox="0 0 100 100" fill="none">
        <Rect x={14} y={BASELINE} width={72} height={4} rx={1.5} fill={colors.borderStrong} />
        {BAR_HEIGHTS.map((fullHeight, i) => {
          const height = values[i].interpolate({
            inputRange: [0, 1],
            outputRange: [fullHeight * 0.3, fullHeight],
          });
          const y = values[i].interpolate({
            inputRange: [0, 1],
            outputRange: [BASELINE - fullHeight * 0.3, BASELINE - fullHeight],
          });
          const opacity = values[i].interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
          return (
            <AnimatedRect
              key={i}
              x={BAR_X[i]}
              width={14}
              rx={2}
              fill={colors.primary}
              height={height}
              y={y}
              opacity={opacity}
            />
          );
        })}
        <AnimatedG opacity={tickValue.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] })}>
          <Rect x={72} y={16} width={14} height={3} rx={1.5} fill={colors.primary} />
          <Rect x={83} y={16} width={3} height={14} rx={1.5} fill={colors.primary} />
        </AnimatedG>
      </Svg>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 12 },
  label: { fontSize: 12, fontFamily: fonts.bodyMedium, color: colors.textMuted },
});
