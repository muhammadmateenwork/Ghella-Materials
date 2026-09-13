// Creates a new user account and invites them by email, with a chosen
// initial role (minimum/maximum).
//
// The mobile app can never hold the service-role key needed to create
// other users' accounts, so this runs server-side: it verifies the caller
// is a maximum-tier user (using a client scoped to the caller's own JWT,
// so RLS decides — the same rule enforced everywhere else), then uses the
// service-role client to invite the new user and set their role.
//
// This uses Supabase Auth's own invite-email flow (admin.inviteUserByEmail)
// rather than an admin-chosen password emailed out by this function. An
// earlier version had the admin set a password directly and emailed it —
// that email (a plaintext password paired with an email address) went
// straight to spam, since that exact pattern is what phishing/
// credential-leak spam classifiers are tuned to catch; no amount of
// reformatting fixes that, only removing the password does. Supabase's own
// invite/recovery emails only ever contain a secure one-time link, never a
// password, and are sent through the same Auth SMTP config already proven
// reliable by the existing password-reset flow — so routing account
// creation through that same mechanism sidesteps the problem entirely
// instead of working around it.
//
// The new user clicks the invite link and lands on this app's
// reset-password page (already built to handle Supabase's various link
// formats) to set their own password — nothing to relay by hand, nothing
// transmitted in cleartext.
//
// Kept as ONE file (no supabase/functions/_shared import) — the Dashboard's
// function editor only uploads the single file you paste in, so a relative
// import to another file 404s at deploy time. If you switch to deploying
// via the Supabase CLI later, this can be split up again if useful.
//
// Deploy with: supabase functions deploy admin-create-user

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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Server is missing Supabase configuration" }, 500);
  }

  // Scoped to the caller's own JWT — RLS decides what they can read, same
  // as every other client in this app. This is how we verify they're
  // actually maximum-tier, not just a trusted client-side claim.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: "Invalid session" }, 401);
  }

  const { data: callerProfile, error: profileError } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profileError || callerProfile?.role !== "maximum") {
    return json({ error: "Only maximum-tier users can create accounts" }, 403);
  }

  let body: { email?: unknown; name?: unknown; role?: unknown; siteUrl?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const role = body.role;
  const siteUrl = typeof body.siteUrl === "string" ? body.siteUrl : undefined;

  if (!email.includes("@")) {
    return json({ error: "A valid email is required" }, 400);
  }
  if (name.length === 0) {
    return json({ error: "Name is required" }, 400);
  }
  if (role !== "minimum" && role !== "maximum") {
    return json({ error: "Role must be 'minimum' or 'maximum'" }, 400);
  }

  // Service-role client: bypasses RLS. Only reachable after the caller was
  // independently verified as maximum-tier above — never trust a
  // client-supplied role for anything before that check.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { name },
    redirectTo: siteUrl ? `${siteUrl}/reset-password` : undefined,
  });

  if (inviteError || !invited?.user) {
    const message = inviteError?.message ?? "Could not create user";
    const status = /already.*registered|already exists/i.test(message) ? 409 : 400;
    return json({ error: message }, status);
  }

  // The on_auth_user_created trigger just inserted a profile row with the
  // default 'minimum' role — overwrite it with the role the admin chose.
  const { error: roleError } = await adminClient
    .from("profiles")
    .update({ role })
    .eq("id", invited.user.id);

  if (roleError) {
    return json({ error: roleError.message }, 500);
  }

  return json({ id: invited.user.id, email, name, role }, 200);
});
