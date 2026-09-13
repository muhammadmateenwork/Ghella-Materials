"use client";

import { createGhellaSupabaseClient } from "@ghella/shared";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill in your Supabase project values."
  );
}

// No storage override — falls back to the browser's localStorage, same as
// every other Supabase JS client running in a browser.
export const supabase = createGhellaSupabaseClient({ url, anonKey });
