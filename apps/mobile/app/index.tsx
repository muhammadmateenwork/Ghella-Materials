import { useSession } from "@ghella/shared";
import { Redirect } from "expo-router";
import { StyleSheet, View } from "react-native";
import { StackLoader } from "../src/components/StackLoader";

export default function Index() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <StackLoader />
      </View>
    );
  }

  return <Redirect href={session ? "/(tabs)" : "/(auth)/login"} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
