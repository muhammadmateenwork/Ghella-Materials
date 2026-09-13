import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateUserInput } from "../schemas/user";
import { useSupabaseClient } from "../supabase/context";
import type { Profile, UserRole } from "../types/database";
import { queryKeys } from "./keys";

/** Maximum-tier only — RLS restricts this list to users with role = 'maximum'. */
export function useUsers() {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Profile[];
    },
  });
}

/**
 * Changes another user's role. RLS enforces that the caller is
 * maximum-tier AND is not targeting their own row — a user can never
 * change their own permission level, even an admin.
 */
export function useUpdateUserRole() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { userId: string; role: UserRole }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update({ role: input.role })
        .eq("id", input.userId)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
    },
  });
}

/**
 * Creates a new user account, emails them a one-time "set your password"
 * link (best-effort — a send failure never fails account creation), and
 * also returns that same link so the admin can share it directly
 * (WhatsApp, text, in person) as a fallback. That fallback matters because
 * this kind of unsolicited "account created for you" email reliably lands
 * in spam for every recipient tested, including ones with no prior history
 * with this project — unlike the (recipient-initiated) password-reset
 * email on the same SMTP relay, which isn't a gap closeable by wording
 * alone. Goes through the admin-create-user edge function — the app can
 * never hold the service-role key this requires, and the function
 * independently verifies the caller is maximum-tier before doing anything.
 */
export function useCreateUser() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput & { siteUrl?: string }) => {
      const { data, error } = await supabase.functions.invoke<{
        id: string;
        email: string;
        name: string;
        role: UserRole;
        inviteLink: string;
        emailSent: boolean;
        emailError?: string;
      }>("admin-create-user", { body: input });
      if (error) throw new Error(await extractFunctionErrorMessage(error));
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
    },
  });
}

/**
 * Deletes another user's account entirely (auth user + profile, via
 * cascade). Goes through the admin-delete-user edge function for the same
 * reason creation does — service-role only, server-verified caller.
 */
export function useDeleteUser() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId },
      });
      if (error) throw new Error(await extractFunctionErrorMessage(error));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
    },
  });
}

/**
 * supabase-js's functions.invoke() error carries the raw HTTP Response on
 * `.context`, not the JSON error message our function actually returned —
 * without this, every failure would surface as a generic
 * "non-2xx status code" instead of e.g. "Email already registered".
 */
async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = await context.clone().json();
        if (typeof body?.error === "string") return body.error;
      } catch {
        // fall through to the generic message below
      }
    }
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
