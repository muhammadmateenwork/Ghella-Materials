import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
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

// Android's windowSoftInputMode "resize" (set in app.json) is unreliable
// under mandatory edge-to-edge (Android 15+) and often doesn't actually
// shrink the window, so a short form's ScrollView has no natural overflow
// to scroll a bottom field into view with. We track the real keyboard
// height ourselves and pad the scroll content by that much whenever it's
// open, which guarantees there's always room to scroll any field —
// including the very last one — above the keyboard. Fields register
// themselves here on focus so we know what to scroll to.
export const ScrollIntoViewContext = createContext<((node: unknown) => void) | null>(null);

/** Live Android keyboard height (0 when closed) — for screens that manage
 * their own scrollable container (a FlatList, typically) instead of using
 * Screen's built-in `scroll` mode, so they can pad their own
 * contentContainerStyle the same way Screen does internally. No-op / always
 * 0 on iOS, which doesn't need it (see the KeyboardAvoidingView comment
 * below). */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return keyboardHeight;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  bottomSafeArea = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  // Screens rendered without a tab bar beneath them (auth screens, item
  // detail) get no bottom safe-area padding from anything else, so their
  // last button can end up flush against the device's gesture bar/nav
  // buttons. Tab-bar screens leave this off since the tab bar already
  // reserves that space.
  bottomSafeArea?: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const focusedNodeRef = useRef<unknown>(null);
  const keyboardHeight = useKeyboardHeight();

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
    if (keyboardHeight > 0) scrollFieldIntoView(focusedNodeRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardHeight]);

  const registerFocusedField = (node: unknown) => {
    focusedNodeRef.current = node;
    // Covers switching focus between fields while the keyboard is already
    // open, when no new keyboardDidShow event will fire.
    setTimeout(() => scrollFieldIntoView(node), 80);
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={bottomSafeArea ? ["top", "left", "right", "bottom"] : ["top", "left", "right"]}
    >
      {/* No screen was wrapping its inputs against the keyboard, so on iOS
          (which never resizes the view on its own) the keyboard just
          covered whatever field was focused. Android gets its own
          keyboardHeight padding below instead (see the effect above). */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scroll ? (
          <ScrollIntoViewContext.Provider value={registerFocusedField}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[
                styles.grow,
                padded && styles.padded,
                keyboardHeight > 0 && { paddingBottom: keyboardHeight + spacing.lg },
              ]}
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
