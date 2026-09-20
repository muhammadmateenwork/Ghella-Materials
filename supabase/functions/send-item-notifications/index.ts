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
// Rows are only marked sent AFTER a confirmed successful push (checking
// the actual per-device result Expo's API returns, not just that the HTTP
// request didn't throw) — see 0013_reliable_notification_delivery.sql. A
// transient failure (a device offline right at send time, a network blip
// calling Expo's API) leaves the batch pending for the next run instead of
// silently dropping it forever. `attempts` caps retries so a permanently
// stuck batch doesn't retry forever.
//
// Kept as ONE file (no supabase/functions/_shared import) — the
// Dashboard's function editor only uploads the single file you paste in.
//
// Deploy by pasting this file into the Supabase Dashboard's function editor
// as the "send-item-notifications" function.

import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_CHUNK_SIZE = 100;
const MAX_ATTEMPTS = 30;

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
    .eq("sent", false)
    .lt("attempts", MAX_ATTEMPTS);

  if (pendingError) {
    return json({ error: pendingError.message }, 500);
  }
  if (!pending || pending.length === 0) {
    return json({ sent: 0, reason: "nothing pending" }, 200);
  }
  const ids = pending.map((row) => row.id);

  const { data: tokens, error: tokensError } = await adminClient.from("push_tokens").select("token");
  if (tokensError) {
    return json({ error: tokensError.message }, 500);
  }
  if (!tokens || tokens.length === 0) {
    // No devices registered at all — there's genuinely nothing to deliver
    // to, so this batch is done rather than retried forever.
    await adminClient.from("pending_item_notifications").update({ sent: true }).in("id", ids);
    return json({ sent: 0, reason: "no registered devices", itemCount: pending.length }, 200);
  }

  const body =
    pending.length === 1
      ? `New material added: ${pending[0].item_name}`
      : `${pending.length} new materials added`;

  const staleTokens = new Set<string>();
  let succeeded = 0;
  let lastError: string | null = null;

  for (let i = 0; i < tokens.length; i += EXPO_PUSH_CHUNK_SIZE) {
    const chunk = tokens.slice(i, i + EXPO_PUSH_CHUNK_SIZE);
    const messages = chunk.map((row) => ({
      to: row.token,
      sound: "default",
      title: "Ghella Materials",
      body,
      data: { type: "new_items" },
    }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        lastError = `Expo push API returned ${res.status}`;
        continue;
      }
      const responseBody = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
      const tickets = responseBody.data ?? [];
      tickets.forEach((ticket, idx) => {
        if (ticket.status === "ok") {
          succeeded += 1;
        } else if (ticket.details?.error === "DeviceNotRegistered") {
          staleTokens.add(chunk[idx].token);
        } else {
          lastError = ticket.details?.error ?? "Push delivery failed";
        }
      });
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Expo push request failed";
      console.error("Expo push send failed:", lastError);
    }
  }

  if (staleTokens.size > 0) {
    await adminClient.from("push_tokens").delete().in("token", [...staleTokens]);
  }

  // "Delivered" means at least one live device actually received it, or
  // every registered token turned out to be stale (nothing left to
  // deliver to) — either way, retrying this exact batch again won't help.
  const delivered = succeeded > 0 || staleTokens.size === tokens.length;
  if (delivered) {
    await adminClient.from("pending_item_notifications").update({ sent: true }).in("id", ids);
  } else {
    for (const id of ids) {
      await adminClient.rpc("increment_pending_item_notification_attempts", { p_id: id, p_error: lastError });
    }
  }

  return json({ sent: succeeded, delivered, itemCount: pending.length, message: body }, 200);
});
