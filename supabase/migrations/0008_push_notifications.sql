-- Push notifications: every user can browse the full catalog, so when a
-- material is added, everyone gets notified — but one push per item would
-- spam anyone doing a bulk data-entry session. Instead, item creation
-- queues a row in pending_item_notifications, and a job flushes that
-- queue every 2 minutes into a single push: "New material added: X" for
-- exactly one item, or "N new materials added" for a burst. A fixed
-- 2-minute cron tick (rather than "2 minutes after the first item")
-- trades a little timing precision (an item can wait anywhere from
-- seconds to just under 4 minutes) for a much simpler, more robust
-- implementation — no locking or long-lived function invocations needed.

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- A device's Expo push token can outlive any one user session (shared
  -- devices are unlikely here, but re-signing-in shouldn't create
  -- duplicates) — unique + upsert-on-conflict keeps one row per device.
  token text not null unique,
  created_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "push_tokens: manage own" on public.push_tokens
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table public.pending_item_notifications (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  created_at timestamptz not null default now(),
  sent boolean not null default false
);

-- Any signed-in user can queue an event (item creation already requires
-- max-tier, enforced by the items table's own RLS — this table just logs
-- that it happened for the flush job to pick up). No one needs to read
-- this table directly; the flush job uses the service-role key.
alter table public.pending_item_notifications enable row level security;

create policy "pending_item_notifications: authenticated insert" on public.pending_item_notifications
  for insert
  with check (auth.role() = 'authenticated');

-- pg_cron runs the flush on a schedule; pg_net lets that scheduled SQL
-- call the send-item-notifications edge function over HTTP — together
-- they replace what would otherwise need an always-on server process.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'flush-item-notifications',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://vwwwfjcbqfdrwkowipzq.supabase.co/functions/v1/send-item-notifications',
    headers := jsonb_build_object(
      -- The anon key is safe to embed here — it's the same public,
      -- publishable key already shipped in every client build. It only
      -- gets the request PAST Supabase's gateway JWT check; the function
      -- itself uses its own service-role secret for the actual work,
      -- same as every other edge function in this project.
      'Authorization', 'Bearer sb_publishable_J8mSfnyoOn84qHEavn0HlA_ylf0QKZR',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
