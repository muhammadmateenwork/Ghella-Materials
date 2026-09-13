import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LoginInput } from "../schemas/auth";
import { useSupabaseClient } from "../supabase/context";

export function useSignIn() {
  const supabase = useSupabaseClient();

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useSignOut() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Belt-and-suspenders: signOut() already clears the persisted
      // session, but on web we also wipe localStorage outright so there's
      // no ambiguity that every trace of the session is gone from this
      // browser. Guarded so it's a no-op on React Native, where `window`
      // has no `localStorage`.
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
      }
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

/** Self-service password change — requires an active session, no current
 * password needed (Supabase authorizes this off the session itself). */
export function useChangePassword() {
  const supabase = useSupabaseClient();

  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
  });
}

/** Sends a password-reset email containing a link to `redirectTo`. */
export function useRequestPasswordReset() {
  const supabase = useSupabaseClient();

  return useMutation({
    mutationFn: async (input: { email: string; redirectTo?: string }) => {
      const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
        redirectTo: input.redirectTo,
      });
      if (error) throw error;
    },
  });
}
