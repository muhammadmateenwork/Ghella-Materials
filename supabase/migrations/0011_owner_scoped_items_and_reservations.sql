-- Two access-model tightenings:
--
-- 1. Items: any maximum-tier user could edit or delete ANY item. Now
--    restricted to the item's own creator — access level (maximum/
--    minimum) controls what KIND of things an account can do, not
--    ownership of another account's own additions. Items added before
--    this migration have no recorded creator (created_by is null), so
--    they stay editable by any maximum-tier user rather than becoming
--    permanently locked to nobody. Item photos follow the same rule
--    since they're edited as part of the same item.
--
-- 2. Reservations: any maximum-tier user could cancel any OTHER user's
--    reservation. Now only the reservation's own owner can cancel it,
--    regardless of access level — the admin-only Reservation Log still
--    shows every reservation to every maximum-tier user (read-only,
--    unchanged), but acting on a reservation (cancelling it) is scoped
--    to the account that made it.

-- Future item inserts automatically record who created them.
alter table public.items alter column created_by set default auth.uid();

drop policy if exists "items: max tier update" on public.items;
create policy "items: max tier update own" on public.items
  for update
  using (public.is_max_tier() and (created_by = auth.uid() or created_by is null));

drop policy if exists "items: max tier delete" on public.items;
create policy "items: max tier delete own" on public.items
  for delete
  using (public.is_max_tier() and (created_by = auth.uid() or created_by is null));

drop policy if exists "item_photos: max tier insert" on public.item_photos;
create policy "item_photos: max tier insert own item" on public.item_photos
  for insert
  with check (
    public.is_max_tier()
    and exists (
      select 1 from public.items
      where items.id = item_photos.item_id
        and (items.created_by = auth.uid() or items.created_by is null)
    )
  );

drop policy if exists "item_photos: max tier delete" on public.item_photos;
create policy "item_photos: max tier delete own item" on public.item_photos
  for delete
  using (
    public.is_max_tier()
    and exists (
      select 1 from public.items
      where items.id = item_photos.item_id
        and (items.created_by = auth.uid() or items.created_by is null)
    )
  );

-- Same function signature as before (just the uuid arg), so a plain
-- create-or-replace is enough — no need to drop first.
create or replace function public.cancel_reservation(p_reservation_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations;
begin
  select * into v_reservation from public.reservations where id = p_reservation_id;

  if not found then
    raise exception 'Reservation not found';
  end if;

  if v_reservation.user_id <> auth.uid() then
    raise exception 'Not authorized to cancel this reservation';
  end if;

  update public.reservations
  set status = 'cancelled', cancelled_at = now()
  where id = p_reservation_id
  returning * into v_reservation;

  return v_reservation;
end;
$$;

-- This policy let any maximum-tier user update (i.e. cancel) any other
-- user's reservation directly via the REST API, bypassing the ownership
-- check now enforced in cancel_reservation above — dropping it closes
-- that direct-table-access loophole. "reservations: update own" (already
-- in place) still covers legitimate self-service updates.
drop policy if exists "reservations: max tier manages all" on public.reservations;

notify pgrst, 'reload schema';
