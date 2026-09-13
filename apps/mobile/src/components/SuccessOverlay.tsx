import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors, radius, shadow, spacing, typography } from "../lib/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

type ShowSuccessFn = (message: string) => Promise<void>;

const SuccessContext = createContext<ShowSuccessFn | null>(null);

const DISPLAY_MS = 1300;
// Actual geometry of the shapes below — a circle of r=27 (circumference
// 2*pi*27) and the three-point checkmark path — used as the dash length so
// the stroke fully "draws in" rather than leaving a gap.
const RING_LENGTH = 170;
const CHECK_LENGTH = 36;

export function SuccessOverlayProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSuccess = useCallback<ShowSuccessFn>(
    (msg) => {
      setMessage(msg);
      cardAnim.setValue(0);
      ringAnim.setValue(0);
      checkAnim.setValue(0);
      Animated.timing(cardAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.timing(ringAnim, { toValue: 1, duration: 420, useNativeDriver: false }).start();

      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = setTimeout(() => {
        Animated.timing(checkAnim, { toValue: 1, duration: 260, useNativeDriver: false }).start();
      }, 380);

      return new Promise((resolve) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setMessage(null);
          resolve();
        }, DISPLAY_MS);
      });
    },
    [cardAnim, ringAnim, checkAnim]
  );

  const ringOffset = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [RING_LENGTH, 0] });
  const checkOffset = checkAnim.interpolate({ inputRange: [0, 1], outputRange: [CHECK_LENGTH, 0] });

  return (
    <SuccessContext.Provider value={showSuccess}>
      {children}
      <Modal visible={message !== null} transparent animationType="none">
        <View style={styles.backdrop}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardAnim,
                transform: [{ scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
              },
            ]}
          >
            <Svg width={60} height={60} viewBox="0 0 60 60">
              <AnimatedCircle
                cx={30}
                cy={30}
                r={27}
                stroke={colors.success}
                strokeWidth={4}
                fill="none"
                strokeDasharray={`${RING_LENGTH},${RING_LENGTH}`}
                strokeDashoffset={ringOffset}
              />
              <AnimatedPath
                d="M18 31 L26.5 39.5 L42 22"
                stroke={colors.success}
                strokeWidth={4.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${CHECK_LENGTH},${CHECK_LENGTH}`}
                strokeDashoffset={checkOffset}
              />
            </Svg>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </Animated.View>
        </View>
      </Modal>
    </SuccessContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(28,31,36,0.4)", alignItems: "center", justifyContent: "center" },
  card: {
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    maxWidth: 260,
    ...shadow.lg,
  },
  message: { ...typography.bodyStrong, color: colors.text, textAlign: "center" },
});

export function useSuccessOverlay() {
  const ctx = useContext(SuccessContext);
  if (!ctx) throw new Error("useSuccessOverlay must be used within a <SuccessOverlayProvider>");
  return ctx;
}
