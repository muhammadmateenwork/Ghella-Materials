import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomInset } from "../lib/safeArea";
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

/** Set to true by the (tabs) layout, so a Screen knows the tab bar below it
 * already clears the device's nav bar. */
export const InsideTabBarContext = createContext(false);

export function Screen({
  children,
  scroll = false,
  padded = true,
  bottomSafeArea,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  // Screens rendered without a tab bar beneath them (auth screens, item
  // detail, add/edit material) get no bottom safe-area padding from
  // anything else, so their last button ends up under the device's gesture
  // bar/nav buttons. Defaults to on for exactly those screens — anything
  // outside the (tabs) layout — so a new screen can't forget it (Add/Edit
  // material both did, hiding their submit button on Android). Pass it
  // explicitly only to override that.
  bottomSafeArea?: boolean;
}) {
  const insideTabBar = useContext(InsideTabBarContext);
  const deviceBottomInset = useBottomInset();
  const bottomInset = (bottomSafeArea ?? !insideTabBar) ? deviceBottomInset : 0;
  const scrollRef = useRef<ScrollView>(null);
  // Measured against the ScrollView's inner content view, so the y offset
  // comes back in content coordinates — exactly what scrollTo expects. The
  // New Architecture only accepts a component ref here, not the numeric
  // findNodeHandle() handle the old architecture allowed.
  const contentRef = useRef<View>(null);
  const focusedNodeRef = useRef<unknown>(null);
  const keyboardHeight = useKeyboardHeight();

  const scrollFieldIntoView = (node: unknown) => {
    const content = contentRef.current;
    if (!node || !content) return;
    (node as { measureLayout: (...args: unknown[]) => void }).measureLayout(
      content,
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
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* No screen was wrapping its inputs against the keyboard, so on iOS
          (which never resizes the view on its own) the keyboard just
          covered whatever field was focused. Android gets its own
          keyboardHeight padding below instead (see the effect above). */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scroll ? (
          <ScrollIntoViewContext.Provider value={registerFocusedField}>
            <ScrollView
              ref={scrollRef}
              // RN's typing omits the null every ref starts out as.
              innerViewRef={contentRef as RefObject<View>}
              contentContainerStyle={[
                styles.grow,
                padded && styles.padded,
                // Bottom inset goes inside the scroll content (not around the
                // ScrollView) so the page background still runs behind the
                // nav bar while the last button scrolls fully clear of it.
                { paddingBottom: (padded ? spacing.md : 0) + bottomInset },
                keyboardHeight > 0 && { paddingBottom: keyboardHeight + spacing.lg },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </ScrollIntoViewContext.Provider>
        ) : (
          <View style={[styles.flex, padded && styles.padded, { paddingBottom: (padded ? spacing.md : 0) + bottomInset }]}>
            {children}
          </View>
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
