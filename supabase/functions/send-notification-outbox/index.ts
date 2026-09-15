// Drains the notification_outbox table: for each pending row, sends an
// Expo push to every device the recipient has registered, and — if the row
// carries email_subject/email_body — an email to their current address.
// Called every minute by the pg_cron job set up in
// 0012_owner_reservation_workflow.sql, not by end users directly.
//
// Rows are marked sent BEFORE the actual send, not after — same
// miss-rather-than-duplicate tradeoff as send-item-notifications.
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
};

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server is missing Supabase configuration" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: pending, error: pendingError } = await adminClient
    .from("notification_outbox")
    .select("id, user_id, push_title, push_body, push_data, email_subject, email_body")
    .is("sent_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (pendingError) {
    return json({ error: pendingError.message }, 500);
  }
  if (!pending || pending.length === 0) {
    return json({ processed: 0, reason: "nothing pending" }, 200);
  }
  const rows = pending as OutboxRow[];

  const ids = rows.map((row) => row.id);
  const { error: markSentError } = await adminClient
    .from("notification_outbox")
    .update({ sent_at: new Date().toISOString() })
    .in("id", ids);
  if (markSentError) {
    return json({ error: markSentError.message }, 500);
  }

  const userIds = [...new Set(rows.map((row) => row.user_id))];

  const { data: tokenRows } = await adminClient
    .from("push_tokens")
    .select("user_id, token")
    .in("user_id", userIds);
  const tokensByUser = new Map<string, string[]>();
  for (const row of tokenRows ?? []) {
    const list = tokensByUser.get(row.user_id) ?? [];
    list.push(row.token);
    tokensByUser.set(row.user_id, list);
  }

  const pushMessages = rows.flatMap((row) =>
    (tokensByUser.get(row.user_id) ?? []).map((token) => ({
      to: token,
      sound: "default",
      title: row.push_title,
      body: row.push_body,
      data: row.push_data ?? {},
    }))
  );

  for (let i = 0; i < pushMessages.length; i += EXPO_PUSH_CHUNK_SIZE) {
    const chunk = pushMessages.slice(i, i + EXPO_PUSH_CHUNK_SIZE);
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

  const emailRows = rows.filter((row) => row.email_subject && row.email_body);
  let emailsSent = 0;

  if (emailRows.length > 0) {
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const hostname = Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com";
    const port = Number(Deno.env.get("SMTP_PORT") ?? "465");

    if (smtpUser && smtpPassword) {
      const { data: profileRows } = await adminClient
        .from("profiles")
        .select("id, email")
        .in(
          "id",
          [...new Set(emailRows.map((row) => row.user_id))]
        );
      const emailByUser = new Map<string, string>();
      for (const row of profileRows ?? []) emailByUser.set(row.id, row.email);

      const client = new SMTPClient({
        connection: { hostname, port, tls: true, auth: { username: smtpUser, password: smtpPassword } },
      });

      for (const row of emailRows) {
        const to = emailByUser.get(row.user_id);
        if (!to) continue;
        try {
          await client.send({
            from: `Ghella Materials <${smtpUser}>`,
            to,
            subject: row.email_subject as string,
            content: row.email_body as string,
          });
          emailsSent += 1;
        } catch (err) {
          console.error("Notification email send failed:", err instanceof Error ? err.message : err);
        }
      }

      try {
        await client.close();
      } catch {
        // Already closed/failed to connect — nothing to clean up.
      }
    } else {
      console.error("SMTP_USER / SMTP_PASSWORD not configured — skipped", emailRows.length, "email(s)");
    }
  }

  return json({ processed: rows.length, pushSent: pushMessages.length, emailsSent }, 200);
});
