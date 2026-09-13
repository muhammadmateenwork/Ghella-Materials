"use client";

import { SupabaseProvider } from "@ghella/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ConfirmProvider } from "../components/ConfirmDialog";
import { SuccessOverlayProvider } from "../components/SuccessOverlay";
import { ToastProvider } from "../components/Toast";
import { supabase } from "../lib/supabase";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
      })
  );

  return (
    <SupabaseProvider client={supabase}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmProvider>
            <SuccessOverlayProvider>{children}</SuccessOverlayProvider>
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </SupabaseProvider>
  );
}
