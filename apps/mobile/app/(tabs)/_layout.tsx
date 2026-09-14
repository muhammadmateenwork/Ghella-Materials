import { useProfile, useSession } from "@ghella/shared";
import { Redirect, Tabs } from "expo-router";
import { LayoutGrid, Package, Shield, User } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackLoader } from "../../src/components/StackLoader";
import { usePushNotifications } from "../../src/lib/pushNotifications";
import { colors, fonts } from "../../src/lib/theme";

export default function TabsLayout() {
  const { session, isLoading } = useSession();
  const { isMaxTier } = useProfile();
  const insets = useSafeAreaInsets();
  // Some devices under-report (or briefly zero out) the bottom safe-area
  // inset for the gesture/button nav bar, which let the tab bar render too
  // short and sit under the system nav buttons. Floor it at a sane minimum
  // so the tab bar always clears the nav bar even if the inset is wrong.
  const bottomInset = Math.max(insets.bottom, 20);
  usePushNotifications();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <StackLoader />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        // Fixed padding/height ignored the device's bottom safe-area inset
        // (home indicator / gesture nav bar), so the tab bar rendered too
        // short and its bottom edge sat under the system nav area on most
        // modern phones — this pads it out by the actual inset instead.
        tabBarStyle: [styles.tabBar, { height: 54 + bottomInset, paddingBottom: bottomInset }],
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Browse", tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="reservations"
        options={{ title: "Reserved", tabBarIcon: ({ color, size }) => <Package color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Manage",
          href: isMaxTier ? undefined : null,
          tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tabLabel: { fontSize: 11, fontFamily: fonts.bodyBold },
});
