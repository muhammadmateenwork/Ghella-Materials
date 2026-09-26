// Drains the notification_outbox table: for each pending row, sends an
// Expo push to every device the recipient has registered, and — if the row
// carries email_subject/email_body — an email to their current address.
// Not called by end users directly: the database kicks it the moment a row
// is queued (0016_instant_notifications.sql), and the pg_cron job from
// 0012_owner_reservation_workflow.sql calls it every minute as a safety net.
//
// Push and email are tracked and retried INDEPENDENTLY (push_sent_at /
// email_sent_at, see 0013_reliable_notification_delivery.sql) — a row is
// only left alone once whichever of the two channels it needs has actually
// been confirmed delivered. A transient failure (the recipient's device
// being offline right at send time, a network blip calling Expo's API, an
// SMTP hiccup) just leaves it pending for the next run instead of silently
// dropping it forever. `attempts` caps how many times we'll keep trying a
// row that's genuinely stuck (e.g. permanently invalid SMTP creds) so a
// dead channel doesn't retry forever.
//
// Kept as ONE file (no supabase/functions/_shared import) — the
// Dashboard's function editor only uploads the single file you paste in.
//
// Requires SMTP_USER / SMTP_PASSWORD to already be set as Edge Function
// secrets (the same ones send-item-notifications' sibling, admin-create-user,
// already uses) — no new secrets needed.
//
// Deploy by pasting this file into the Supabase Dashboard's function editor
// as a new function named "send-notification-outbox".

