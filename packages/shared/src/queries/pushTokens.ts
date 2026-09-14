import { useMutation } from "@tanstack/react-query";
import { useSession, useSupabaseClient } from "../supabase/context";

/**
 * Registers (or re-associates) this device's Expo push token so it starts
 * receiving new-material notifications — every user can browse the full
 * catalog, so these aren't scoped to a specific person. Upserts on the
 * token itself: re-registering the same device after signing in as a
 * different user re-points that one row rather than accumulating
 * duplicates.
 */
export function useRegisterPushToken() {
  const supabase = useSupabaseClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (token: string) => {
      if (!session?.user.id) return;
      const { error } = await supabase
        .from("push_tokens")
        .upsert({ user_id: session.user.id, token }, { onConflict: "token" });
      if (error) throw error;
    },
  });
}
