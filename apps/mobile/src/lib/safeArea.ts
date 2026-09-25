import { useSafeAreaInsets } from "react-native-safe-area-context";

// Some devices under-report (or briefly zero out) the bottom safe-area inset
// for the gesture/button nav bar, which let bottom-pinned buttons and the
// tab bar sit under the system nav buttons. Every bottom edge in the app
// floors it at this minimum, so it's defined once.
const MIN_BOTTOM_INSET = 20;

/** Space to leave below anything that reaches the bottom of the screen —
 * the device's nav bar / home indicator inset, never less than
 * MIN_BOTTOM_INSET. */
export function useBottomInset(): number {
  return Math.max(useSafeAreaInsets().bottom, MIN_BOTTOM_INSET);
}
