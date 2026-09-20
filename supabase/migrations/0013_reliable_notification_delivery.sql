-- Retry-safe notification delivery.
--
-- Both flush jobs (send-notification-outbox, send-item-notifications) used
-- to mark rows "sent" BEFORE attempting delivery, on the theory that a
-- missed notification is better than a duplicate. In practice this meant
-- any transient failure at send time — the device being offline right at
-- that moment, a network blip calling Expo's push API, an SMTP hiccup —
-- silently and PERMANENTLY dropped that notification, since nothing ever
-- looked at it again. That's the opposite of "delivered no matter what":
-- this migration adds the columns needed to track push and email delivery
-- independently and keep retrying only what actually failed, instead of
-- gambling on everything succeeding in one shot.

alter table public.notification_outbox
  add column if not exists push_sent_at timestamptz,
  add column if not exists email_sent_at timestamptz,
  add column if not exists attempts integer not null default 0,
  add column if not exists last_error text;

-- Rows already marked via the old single `sent_at` column: treat them as
-- fully delivered on both fronts rather than re-sending potentially
-- stale/confusing notifications the moment this migration runs.
update public.notification_outbox
set push_sent_at = coalesce(push_sent_at, sent_at),
    email_sent_at = coalesce(email_sent_at, sent_at)
where sent_at is not null;

drop index if exists notification_outbox_unsent_idx;
create index if not exists notification_outbox_pending_idx
  on public.notification_outbox (created_at)
  where push_sent_at is null or email_sent_at is null;

alter table public.pending_item_notifications
  add column if not exists attempts integer not null default 0,
  add column if not exists last_error text;

-- supabase-js's .update() can't express `attempts = attempts + 1` — an
-- RPC is the simplest way to do the increment atomically from the flush
-- functions without a read-modify-write race between concurrent runs.
create or replace function public.increment_notification_outbox_attempts(p_id uuid, p_error text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notification_outbox
  set attempts = attempts + 1,
      last_error = p_error
  where id = p_id;
$$;

create or replace function public.increment_pending_item_notification_attempts(p_id uuid, p_error text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.pending_item_notifications
  set attempts = attempts + 1,
      last_error = p_error
  where id = p_id;
$$;
