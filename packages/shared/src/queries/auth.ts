import { useMutation, useQueryClient } from "@tanstack/react-query";
import { extractFunctionErrorMessage } from "../lib/errors";
import type { LoginInput } from "../schemas/auth";
import { useSupabaseClient } from "../supabase/context";
import { unregisterPushToken } from "./pushTokens";

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
    // pushToken: the mobile app passes this device's push token so it's
    // unregistered first — otherwise a signed-out phone keeps receiving
    // that user's personal notifications. Best-effort: a failure here must
    // never block signing out.
    mutationFn: async (input?: { pushToken?: string | null }) => {
      if (input?.pushToken) {
        try {
          await unregisterPushToken(supabase, input.pushToken);
        } catch {
          // ignore — see above
        }
      }
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

/**
 * Self-service password change — requires an active session, no current
 * password needed (Supabase authorizes this off the session itself). Used
 * both for the profile page's "change password" and, after clicking a
 * reset-password email link, for setting a brand new one.
 *
 * After a successful change, every OTHER session for this account is
 * signed out (scope: "others") — the device making the change stays
 * signed in, but a changed password should actually lock out anyone else
 * still holding a session (a lost device, or a compromised account), not
 * just block future sign-ins with the old password. Best-effort: a
 * failure here doesn't undo or fail the password change itself.
 */
export function useChangePassword() {
  const supabase = useSupabaseClient();

  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      try {
        await supabase.auth.signOut({ scope: "others" });
      } catch {
        // Non-critical — the password itself is already changed.
      }
    },
  });
}

/**
 * Sends a password-reset email containing a link to `redirectTo` — but
 * first checks whether an account exists for that email at all, via the
 * check-email-exists edge function (profiles has no anon-read RLS policy,
 * so this can't be checked directly from the client). Surfaces a clear
 * "no account" error immediately rather than the standard privacy-
 * preserving "if an account exists..." non-answer, at the client's
 * explicit request for this admin-provisioned-accounts app.
 */
export function useRequestPasswordReset() {
  const supabase = useSupabaseClient();

  return useMutation({
    mutationFn: async (input: { email: string; redirectTo?: string }) => {
      const { data: checkData, error: checkError } = await supabase.functions.invoke<{ exists: boolean }>(
        "check-email-exists",
        { body: { email: input.email } }
      );
      if (checkError) throw new Error(await extractFunctionErrorMessage(checkError));
      if (!checkData?.exists) {
        throw new Error("No account found with this email.");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
        redirectTo: input.redirectTo,
      });
      if (error) throw error;
    },
  });
}
