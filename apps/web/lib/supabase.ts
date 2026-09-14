"use client";

import { createGhellaSupabaseClient, type GhellaSupabaseClient } from "@ghella/shared";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill in your Supabase project values."
  );
}

// Cached on globalThis (dev only) so Next.js Fast Refresh reuses the same
// client across hot reloads instead of creating a new one on top of the
// old — this module is a plain `export const`, which normally only runs
// once, but Turbopack/webpack can re-evaluate it during HMR. Two
// GoTrueClient instances sharing the same localStorage session key can
// each independently try to auto-refresh the access token; since Supabase
// rotates the refresh token on every refresh, whichever instance loses
// that race ends up holding an already-invalidated refresh token, which
// corrupts the stored session — surfacing later as "Invalid session" on
// actions that were working fine moments before. No storage override
// otherwise — falls back to the browser's localStorage like every other
// Supabase JS client running in a browser.
declare global {
  // eslint-disable-next-line no-var
  var __ghellaSupabase: GhellaSupabaseClient | undefined;
}

export const supabase: GhellaSupabaseClient =
  globalThis.__ghellaSupabase ?? createGhellaSupabaseClient({ url, anonKey });

if (process.env.NODE_ENV !== "production") {
  globalThis.__ghellaSupabase = supabase;
}
