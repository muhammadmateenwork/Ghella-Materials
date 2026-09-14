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

/**
 * Registers this device for push notifications once signed in, and routes
 * a tapped "new material" notification to Browse. Every user can browse
 * the full catalog, so these notifications aren't scoped to anyone
 * specific — registering is all a device needs to start receiving them.
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
      if (!cancelled) registerToken.mutate(token);
    }

    register();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/(tabs)");
    });
    return () => subscription.remove();
  }, []);
}
