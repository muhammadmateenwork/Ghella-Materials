import { useProfile, useSession } from "@ghella/shared";
import { Redirect, Tabs } from "expo-router";
import { LayoutGrid, Package, Shield, User } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { StackLoader } from "../../src/components/StackLoader";
import { colors, fonts } from "../../src/lib/theme";

export default function TabsLayout() {
  const { session, isLoading } = useSession();
  const { isMaxTier } = useProfile();

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
        tabBarStyle: styles.tabBar,
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
    height: 62,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: { fontSize: 11, fontFamily: fonts.bodyBold },
});
