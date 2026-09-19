import { BigShouldersDisplay_800ExtraBold, BigShouldersDisplay_900Black } from "@expo-google-fonts/big-shoulders-display";
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from "@expo-google-fonts/ibm-plex-sans";
import { SupabaseProvider } from "@ghella/shared";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ConfirmProvider } from "../src/components/ConfirmDialog";
import { PhotoSourceProvider } from "../src/components/PhotoSourceSheet";
import { SuccessOverlayProvider } from "../src/components/SuccessOverlay";
import { ToastProvider } from "../src/components/Toast";
import { queryClient } from "../src/lib/queryClient";
import { supabase } from "../src/lib/supabase";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BigShouldersDisplay_800ExtraBold,
    BigShouldersDisplay_900Black,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <SupabaseProvider client={supabase}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ConfirmProvider>
              <PhotoSourceProvider>
                <SuccessOverlayProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="item/[id]" options={{ headerShown: true, title: "Item Details" }} />
                  </Stack>
                </SuccessOverlayProvider>
              </PhotoSourceProvider>
            </ConfirmProvider>
          </ToastProvider>
        </QueryClientProvider>
      </SupabaseProvider>
    </SafeAreaProvider>
  );
}
