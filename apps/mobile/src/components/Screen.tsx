import { createContext, useEffect, useRef, type ReactNode } from "react";
import {
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../lib/theme";

// Android's windowSoftInputMode "resize" (set in app.json) shrinks the
// window when the keyboard opens, but that alone doesn't scroll a focused
// field that ends up under the (now-closer) keyboard back into view — RN's
// own auto-scroll-focused-input-into-view behavior is unreliable on the New
// Architecture. Fields register themselves here on focus, and once the
// keyboard has actually finished animating in (keyboardDidShow/WillShow —
// fires regardless of resize mode) we measure and scroll them into view
// ourselves.
export const ScrollIntoViewContext = createContext<((node: unknown) => void) | null>(null);

export function Screen({
  children,
  scroll = false,
  padded = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const focusedNodeRef = useRef<unknown>(null);

  const scrollFieldIntoView = (node: unknown) => {
    const scrollHandle = findNodeHandle(scrollRef.current);
    if (!node || !scrollHandle) return;
    (node as { measureLayout: (...args: unknown[]) => void }).measureLayout(
      scrollHandle,
      (_x: number, y: number) => {
        scrollRef.current?.scrollTo({ y: Math.max(y - spacing.md, 0), animated: true });
      },
      () => {}
    );
  };

  useEffect(() => {
    if (!scroll) return;
    const event = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(event, () => scrollFieldIntoView(focusedNodeRef.current));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scroll]);

  const registerFocusedField = (node: unknown) => {
    focusedNodeRef.current = node;
    // Covers switching focus between fields while the keyboard is already
    // open, when no new keyboardDidShow event will fire.
    setTimeout(() => scrollFieldIntoView(node), 80);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* No screen was wrapping its inputs against the keyboard, so on iOS
          (which never resizes the view on its own) the keyboard just
          covered whatever field was focused. Android already resizes via
          the app's default softInputMode, so this is a no-op there. */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scroll ? (
          <ScrollIntoViewContext.Provider value={registerFocusedField}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[styles.grow, padded && styles.padded]}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </ScrollIntoViewContext.Provider>
        ) : (
          <View style={[styles.flex, padded && styles.padded]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  padded: { padding: spacing.md },
});
