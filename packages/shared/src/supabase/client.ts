import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export type GhellaSupabaseClient = SupabaseClient<Database>;

/** Matches the shape of @react-native-async-storage/async-storage and window.localStorage. */
export interface SupabaseSessionStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

export interface CreateGhellaSupabaseClientOptions {
  url: string;
  anonKey: string;
  /**
   * Platform-specific session storage. Pass AsyncStorage on React Native;
   * omit on web to fall back to the browser's localStorage.
   */
  storage?: SupabaseSessionStorage;
  /** Required on React Native — there is no window to auto-refresh via. */
  autoRefreshToken?: boolean;
}

export function createGhellaSupabaseClient(
  options: CreateGhellaSupabaseClientOptions
): GhellaSupabaseClient {
  const { url, anonKey, storage, autoRefreshToken = true } = options;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase URL and anon key are required to create the Ghella Supabase client."
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      storage,
      autoRefreshToken,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
