import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Profile } from "../types/database";
import type { GhellaSupabaseClient } from "./client";

interface SupabaseContextValue {
  client: GhellaSupabaseClient;
  session: Session | null;
  profile: Profile | null;
  /** True until the initial session + profile lookup resolves. */
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

export function SupabaseProvider({
  client,
  children,
}: {
  client: GhellaSupabaseClient;
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error) {
      setProfile(data);
    }
  };

  const refreshProfile = async () => {
    if (session?.user.id) {
      await loadProfile(session.user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;

    client.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      if (data.session?.user.id) {
        await loadProfile(data.session.user.id);
      }
      setIsLoading(false);
    });

    const { data: subscription } = client.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!isMounted) return;
        setSession(nextSession);
        if (nextSession?.user.id) {
          await loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const value = useMemo(
    () => ({ client, session, profile, isLoading, refreshProfile }),
    [client, session, profile, isLoading]
  );

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

function useSupabaseContext(): SupabaseContextValue {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error("useSupabase hooks must be used within a <SupabaseProvider>");
  }
  return ctx;
}

export function useSupabaseClient(): GhellaSupabaseClient {
  return useSupabaseContext().client;
}

export function useSession() {
  const { session, isLoading } = useSupabaseContext();
  return { session, isLoading };
}

export function useProfile() {
  const { profile, isLoading, refreshProfile } = useSupabaseContext();
  return {
    profile,
    isLoading,
    isMaxTier: profile?.role === "maximum",
    refreshProfile,
  };
}
