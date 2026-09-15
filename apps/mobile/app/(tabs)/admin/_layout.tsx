import { useProfile } from "@ghella/shared";
import { Redirect, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { StackLoader } from "../../../src/components/StackLoader";
import { colors, fonts } from "../../../src/lib/theme";

export default function AdminLayout() {
  const { profile, isMaxTier, isLoading } = useProfile();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <StackLoader />
      </View>
    );
  }

  // Defense in depth: the Admin tab is hidden for non-max-tier users, but
  // this guard blocks the route directly too (e.g. from a stale deep link).
  if (!profile || !isMaxTier) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontFamily: fonts.bodyBold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Management" }} />
      <Stack.Screen name="items/index" options={{ title: "Materials" }} />
      <Stack.Screen name="items/new" options={{ title: "Add material" }} />
      <Stack.Screen name="items/[id]/edit" options={{ title: "Edit material" }} />
      <Stack.Screen name="items/[id]/reservations" options={{ title: "Reservations" }} />
      <Stack.Screen name="locations" options={{ title: "Locations" }} />
      <Stack.Screen name="users" options={{ title: "Users" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
