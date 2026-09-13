import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadow, spacing, typography } from "../lib/theme";
import { Button } from "./Button";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [pending, setPending] = useState(false);
  const resolver = useRef<(value: boolean) => void>(null);
  const anim = useRef(new Animated.Value(0)).current;

  const confirmDialog = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (options) {
      setPending(true);
      Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    }
  }, [options, anim]);

  const handleClose = (result: boolean) => {
    Animated.timing(anim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setPending(false);
      resolver.current?.(result);
    });
  };

  return (
    <ConfirmContext.Provider value={confirmDialog}>
      {children}
      <Modal visible={pending} transparent animationType="none" onRequestClose={() => handleClose(false)}>
        <View style={styles.backdrop}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: anim,
                transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
              },
            ]}
          >
            <Text style={styles.title}>{options?.title}</Text>
            {options?.message ? <Text style={styles.message}>{options.message}</Text> : null}
            <View style={styles.actions}>
              <Button title="Cancel" variant="ghost" size="sm" onPress={() => handleClose(false)} />
              <Button
                title={options?.confirmLabel ?? "Confirm"}
                variant={options?.danger ? "danger" : "primary"}
                size="sm"
                onPress={() => handleClose(true)}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(28,31,36,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadow.lg,
  },
  title: { ...typography.subtitle, fontSize: 17, color: colors.text, marginBottom: spacing.xs },
  message: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.sm },
});

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a <ConfirmProvider>");
  return ctx;
}
