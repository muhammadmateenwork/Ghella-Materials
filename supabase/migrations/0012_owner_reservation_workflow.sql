-- Rounds out the ownership model from 0011 with the rest of the
-- owner-centric reservation workflow:
--
-- 1. Reservations: an item's own owner can now cancel a reservation made
--    against their item (not just the reservation's own maker) — e.g. if
--    they're withdrawing stock or the reservation was made in error. Still
--    nobody else, and still not other maximum-tier users' reservations on
--    items they don't own.
-- 2. Reservation reads are now scoped to "your own reservations" or
--    "reservations against items you own" — the old blanket
--    "any maximum-tier user reads every reservation" policy is dropped
--    along with the admin Reservation Log feature it existed for (removed
--    per spec: it just duplicated what's now visible per-item).
-- 3. items.quantity can't be edited below the amount currently actively
--    reserved — you can always raise it, and you can lower it down to (but
--    not below) what's already committed.
-- 4. A generic per-user notification outbox (push + optional email), fed by
--    triggers for: item owner notified when their material is reserved;
--    reserver notified (push + email) when the owner cancels their
--    reservation or deletes the material itself. A new edge function drains
--    it, on its own cron tick, the same pattern as
--    0008_push_notifications.sql's send-item-notifications.

-- ===========================================================================
-- 1 & 2. Reservation cancel/read scoping
-- ===========================================================================

create or replace function public.cancel_reservation(p_reservation_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations;
  v_item_owner uuid;
begin
  select * into v_reservation from public.reservations where id = p_reservation_id;

  if not found then
    raise exception 'Reservation not found';
  end if;

  select created_by into v_item_owner
  from public.items
  where id = v_reservation.item_id;

  if v_reservation.user_id <> auth.uid()
     and not (public.is_max_tier() and v_item_owner is not null and v_item_owner = auth.uid())
  then
    raise exception 'Not authorized to cancel this reservation';
  end if;

  update public.reservations
  set status = 'cancelled', cancelled_at = now()
  where id = p_reservation_id
  returning * into v_reservation;

  return v_reservation;
end;
$$;

drop policy if exists "reservations: max tier reads all" on public.reservations;
drop policy if exists "reservations: item owner reads item's reservations" on public.reservations;

create policy "reservations: item owner reads item's reservations" on public.reservations
  for select
  using (
    public.is_max_tier()
    and exists (
      select 1 from public.items
      where items.id = reservations.item_id
        and (items.created_by = auth.uid() or items.created_by is null)
    )
  );

-- ===========================================================================
-- 3. Quantity floor — can't drop below what's actively reserved
-- ===========================================================================

-- security definer so the reserved-total check always sees every active
-- reservation regardless of the calling user's own RLS visibility — this is
-- a data-integrity floor, not a read permission, so it must never
-- under-count and let a decrease through that shouldn't be allowed.
create or replace function public.items_enforce_quantity_floor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserved numeric;
begin
  if new.quantity is distinct from old.quantity then
    select coalesce(sum(quantity), 0) into v_reserved
    from public.reservations
    where item_id = new.id and status = 'active';

    if new.quantity < v_reserved then
      raise exception 'Quantity can''t go below % — that''s already reserved', v_reserved;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists items_check_quantity_floor on public.items;
create trigger items_check_quantity_floor
  before update on public.items
  for each row execute function public.items_enforce_quantity_floor();

-- ===========================================================================
-- 4. Notification outbox
-- ===========================================================================

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  push_title text not null,
  push_body text not null,
  push_data jsonb not null default '{}'::jsonb,
  -- Both null = push-only notification. The flush job looks up the
  -- recipient's current email from profiles rather than storing it here, so
  -- it always sends to their latest address.
  email_subject text,
  email_body text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notification_outbox_unsent_idx
  on public.notification_outbox (created_at) where sent_at is null;

alter table public.notification_outbox enable row level security;
-- No public policies: rows are written only by the security-definer trigger
-- functions below, and read only by the flush edge function's service-role
-- client (which bypasses RLS entirely) — nobody should reach this table
-- directly over the API in either direction.

-- Item owner is notified (push only) when someone reserves their material.
create or replace function public.notify_owner_of_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items;
  v_reserver_name text;
begin
  select * into v_item from public.items where id = new.item_id;
  if v_item.id is null or v_item.created_by is null then
    return new;
  end if;

  select name into v_reserver_name from public.profiles where id = new.user_id;

  insert into public.notification_outbox (user_id, push_title, push_body, push_data)
  values (
    v_item.created_by,
    'New reservation',
    format('%s reserved %s of "%s".', coalesce(v_reserver_name, 'Someone'), new.quantity::text, v_item.name),
    jsonb_build_object('type', 'reservation_received', 'item_id', v_item.id)
  );

  return new;
end;
$$;

drop trigger if exists reservations_notify_owner on public.reservations;
create trigger reservations_notify_owner
  after insert on public.reservations
  for each row execute function public.notify_owner_of_reservation();

-- Reserver is notified (push + email) when the item's owner cancels their
-- reservation for them. auth.uid() still reflects the real calling user
-- inside a security-definer function (it comes from the request's JWT, not
-- the function's own privilege level) — cancel_reservation above only ever
-- lets this branch execute for the reservation's own maker or the item's
-- owner, so "cancelled by someone other than the reservation's own user"
-- unambiguously means the owner did it.
create or replace function public.notify_reserver_of_owner_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_name text;
  v_reserver_name text;
begin
  if new.status = 'cancelled' and old.status = 'active' and auth.uid() is distinct from new.user_id then
    select name into v_item_name from public.items where id = new.item_id;
    select name into v_reserver_name from public.profiles where id = new.user_id;

    insert into public.notification_outbox (user_id, push_title, push_body, push_data, email_subject, email_body)
    values (
      new.user_id,
      'Reservation cancelled',
      format(
        'Your reservation of %s "%s" was cancelled by the person who added it.',
        new.quantity::text,
        coalesce(v_item_name, 'a material')
      ),
      jsonb_build_object('type', 'reservation_cancelled', 'item_id', new.item_id),
      format('Your reservation was cancelled — %s', coalesce(v_item_name, 'a material')),
      format(
        e'Hi %s,\n\nYour reservation of %s x "%s" has been cancelled by the person who added this material.\n\nIf you have questions, please reach out to them directly.\n\n— Ghella Materials',
        coalesce(v_reserver_name, 'there'),
        new.quantity::text,
        coalesce(v_item_name, 'a material')
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_notify_on_owner_cancel on public.reservations;
create trigger reservations_notify_on_owner_cancel
  after update on public.reservations
  for each row execute function public.notify_reserver_of_owner_cancel();

-- Every active reserver is notified (push + email) when the item itself is
-- deleted, and their reservation is cancelled at the same time so "My
-- Reservations" doesn't leave it stuck showing "active" against a material
-- that no longer exists. Runs BEFORE delete: reservations.item_id becomes
-- null once the delete's ON DELETE SET NULL fires, so the reservations for
-- this item can only be found by item_id up until this point.
create or replace function public.notify_reservers_of_item_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select reservations.user_id, reservations.quantity, profiles.name as reserver_name
    from public.reservations
    join public.profiles on profiles.id = reservations.user_id
    where reservations.item_id = old.id and reservations.status = 'active'
  loop
    insert into public.notification_outbox (user_id, push_title, push_body, push_data, email_subject, email_body)
    values (
      r.user_id,
      'Material removed',
      format('"%s" was removed. Your reservation for %s has been cancelled.', old.name, r.quantity::text),
      jsonb_build_object('type', 'item_deleted'),
      format('Material removed — %s', old.name),
      format(
        e'Hi %s,\n\nThe material "%s" (you had reserved %s) has been removed from inventory by the person who added it, so your reservation for it is now cancelled.\n\n— Ghella Materials',
        coalesce(r.reserver_name, 'there'),
        old.name,
        r.quantity::text
      )
    );
  end loop;

  update public.reservations
  set status = 'cancelled', cancelled_at = now()
  where item_id = old.id and status = 'active';

  return old;
end;
$$;

drop trigger if exists items_notify_reservers_on_delete on public.items;
create trigger items_notify_reservers_on_delete
  before delete on public.items
  for each row execute function public.notify_reservers_of_item_delete();

-- URL and key come from Vault, same as 0008's job (see supabase/SETUP.md).
select cron.schedule(
  'flush-notification-outbox',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/send-notification-outbox',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

notify pgrst, 'reload schema';
