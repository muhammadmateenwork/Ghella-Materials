import AsyncStorage from "@react-native-async-storage/async-storage";
import { createGhellaSupabaseClient } from "@ghella/shared";
import "react-native-url-polyfill/auto";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values."
  );
}

export const supabase = createGhellaSupabaseClient({
  url,
  anonKey,
  storage: AsyncStorage,
  autoRefreshToken: true,
});
