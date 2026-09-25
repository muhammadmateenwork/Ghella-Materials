import { useRegisterPushToken, useSession } from "@ghella/shared";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

// Controls how a notification displays while the app is open and
// foregrounded — without this, a notification received while the app is
// already open wouldn't show a banner at all.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// This device's token once registered — sign-out passes it to useSignOut
// so the device is unregistered and stops receiving that user's personal
// notifications.
let registeredPushToken: string | null = null;

export function getRegisteredPushToken() {
  return registeredPushToken;
}

// Notification taps already routed, by request identifier — the last
// response stays the same across re-renders/remounts, and shouldn't
// re-navigate each time.
const handledResponses = new Set<string>();

/** Where a tapped notification should land, from the push_data the
 * database triggers attach (see 0008 / 0012). */
function routeForNotification(data: Record<string, unknown> | undefined) {
  const itemId = typeof data?.item_id === "string" ? data.item_id : null;
  switch (data?.type) {
    case "reservation_received":
    case "reservation_cancelled":
      return itemId ? `/item/${itemId}` : "/(tabs)/reservations";
    case "item_deleted":
      return "/(tabs)/reservations";
    default:
      return "/(tabs)";
  }
}

/**
 * Registers this device for push notifications once signed in, and routes
 * a tapped notification to the screen it's about. Mounted by the (tabs)
 * layout, so it only runs while signed in — a tap that opens the app while
 * signed out is picked up after sign-in instead.
 */
export function usePushNotifications() {
  const { session } = useSession();
  const registerToken = useRegisterPushToken();

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function register() {
      // Push tokens aren't meaningful on simulators/emulators — there's no
      // real push service to deliver to.
      if (!Device.isDevice) return;

      if (Platform.OS === "android") {
        // Required before requesting permission or fetching a token on
        // Android 13+ — the OS won't show the permission prompt without a
        // channel already existing.
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted" || cancelled) return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) return;

      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      if (cancelled) return;
      registeredPushToken = token;
      registerToken.mutate(token);
    }

    // Push is a nice-to-have: a failure (no network, push not configured
    // for this build, e.g. Android without FCM credentials) must never
    // surface as an uncaught error or affect the rest of the app.
    register().catch((error) => {
      console.warn("Push notification registration failed:", error);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  // Unlike addNotificationResponseReceivedListener, this also returns the
  // tap that LAUNCHED the app from a fully closed state.
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!lastResponse || lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = lastResponse.notification.request.identifier;
    if (handledResponses.has(id)) return;
    handledResponses.add(id);
    router.push(routeForNotification(lastResponse.notification.request.content.data) as never);
  }, [lastResponse]);
}
