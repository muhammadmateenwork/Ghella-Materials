// Flushes the pending_item_notifications queue into a single push
// notification, sent to every registered device — any user can browse the
// full catalog, so "a material was added" isn't scoped to anyone
// specific. Called every 2 minutes by the pg_cron job set up in
// 0008_push_notifications.sql, not by end users directly.
//
// Sends one push regardless of how many items queued up since the last
// run: "New material added: <name>" for exactly one, or "<count> new
// materials added" for a burst — so someone bulk-entering stock doesn't
// spam every device with one notification per item.
//
// Rows are marked sent BEFORE the push actually goes out, not after — if
// the send fails partway, we'd rather silently miss a notification than
// risk sending the same one again on the next run.
//
// Kept as ONE file (no supabase/functions/_shared import) — the
// Dashboard's function editor only uploads the single file you paste in.
//
// Deploy with: supabase functions deploy send-item-notifications

import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_CHUNK_SIZE = 100;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server is missing Supabase configuration" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: pending, error: pendingError } = await adminClient
    .from("pending_item_notifications")
    .select("id, item_name")
    .eq("sent", false);

  if (pendingError) {
    return json({ error: pendingError.message }, 500);
  }
  if (!pending || pending.length === 0) {
    return json({ sent: 0, reason: "nothing pending" }, 200);
  }

  const ids = pending.map((row) => row.id);
  const { error: markSentError } = await adminClient
    .from("pending_item_notifications")
    .update({ sent: true })
    .in("id", ids);
  if (markSentError) {
    return json({ error: markSentError.message }, 500);
  }

  const { data: tokens, error: tokensError } = await adminClient.from("push_tokens").select("token");
  if (tokensError) {
    return json({ error: tokensError.message }, 500);
  }
  if (!tokens || tokens.length === 0) {
    return json({ sent: 0, reason: "no registered devices", itemCount: pending.length }, 200);
  }

  const body =
    pending.length === 1
      ? `New material added: ${pending[0].item_name}`
      : `${pending.length} new materials added`;

  const messages = tokens.map((row) => ({
    to: row.token,
    sound: "default",
    title: "Ghella Materials",
    body,
    data: { type: "new_items" },
  }));

  for (let i = 0; i < messages.length; i += EXPO_PUSH_CHUNK_SIZE) {
    const chunk = messages.slice(i, i + EXPO_PUSH_CHUNK_SIZE);
    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunk),
      });
    } catch (err) {
      console.error("Expo push send failed:", err instanceof Error ? err.message : err);
    }
  }

  return json({ sent: messages.length, itemCount: pending.length, message: body }, 200);
});
