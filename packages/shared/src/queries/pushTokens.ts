import { useMutation } from "@tanstack/react-query";
import type { GhellaSupabaseClient } from "../supabase/client";
import { useSession, useSupabaseClient } from "../supabase/context";

/**
 * Registers this device's Expo push token to the signed-in user, so it
 * receives both the catalog-wide "new material" pushes and that user's own
 * notifications. Goes through the register_push_token RPC (0014) rather
 * than a direct upsert: the token is unique per device, and RLS only lets a
 * user modify rows they already own — so a direct upsert couldn't re-point
 * a device that the previous user on this phone had registered.
 */
export function useRegisterPushToken() {
  const supabase = useSupabaseClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (token: string) => {
      if (!session?.user.id) return;
      const { error } = await supabase.rpc("register_push_token", { p_token: token });
      if (error) throw error;
    },
  });
}

/**
 * Removes this device's token from the signed-in user, so a phone that's
 * been signed out stops receiving that user's personal notifications. Must
 * run BEFORE signing out — RLS only allows deleting your own rows, which
 * needs the session.
 */
export async function unregisterPushToken(supabase: GhellaSupabaseClient, token: string) {
  const { error } = await supabase.from("push_tokens").delete().eq("token", token);
  if (error) throw error;
}
