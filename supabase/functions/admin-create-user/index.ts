// Creates a new user account, generates a one-time "set your password"
// link for them, and emails that link — with a chosen initial role
// (minimum/maximum).
//
// The mobile app can never hold the service-role key needed to create
// other users' accounts, so this runs server-side: it verifies the caller
// is a maximum-tier user (using a client scoped to the caller's own JWT,
// so RLS decides — the same rule enforced everywhere else), then uses the
// service-role client to create the user and set their role.
//
// The link is generated with admin.generateLink() rather than sent via
// admin.inviteUserByEmail() (an earlier version used that). Both produce
// the same kind of secure, one-time, expiring link, but generateLink()
// hands the link back to the caller instead of Supabase auto-mailing it —
// which matters because Supabase's own "invite" email reliably landed in
// spam in testing, for every recipient including ones with no prior
// history with this project, unlike the (recipient-initiated) password-
// reset email on the exact same SMTP relay. That gap survives identical
// wording and identical infrastructure, and isn't closeable without owning
// a domain and a dedicated transactional email service.
//
// So this function does both: it emails the link itself (best-effort, over
// the same Gmail SMTP already configured for the reset-password flow) AND
// returns the link in the response so the admin UI can show a copy/share
// action. The email may still land in spam — that risk hasn't gone away —
// but the admin always has the link to hand over directly (WhatsApp, text,
// in person) as a fallback that isn't email-deliverability-dependent.
// A failed send never fails account creation.
//
// The new user opens the link and lands on this app's reset-password page
// (already built to handle Supabase's various link formats) to set their
// password — nothing transmitted in cleartext either way.
//
// Requires SMTP_USER / SMTP_PASSWORD to be set as Edge Function secrets
// (Project Settings > Edge Functions > Secrets) — the same Gmail address
// and app password already configured for Supabase Auth's own emails.
// Functions can't read Auth's SMTP config, so it's set again here.
//
// Kept as ONE file (no supabase/functions/_shared import) — the Dashboard's
// function editor only uploads the single file you paste in, so a relative
// import to another file 404s at deploy time. If you switch to deploying
// via the Supabase CLI later, this can be split up again if useful.
//
// Deploy with: supabase functions deploy admin-create-user

import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

// ---------------------------------------------------------------------------
// Sends only the one-time link — never a password (see comment above the
// imports for why that distinction matters) — kept plain (no images, no
// tracking, no button-styled links) for the same reason as the rest of this
// app's transactional email: a templated/marketing look is itself a spam
// signal for unsolicited account-notification content.
// ---------------------------------------------------------------------------

async function sendInviteEmail(input: {
  to: string;
  name: string;
  link: string;
}): Promise<{ sent: boolean; error?: string }> {
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  if (!smtpUser || !smtpPassword) {
    return { sent: false, error: "SMTP_USER / SMTP_PASSWORD are not configured for this function" };
  }

  const hostname = Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com";
  const port = Number(Deno.env.get("SMTP_PORT") ?? "465");

  const client = new SMTPClient({
    connection: {
      hostname,
      port,
      tls: true,
      auth: { username: smtpUser, password: smtpPassword },
    },
  });

  const text =
    `Hi ${input.name},\n\n` +
    `An account has been set up for you on Ghella Materials, the warehouse materials system for Ghella Limited.\n\n` +
    `Set your password to get started: ${input.link}\n\n` +
    `If you weren't expecting this, you can safely ignore this email.\n\n` +
    `— Ghella Materials`;

  try {
    await client.send({
      from: `Ghella Materials <${smtpUser}>`,
      to: input.to,
      subject: "Your Ghella Materials account is ready",
      content: text,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "Unknown SMTP error" };
  } finally {
    try {
      await client.close();
    } catch {
      // Already closed/failed to connect — nothing to clean up.
    }
  }
}

// ---------------------------------------------------------------------------

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

  const inviteLink = linkData.properties.action_link;
  const emailResult = await sendInviteEmail({ to: email, name, link: inviteLink });
  if (!emailResult.sent) {
    console.error("Invite email not sent:", emailResult.error);
  }

  return json(
    {
      id: linkData.user.id,
      email,
      name,
      role,
      inviteLink,
      emailSent: emailResult.sent,
      emailError: emailResult.error,
    },
    200
  );
});
