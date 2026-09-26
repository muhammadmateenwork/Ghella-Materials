-- Near-instant notifications.
--
-- Until now both flush functions only ran on a pg_cron schedule (every
-- minute for the outbox, every 2 minutes for new materials), so a
-- notification waited up to that long before being sent. Now:
--
-- 1. Queuing a notification immediately "kicks" its flush function over
--    HTTP (pg_net, same Vault-stored URL/key as the cron jobs), so it goes
--    out within seconds.
-- 2. New materials keep a short grouping window: only the first item of a
--    burst kicks the function, with delay_seconds = 10, and the function
--    waits that long before collecting everything queued so far. Someone
--    entering 15 materials in a row still produces one "15 new materials
--    added" push, ~10 seconds after the first.
-- 3. Both cron jobs stay, every minute, as a safety net that retries
--    anything a kick missed or failed to deliver.
-- 4. Because a kicked run and a cron run can now overlap, each run CLAIMS
--    its rows first (claimed_at, FOR UPDATE SKIP LOCKED) so the same
--    notification is never sent twice. A claim older than 2 minutes is
--    treated as abandoned (the run crashed) and can be picked up again.

-- ===========================================================================
-- Claims
-- ===========================================================================

alter table public.pending_item_notifications
  add column if not exists claimed_at timestamptz;
alter table public.notification_outbox
  add column if not exists claimed_at timestamptz;

create or replace function public.claim_pending_item_notifications(p_max_attempts integer)
returns setof public.pending_item_notifications
language sql
security definer
set search_path = public
as $$
  update public.pending_item_notifications
  set claimed_at = now()
  where id in (
    select id from public.pending_item_notifications
    where sent = false
      and attempts < p_max_attempts
      and (claimed_at is null or claimed_at < now() - interval '2 minutes')
    for update skip locked
  )
  returning *;
$$;

create or replace function public.claim_notification_outbox(p_max_attempts integer, p_limit integer)
returns setof public.notification_outbox
language sql
security definer
set search_path = public
as $$
  update public.notification_outbox
  set claimed_at = now()
  where id in (
    select id from public.notification_outbox
    where attempts < p_max_attempts
      and (push_sent_at is null or (email_subject is not null and email_body is not null and email_sent_at is null))
      and (claimed_at is null or claimed_at < now() - interval '2 minutes')
    order by created_at
    limit p_limit
    for update skip locked
  )
  returning *;
$$;

-- A failed attempt also releases the claim, so the next run (kick or cron)
-- can retry the row straight away instead of waiting out the 2 minutes.
create or replace function public.increment_notification_outbox_attempts(p_id uuid, p_error text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notification_outbox
  set attempts = attempts + 1,
      last_error = p_error,
      claimed_at = null
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
      last_error = p_error,
      claimed_at = null
  where id = p_id;
$$;

-- Only the flush functions (service role) may claim or count attempts.
revoke execute on function public.claim_pending_item_notifications(integer) from public, anon, authenticated;
revoke execute on function public.claim_notification_outbox(integer, integer) from public, anon, authenticated;
revoke execute on function public.increment_notification_outbox_attempts(uuid, text) from public, anon, authenticated;
revoke execute on function public.increment_pending_item_notification_attempts(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_pending_item_notifications(integer) to service_role;
grant execute on function public.claim_notification_outbox(integer, integer) to service_role;
grant execute on function public.increment_notification_outbox_attempts(uuid, text) to service_role;
grant execute on function public.increment_pending_item_notification_attempts(uuid, text) to service_role;

-- ===========================================================================
-- Kicks
-- ===========================================================================

-- Fire-and-forget HTTP call to an edge function. pg_net queues the request
-- and sends it after the calling transaction commits, so the function
-- always sees the newly queued row.
create or replace function public.kick_edge_function(p_function text, p_body jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'publishable_key';
  if v_url is null or v_key is null then
    -- Vault not set up: nothing to call. The cron safety net still runs.
    return;
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/' || p_function,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
    body := p_body
  );
end;
$$;

revoke execute on function public.kick_edge_function(text, jsonb) from public, anon, authenticated;

-- Outbox (reservation made / cancelled, material deleted): kick once per
-- statement — a material deletion can queue several rows at once.
create or replace function public.kick_notification_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.kick_edge_function('send-notification-outbox');
  return null;
end;
$$;

drop trigger if exists notification_outbox_kick on public.notification_outbox;
create trigger notification_outbox_kick
  after insert on public.notification_outbox
  for each statement execute function public.kick_notification_outbox();

-- New materials: only the first item of a burst kicks. If another recent
-- item is already waiting unclaimed, a kicked run is already on its way
-- and will pick this one up too when its 10-second window ends.
create or replace function public.kick_item_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.pending_item_notifications
    where id <> new.id
      and sent = false
      and claimed_at is null
      and created_at > now() - interval '1 minute'
  ) then
    perform public.kick_edge_function('send-item-notifications', jsonb_build_object('delay_seconds', 10));
  end if;
  return null;
end;
$$;

drop trigger if exists pending_item_notifications_kick on public.pending_item_notifications;
create trigger pending_item_notifications_kick
  after insert on public.pending_item_notifications
  for each row execute function public.kick_item_notifications();

-- ===========================================================================
-- Safety-net schedules
-- ===========================================================================

-- Re-scheduling an existing job name updates it in place. New materials go
-- from every 2 minutes to every minute; the outbox job is unchanged.
select cron.schedule(
  'flush-item-notifications',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/send-item-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
