// Flushes the pending_item_notifications queue into a single push
// notification per device, sent to every registered device except the
// ones belonging to whoever added the material — any user can browse the
// full catalog, so "a material was added" isn't scoped to anyone else. Not called by end users directly: the database kicks it the
// moment the first material of a burst is queued (with delay_seconds = 10,
// see 0016_instant_notifications.sql), and a pg_cron job calls it every
// minute as a safety net.
//
// Sends one push regardless of how many items queued up since the last
// run: "New material added: <name>" for exactly one, or "<count> new
// materials added" for a burst — so someone bulk-entering stock doesn't
// spam every device with one notification per item. The delay_seconds wait
// is what gives a burst time to finish queuing before it's collected.
//
// Rows are CLAIMED before sending (claim_pending_item_notifications), so a
// kicked run and a cron run that overlap never send the same item twice.
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
// Upper bound on the grouping wait a caller can ask for.
const MAX_DELAY_SECONDS = 20;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server is missing Supabase configuration" }, 500);
  }

  // Kicks from the database pass delay_seconds; cron calls pass nothing.
  let delaySeconds = 0;
  try {
    const payload = (await req.json()) as { delay_seconds?: unknown };
    if (typeof payload.delay_seconds === "number") {
      delaySeconds = Math.min(Math.max(payload.delay_seconds, 0), MAX_DELAY_SECONDS);
    }
  } catch {
    // No/invalid body — no delay.
  }
  if (delaySeconds > 0) {
    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: claimed, error: pendingError } = await adminClient.rpc("claim_pending_item_notifications", {
    p_max_attempts: MAX_ATTEMPTS,
  });

  if (pendingError) {
    return json({ error: pendingError.message }, 500);
  }
  const pending = (claimed ?? []) as { id: string; item_name: string; created_by: string | null }[];
  if (pending.length === 0) {
    return json({ sent: 0, reason: "nothing pending" }, 200);
  }
  const ids = pending.map((row) => row.id);

  const { data: tokenRows, error: tokensError } = await adminClient.from("push_tokens").select("user_id, token");
  if (tokensError) {
    return json({ error: tokensError.message }, 500);
  }

  // Nobody is notified about materials they added themselves: each device
  // is told only about the items in this batch that someone ELSE added.
  // E.g. X adds 3 and Y adds 2 → X hears "2 new materials", Y hears
  // "3 new materials", everyone else hears "5 new materials".
  const recipients = (tokenRows ?? [])
    .map((row) => {
      const items = pending.filter((item) => item.created_by !== row.user_id);
      return {
        token: row.token as string,
        body: items.length === 1 ? `New material added: ${items[0].item_name}` : `${items.length} new materials added`,
        itemCount: items.length,
      };
    })
    .filter((recipient) => recipient.itemCount > 0);

  if (recipients.length === 0) {
    // No devices registered, or the only devices belong to whoever added
    // these items — nothing to deliver, so the batch is done rather than
    // retried forever.
    await adminClient.from("pending_item_notifications").update({ sent: true }).in("id", ids);
    return json({ sent: 0, reason: "no other registered devices", itemCount: pending.length }, 200);
  }

  const staleTokens = new Set<string>();
  let succeeded = 0;
  let lastError: string | null = null;

  for (let i = 0; i < recipients.length; i += EXPO_PUSH_CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + EXPO_PUSH_CHUNK_SIZE);
    const messages = chunk.map((recipient) => ({
      to: recipient.token,
      sound: "default",
      title: "Ghella Materials",
      body: recipient.body,
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
      // Ticket ids let a delivery be traced afterwards via Expo's
      // getReceipts API (Edge Functions → Logs).
      console.log("Expo push tickets:", JSON.stringify(tickets));
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
  // every recipient token turned out to be stale (nothing left to
  // deliver to) — either way, retrying this exact batch again won't help.
  const delivered = succeeded > 0 || staleTokens.size === recipients.length;
  if (delivered) {
    await adminClient.from("pending_item_notifications").update({ sent: true }).in("id", ids);
  } else {
    for (const id of ids) {
      await adminClient.rpc("increment_pending_item_notification_attempts", { p_id: id, p_error: lastError });
    }
  }

  return json({ sent: succeeded, delivered, itemCount: pending.length, recipients: recipients.length }, 200);
});
