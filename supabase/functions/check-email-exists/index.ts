// Checks whether an account exists for a given email — called from the
// forgot-password screen before sending a reset email, so someone who
// mistypes their email (or never had an account) sees "No account found"
// immediately instead of waiting on an email that will never arrive.
//
// This deliberately trades away the usual "don't reveal whether an email
// is registered" privacy practice, at the client's explicit request — any
// caller can now probe which emails have accounts. Acceptable here since
// accounts are admin-provisioned for known staff (not public signup), but
// worth remembering if this app's user base or threat model changes.
//
// No caller-identity check is needed (unlike the admin-* functions) —
// this runs pre-login, so there's no session to verify, and the only
// thing it discloses is exactly what it's designed to disclose.
//
// Deploy with: supabase functions deploy check-email-exists

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server is missing Supabase configuration" }, 500);
  }

  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return json({ error: "email is required" }, 400);
  }

  // profiles has no anon-read RLS policy (by design — only own row or
  // max-tier can read it), so this lookup needs the service-role client
  // regardless of who's asking.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await adminClient
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ exists: data !== null }, 200);
});
