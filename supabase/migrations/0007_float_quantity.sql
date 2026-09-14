-- Some materials are genuinely counted in fractions (half a roll, 2.5
-- pallets, a metered length), not whole units — quantity moves from
-- integer to numeric everywhere it's stored or compared so those values
-- can be entered and reserved exactly, without floating-point rounding
-- error (numeric is exact decimal, unlike float/double).
--
-- Also re-adds the unit/is_approximate columns with `if not exists` —
-- 0006_flexible_quantity.sql added them, but if that migration was never
-- run against this database, every item insert has been failing with a
-- "column not found" error ever since the app started sending those
-- fields. Safe to re-run either way.

alter table public.items
  add column if not exists unit text,
  add column if not exists is_approximate boolean not null default false;

-- The view has to be dropped before either column type change below —
-- Postgres won't let you alter a column's type while a view still depends
-- on it — and recreated after (the old view also cast to ::int, which we
-- no longer want).
drop view if exists public.item_availability;

alter table public.items
  alter column quantity type numeric using quantity::numeric;

alter table public.reservations
  alter column quantity type numeric using quantity::numeric;

create view public.item_availability as
select
  i.id as item_id,
  i.quantity as total_quantity,
  coalesce(sum(r.quantity) filter (where r.status = 'active'), 0) as reserved_quantity,
  i.quantity - coalesce(sum(r.quantity) filter (where r.status = 'active'), 0) as available_quantity
from public.items i
left join public.reservations r on r.item_id = i.id
group by i.id, i.quantity;

-- Dropping and recreating a view resets any settings applied to the old
-- one — without re-applying this, the view silently reverts to running as
-- its owner (bypassing RLS on items/reservations for anyone who queries
-- it via the API) instead of as the caller.
alter view public.item_availability set (security_invoker = on);

-- Postgres identifies functions by name + argument types, so changing
-- p_quantity's type is a different signature, not a like-for-like
-- replace — the old integer-typed version has to be dropped explicitly or
-- it stays around as a separate overload.
drop function if exists public.reserve_item(uuid, integer, text);

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
