import { useSession } from "@ghella/shared";
import { Redirect, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { StackLoader } from "../../src/components/StackLoader";
import { colors } from "../../src/lib/theme";

export default function AuthLayout() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <StackLoader />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
