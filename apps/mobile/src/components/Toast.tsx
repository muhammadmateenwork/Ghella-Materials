import { AlertCircle, CheckCircle2 } from "lucide-react-native";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, shadow, spacing } from "../lib/theme";

type ToastTone = "success" | "error";
type ToastItem = { id: number; message: string; tone: ToastTone };

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.stack, { top: insets.top + spacing.sm }]}>
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </View>
  );
}

function ToastRow({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
  }, [anim]);

  const handleDismiss = () => {
    Animated.timing(anim, { toValue: 0, duration: 150, useNativeDriver: true }).start(onDismiss);
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        toast.tone === "error" && styles.toastError,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
          ],
        },
      ]}
    >
      {toast.tone === "success" ? (
        <CheckCircle2 size={18} color={colors.success} strokeWidth={2} />
      ) : (
        <AlertCircle size={18} color={colors.danger} strokeWidth={2} />
      )}
      <Text style={styles.text}>{toast.message}</Text>
      <Pressable onPress={handleDismiss} hitSlop={12}>
        <Text style={styles.dismiss}>×</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    gap: spacing.xs + 2,
    zIndex: 100,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    ...shadow.md,
  },
  toastError: { borderLeftColor: colors.danger },
  text: { flex: 1, fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.text },
  dismiss: { fontSize: 18, color: colors.textFaint, lineHeight: 20 },
});

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a <ToastProvider>");
  return ctx;
}
