// Permanently deletes a user account (auth user + profile, via the
// profiles.id -> auth.users(id) ON DELETE CASCADE FK).
//
// Runs server-side for the same reason admin-create-user does — deleting
// an auth.users row requires the service-role key, which the client apps
// never hold. The caller is independently verified as maximum-tier here,
// and is blocked from deleting their own account (an admin can always
// lock everyone else out otherwise, including themselves with no one left
// to undo it).
//
// Deploy with: supabase functions deploy admin-delete-user

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
    return json({ error: "Only maximum-tier users can delete accounts" }, 403);
  }

  let body: { userId?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) {
    return json({ error: "userId is required" }, 400);
  }

  if (userId === authData.user.id) {
    return json({ error: "You cannot delete your own account" }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    return json({ error: deleteError.message }, 400);
  }

  return json({ id: userId }, 200);
});