import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_CHUNK_SIZE = 100;
const BATCH_LIMIT = 200;
const MAX_ATTEMPTS = 30;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type OutboxRow = {
  id: string;
  user_id: string;
  push_title: string;
  push_body: string;
  push_data: Record<string, unknown> | null;
  email_subject: string | null;
  email_body: string | null;
  push_sent_at: string | null;
  email_sent_at: string | null;
};

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server is missing Supabase configuration" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Claimed rather than just selected (0016_instant_notifications.sql): the
  // database kicks this function the moment a row is queued, and the cron
  // safety net can overlap with that run — claiming guarantees each row is
  // handled by exactly one of them.
  const { data: pending, error: pendingError } = await adminClient.rpc("claim_notification_outbox", {
    p_max_attempts: MAX_ATTEMPTS,
    p_limit: BATCH_LIMIT,
  });

  if (pendingError) {
    return json({ error: pendingError.message }, 500);
  }
  if (!pending || pending.length === 0) {
    return json({ processed: 0, reason: "nothing pending" }, 200);
  }
  // A row that only needs email (already push_sent) but has no email
  // configured for this row at all shouldn't have been selected, but
  // guard anyway: nothing left to actually do for it.
  const rows = (pending as OutboxRow[]).filter(
    (row) => !row.push_sent_at || (row.email_subject && !row.email_sent_at)
  );
  if (rows.length === 0) {
    return json({ processed: 0, reason: "nothing pending" }, 200);
  }

  const errorsByRow = new Map<string, string>();
  const pushSucceededRowIds = new Set<string>();
  const emailSucceededRowIds = new Set<string>();
  const staleTokens = new Set<string>();

  // ---- Push ----
  const rowsNeedingPush = rows.filter((row) => !row.push_sent_at);
  const userIds = [...new Set(rowsNeedingPush.map((row) => row.user_id))];

  const { data: tokenRows } = await adminClient
    .from("push_tokens")
    .select("user_id, token")
    .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const tokensByUser = new Map<string, string[]>();
  for (const row of tokenRows ?? []) {
    const list = tokensByUser.get(row.user_id) ?? [];
    list.push(row.token);
    tokensByUser.set(row.user_id, list);
  }

  // Flattened so each Expo API ticket in the response can be matched back
  // to the exact row + token that produced it.
  const pushEntries: { rowId: string; token: string }[] = [];
  const pushMessages: Record<string, unknown>[] = [];
  for (const row of rowsNeedingPush) {
    const tokens = tokensByUser.get(row.user_id) ?? [];
    if (tokens.length === 0) {
      // Nothing to push to — this device-less user's push requirement is
      // trivially satisfied rather than retried forever.
      pushSucceededRowIds.add(row.id);
      continue;
    }
    for (const token of tokens) {
      pushEntries.push({ rowId: row.id, token });
      pushMessages.push({
        to: token,
        sound: "default",
        title: row.push_title,
        body: row.push_body,
        data: row.push_data ?? {},
      });
    }
  }

  for (let i = 0; i < pushMessages.length; i += EXPO_PUSH_CHUNK_SIZE) {
    const chunkEntries = pushEntries.slice(i, i + EXPO_PUSH_CHUNK_SIZE);
    const chunkMessages = pushMessages.slice(i, i + EXPO_PUSH_CHUNK_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunkMessages),
      });
      if (!res.ok) {
        const message = `Expo push API returned ${res.status}`;
        for (const entry of chunkEntries) errorsByRow.set(entry.rowId, message);
        continue;
      }
      const body = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
      const tickets = body.data ?? [];
      // Ticket ids let a delivery be traced afterwards via Expo's
      // getReceipts API (Edge Functions → Logs).
      console.log("Expo push tickets:", JSON.stringify(tickets));
      tickets.forEach((ticket, idx) => {
        const entry = chunkEntries[idx];
        if (!entry) return;
        if (ticket.status === "ok") {
          pushSucceededRowIds.add(entry.rowId);
        } else {
          if (ticket.details?.error === "DeviceNotRegistered") staleTokens.add(entry.token);
          else errorsByRow.set(entry.rowId, ticket.details?.error ?? "Push delivery failed");
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Expo push request failed";
      for (const entry of chunkEntries) errorsByRow.set(entry.rowId, message);
      console.error("Expo push send failed:", message);
    }
  }

  if (staleTokens.size > 0) {
    await adminClient.from("push_tokens").delete().in("token", [...staleTokens]);
  }
  // A row whose only tokens were all stale (DeviceNotRegistered, now
  // removed) has nothing left to push to — same as having zero tokens.
  for (const row of rowsNeedingPush) {
    if (pushSucceededRowIds.has(row.id) || errorsByRow.has(row.id)) continue;
    const tokens = tokensByUser.get(row.user_id) ?? [];
    if (tokens.length > 0 && tokens.every((t) => staleTokens.has(t))) pushSucceededRowIds.add(row.id);
  }

  // ---- Email ----
  const emailRows = rows.filter((row) => row.email_subject && row.email_body && !row.email_sent_at);
  if (emailRows.length > 0) {
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const hostname = Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com";
    const port = Number(Deno.env.get("SMTP_PORT") ?? "465");

    if (smtpUser && smtpPassword) {
      const { data: profileRows } = await adminClient
        .from("profiles")
        .select("id, email")
        .in("id", [...new Set(emailRows.map((row) => row.user_id))]);
      const emailByUser = new Map<string, string>();
      for (const row of profileRows ?? []) emailByUser.set(row.id, row.email);

      const client = new SMTPClient({
        connection: { hostname, port, tls: true, auth: { username: smtpUser, password: smtpPassword } },
      });

      for (const row of emailRows) {
        const to = emailByUser.get(row.user_id);
        if (!to) {
          // No profile/email to send to (deleted user) — nothing to retry.
          emailSucceededRowIds.add(row.id);
          continue;
        }
        try {
          await client.send({
            from: `Ghella Materials <${smtpUser}>`,
            to,
            subject: row.email_subject as string,
            content: row.email_body as string,
          });
          emailSucceededRowIds.add(row.id);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Email send failed";
          errorsByRow.set(row.id, errorsByRow.has(row.id) ? `${errorsByRow.get(row.id)}; ${message}` : message);
          console.error("Notification email send failed:", message);
        }
      }

      try {
        await client.close();
      } catch {
        // Already closed/failed to connect — nothing to clean up.
      }
    } else {
      const message = "SMTP_USER / SMTP_PASSWORD not configured";
      for (const row of emailRows) errorsByRow.set(row.id, message);
      console.error(message, "— skipped", emailRows.length, "email(s)");
    }
  }

  // ---- Persist outcomes ----
  const now = new Date().toISOString();
  if (pushSucceededRowIds.size > 0) {
    await adminClient.from("notification_outbox").update({ push_sent_at: now }).in("id", [...pushSucceededRowIds]);
  }
  if (emailSucceededRowIds.size > 0) {
    await adminClient.from("notification_outbox").update({ email_sent_at: now }).in("id", [...emailSucceededRowIds]);
  }
  // Every row we actually looked at this run counts as an attempt,
  // whether or not it fully succeeded — this is what makes MAX_ATTEMPTS
  // eventually stop retrying a row that's permanently broken.
  for (const row of rows) {
    const stillPending =
      (!row.push_sent_at && !pushSucceededRowIds.has(row.id)) ||
      (row.email_subject && !row.email_sent_at && !emailSucceededRowIds.has(row.id));
    if (!stillPending) continue;
    await adminClient.rpc("increment_notification_outbox_attempts", {
      p_id: row.id,
      p_error: errorsByRow.get(row.id) ?? null,
    });
  }

  return json(
    {
      processed: rows.length,
      pushSucceeded: pushSucceededRowIds.size,
      emailSucceeded: emailSucceededRowIds.size,
      staleTokensRemoved: staleTokens.size,
    },
    200
  );
});
