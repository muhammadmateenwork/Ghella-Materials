// Creates a new user account and generates a one-time "set your password"
// link for them, with a chosen initial role (minimum/maximum).
//
// The mobile app can never hold the service-role key needed to create
// other users' accounts, so this runs server-side: it verifies the caller
// is a maximum-tier user (using a client scoped to the caller's own JWT,
// so RLS decides — the same rule enforced everywhere else), then uses the
// service-role client to create the user and set their role.
//
// This deliberately does NOT email the link (admin.inviteUserByEmail did,
// in an earlier version). Even with plain, branded wording and no password
// in the body, Supabase's own auto-sent "invite" email still landed in spam
// for every recipient tested, including ones that had never received
// anything from this project before — unlike the password-reset email,
// which is recipient-initiated (expected) rather than admin-initiated
// (unsolicited), and reaches the inbox fine on the exact same SMTP relay.
// That gap survives identical content and identical infrastructure, so no
// further wording change was going to close it without owning a domain and
// a dedicated transactional email service — not something this project has.
//
// Instead, admin.generateLink() produces the exact same kind of secure,
// one-time, expiring link as an invite email would — it's just returned to
// the caller instead of emailed, so the admin can hand it to the new user
// directly (WhatsApp, text, in person), the same way they already used to
// hand over a password, except this is a link that only lets them set
// their own password, never a credential itself. The new user opens the
// link and lands on this app's reset-password page (already built to
// handle Supabase's various link formats) to set it.
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

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { name },
      redirectTo: siteUrl ? `${siteUrl}/reset-password` : undefined,
    },
  });

  if (linkError || !linkData?.user) {
    const message = linkError?.message ?? "Could not create user";
    const status = /already.*registered|already exists/i.test(message) ? 409 : 400;
    return json({ error: message }, status);
  }

  // The on_auth_user_created trigger just inserted a profile row with the
  // default 'minimum' role — overwrite it with the role the admin chose.
  const { error: roleError } = await adminClient
    .from("profiles")
    .update({ role })
    .eq("id", linkData.user.id);

  if (roleError) {
    return json({ error: roleError.message }, 500);
  }

  return json(
    { id: linkData.user.id, email, name, role, inviteLink: linkData.properties.action_link },
    200
  );
});
