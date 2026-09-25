import { Camera, Image as ImageIcon } from "lucide-react-native";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useBottomInset } from "../lib/safeArea";
import { colors, radius, shadow, spacing, typography } from "../lib/theme";

export type PhotoSource = "camera" | "library" | null;
type PhotoSourceFn = () => Promise<PhotoSource>;

const PhotoSourceContext = createContext<PhotoSourceFn | null>(null);

// A custom-styled replacement for the OS's own action sheet/Alert.alert —
// same "pick one of a few options" job, but drawn with this app's own
// theme instead of a bare native dialog, and with Cancel always last and
// visually separated, the way an iOS action sheet (not a plain alert)
// actually does it.
export function PhotoSourceProvider({ children }: { children: ReactNode }) {
  // Floored inset, so the Cancel row always clears the system nav bar even
  // on devices that under-report it.
  const bottomInset = useBottomInset();
  const [visible, setVisible] = useState(false);
  const resolver = useRef<(value: PhotoSource) => void>(null);
  const anim = useRef(new Animated.Value(0)).current;

  const pickPhotoSource = useCallback<PhotoSourceFn>(() => {
    setVisible(true);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible, anim]);

  const handleClose = (choice: PhotoSource) => {
    Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setVisible(false);
      resolver.current?.(choice);
    });
  };

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [200, 0] });

  return (
    <PhotoSourceContext.Provider value={pickPhotoSource}>
      {children}
      <Modal visible={visible} transparent animationType="none" onRequestClose={() => handleClose(null)}>
        <Pressable style={styles.backdrop} onPress={() => handleClose(null)}>
          <Animated.View
            style={[styles.sheetWrap, { paddingBottom: bottomInset + spacing.sm, opacity: anim, transform: [{ translateY }] }]}
          >
            <Pressable style={styles.content}>
              <Text style={styles.title}>Add photo</Text>
              <View style={styles.card}>
                <Pressable
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  onPress={() => handleClose("camera")}
                >
                  <Camera size={19} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.optionText}>Take photo</Text>
                </Pressable>
                <View style={styles.divider} />
                <Pressable
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  onPress={() => handleClose("library")}
                >
                  <ImageIcon size={19} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.optionText}>Choose from library</Text>
                </Pressable>
              </View>
              <Pressable
                style={({ pressed }) => [styles.card, styles.cancelCard, pressed && styles.optionPressed]}
                onPress={() => handleClose(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </PhotoSourceContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(12,21,38,0.45)", justifyContent: "flex-end" },
  sheetWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  content: { width: "100%" },
  title: { ...typography.caption, color: "rgba(255,255,255,0.85)", textAlign: "center", marginBottom: spacing.sm },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: "hidden",
    ...shadow.lg,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  optionPressed: { backgroundColor: colors.surfaceAlt },
  optionText: { ...typography.bodyStrong, fontSize: 16, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border },
  cancelCard: { marginTop: spacing.sm, alignItems: "center", justifyContent: "center", paddingVertical: spacing.md },
  cancelText: { ...typography.bodyStrong, fontSize: 16, fontWeight: "700", color: colors.primary },
});

export function usePhotoSource() {
  const ctx = useContext(PhotoSourceContext);
  if (!ctx) throw new Error("usePhotoSource must be used within a <PhotoSourceProvider>");
  return ctx;
}
