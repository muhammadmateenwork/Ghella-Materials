-- Reservations of decimal quantities (or against items whose available
-- quantity isn't a whole number) have been failing with a generic error.
-- Two likely causes, both from 0007_float_quantity.sql's signature change
-- on reserve_item (integer -> numeric):
--
-- 1. If the old integer-typed overload didn't actually get dropped (or was
--    somehow recreated since), Postgres now has two candidate functions
--    named reserve_item. A whole-number call can resolve against either,
--    but a genuine decimal can't be coerced to the integer overload, so it
--    fails outright while whole numbers keep working — matching exactly
--    what's been reported.
-- 2. Even if the drop did take, changing a function's signature via raw
--    SQL (rather than Supabase's migration UI) doesn't automatically
--    tell PostgREST to refresh its cached schema — it can keep resolving
--    calls against the old, cached (integer) signature until reloaded.
--
-- This re-asserts a single, correct, numeric-typed reserve_item and
-- explicitly tells PostgREST to reload its schema cache, so both
-- possibilities are covered regardless of which one actually happened.

drop function if exists public.reserve_item(uuid, integer, text);
drop function if exists public.reserve_item(uuid, numeric, text);

create function public.reserve_item(
  p_item_id uuid,
  p_quantity numeric,
  p_contact_info text default null
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

  insert into public.reservations (item_id, user_id, quantity, contact_info)
  values (p_item_id, auth.uid(), p_quantity, p_contact_info)
  returning * into v_reservation;

  return v_reservation;
end;
$$;

-- Force PostgREST to pick up the schema change immediately rather than
-- waiting for its next periodic reload.
notify pgrst, 'reload schema';
