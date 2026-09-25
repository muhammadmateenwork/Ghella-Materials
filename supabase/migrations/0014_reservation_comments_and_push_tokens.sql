-- Two changes from client feedback / review:
--
-- 1. Reservation comments. When reserving, the reserver can now leave an
--    optional free-text message for the material's owner — pick-up
--    arrangements, needing it dropped off, who it's being assigned to, etc.
--    Stored alongside the existing contact_info, shown to the owner on the
--    item's reservation list, and included in the owner's "New reservation"
--    push notification.
--
-- 2. Push token ownership. push_tokens is unique per device token and its
--    RLS policy ("manage own") only lets a user touch rows they already own.
--    So when a second person signed in on the same phone, the client's
--    upsert tried to re-point the first person's row and RLS rejected it —
--    the new user silently never got notifications, while the device kept
--    receiving the PREVIOUS user's personal ones. register_push_token()
--    re-assigns the device to whoever is signed in now; the app also
--    deletes its own row on sign-out (already allowed by "manage own").

-- ===========================================================================
-- 1. Reservation comments
-- ===========================================================================

alter table public.reservations
  add column if not exists comments text;

drop function if exists public.reserve_item(uuid, numeric, text);
drop function if exists public.reserve_item(uuid, numeric, text, text);

create function public.reserve_item(
  p_item_id uuid,
  p_quantity numeric,
  p_contact_info text default null,
  p_comments text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_reserved numeric;
  v_reservation public.reservations;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  -- lock the item row so concurrent reservations can't oversell it
  select quantity into v_total
  from public.items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Item not found';
  end if;

  select coalesce(sum(quantity), 0) into v_reserved
  from public.reservations
  where item_id = p_item_id and status = 'active';

  if v_total - v_reserved < p_quantity then
    raise exception 'Only % of this item are available', v_total - v_reserved;
  end if;

  insert into public.reservations (item_id, user_id, quantity, contact_info, comments)
  values (p_item_id, auth.uid(), p_quantity, p_contact_info, nullif(trim(p_comments), ''))
  returning * into v_reservation;

  return v_reservation;
end;
$$;

-- Same as 0012's version, plus the reserver's comment (if any) appended to
-- the push body so the owner sees it without opening the app. Trimmed to
-- keep the notification readable — the full text is on the item's
-- reservation list.
create or replace function public.notify_owner_of_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items;
  v_reserver_name text;
  v_body text;
begin
  select * into v_item from public.items where id = new.item_id;
  if v_item.id is null or v_item.created_by is null then
    return new;
  end if;

  select name into v_reserver_name from public.profiles where id = new.user_id;

  v_body := format('%s reserved %s of "%s".', coalesce(v_reserver_name, 'Someone'), new.quantity::text, v_item.name);
  if new.comments is not null then
    v_body := v_body || ' Comment: ' ||
      case when length(new.comments) > 120 then left(new.comments, 117) || '...' else new.comments end;
  end if;

  insert into public.notification_outbox (user_id, push_title, push_body, push_data)
  values (
    v_item.created_by,
    'New reservation',
    v_body,
    jsonb_build_object('type', 'reservation_received', 'item_id', v_item.id)
  );

  return new;
end;
$$;

-- ===========================================================================
-- 2. Push token ownership
-- ===========================================================================

create or replace function public.register_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_token is null or length(trim(p_token)) = 0 then
    raise exception 'Push token is required';
  end if;

  insert into public.push_tokens (user_id, token)
  values (auth.uid(), p_token)
  on conflict (token) do update set user_id = excluded.user_id;
end;
$$;

revoke execute on function public.register_push_token(text) from public, anon;
grant execute on function public.register_push_token(text) to authenticated;

-- Force PostgREST to pick up the new/changed function signatures now.
notify pgrst, 'reload schema';
