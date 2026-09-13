-- Ghella warehouse materials app — initial schema
-- Entities: profiles (users/roles), locations, items, item_photos, reservations

create extension if not exists "pgcrypto";

-- =========================================================================
-- PROFILES (extends auth.users with app-level role)
-- =========================================================================

create type public.user_role as enum ('minimum', 'maximum');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  role public.user_role not null default 'minimum',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    'minimum'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- helper: is the current user a maximum-tier user?
-- security definer so it can read profiles without recursing through
-- profiles' own RLS policies.
create function public.is_max_tier()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'maximum'
  );
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- =========================================================================
-- LOCATIONS (yards + sub-locations, e.g. Ormiston Yard > Container 4)
-- =========================================================================

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_location_id uuid references public.locations (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

create index locations_parent_idx on public.locations (parent_location_id);

-- =========================================================================
-- ITEMS
-- =========================================================================

create table public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  identification_number text,
  quantity integer not null check (quantity >= 0),
  condition text,
  location_id uuid not null references public.locations (id),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create index items_location_idx on public.items (location_id);

create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- =========================================================================
-- ITEM PHOTOS (multiple per item, stored in Supabase Storage)
-- =========================================================================

create table public.item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

create index item_photos_item_idx on public.item_photos (item_id);

-- =========================================================================
-- RESERVATIONS (audit trail: who reserved what, how much, when)
-- =========================================================================

create type public.reservation_status as enum ('active', 'cancelled');

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id),
  user_id uuid not null references public.profiles (id),
  quantity integer not null check (quantity > 0),
  contact_info text,
  status public.reservation_status not null default 'active',
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create index reservations_item_idx on public.reservations (item_id);
create index reservations_user_idx on public.reservations (user_id);

-- =========================================================================
-- AVAILABILITY VIEW (quantity - active reservations)
-- =========================================================================

create view public.item_availability as
select
  i.id as item_id,
  i.quantity as total_quantity,
  coalesce(sum(r.quantity) filter (where r.status = 'active'), 0)::int as reserved_quantity,
  i.quantity - coalesce(sum(r.quantity) filter (where r.status = 'active'), 0)::int as available_quantity
from public.items i
left join public.reservations r on r.item_id = i.id
group by i.id, i.quantity;

-- =========================================================================
-- RESERVE ITEM (atomic, race-safe reservation RPC)
-- =========================================================================

create function public.reserve_item(
  p_item_id uuid,
  p_quantity integer,
  p_contact_info text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_reserved integer;
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

create function public.cancel_reservation(p_reservation_id uuid)
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

  if v_reservation.user_id <> auth.uid() and not public.is_max_tier() then
    raise exception 'Not authorized to cancel this reservation';
  end if;

  update public.reservations
  set status = 'cancelled', cancelled_at = now()
  where id = p_reservation_id
  returning * into v_reservation;

  return v_reservation;
end;
$$;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.items enable row level security;
alter table public.item_photos enable row level security;
alter table public.reservations enable row level security;

-- profiles: everyone can read their own row; maximum-tier can read/update all
create policy "profiles: read own row" on public.profiles
  for select using (id = auth.uid());

create policy "profiles: max tier reads all" on public.profiles
  for select using (public.is_max_tier());

create policy "profiles: user updates own name" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles: max tier manages all" on public.profiles
  for update using (public.is_max_tier())
  with check (public.is_max_tier());

-- locations: all authenticated users can read; only maximum-tier can write
create policy "locations: authenticated read" on public.locations
  for select using (auth.role() = 'authenticated');

create policy "locations: max tier insert" on public.locations
  for insert with check (public.is_max_tier());

create policy "locations: max tier update" on public.locations
  for update using (public.is_max_tier());

create policy "locations: max tier delete" on public.locations
  for delete using (public.is_max_tier());

-- items: all authenticated users can read; only maximum-tier can write
create policy "items: authenticated read" on public.items
  for select using (auth.role() = 'authenticated');

create policy "items: max tier insert" on public.items
  for insert with check (public.is_max_tier());

create policy "items: max tier update" on public.items
  for update using (public.is_max_tier());

create policy "items: max tier delete" on public.items
  for delete using (public.is_max_tier());

-- item_photos: all authenticated users can read; only maximum-tier can write
create policy "item_photos: authenticated read" on public.item_photos
  for select using (auth.role() = 'authenticated');

create policy "item_photos: max tier insert" on public.item_photos
  for insert with check (public.is_max_tier());

create policy "item_photos: max tier delete" on public.item_photos
  for delete using (public.is_max_tier());

-- reservations: users see their own; maximum-tier sees all.
-- inserts/cancellations go through the reserve_item / cancel_reservation
-- RPCs (security definer), these policies are defense-in-depth for any
-- direct table access.
create policy "reservations: read own" on public.reservations
  for select using (user_id = auth.uid());

create policy "reservations: max tier reads all" on public.reservations
  for select using (public.is_max_tier());

create policy "reservations: insert own" on public.reservations
  for insert with check (user_id = auth.uid());

create policy "reservations: update own" on public.reservations
  for update using (user_id = auth.uid());

create policy "reservations: max tier manages all" on public.reservations
  for update using (public.is_max_tier());

-- item_availability view inherits RLS from underlying tables via the
-- security_invoker setting so it respects the policies above.
alter view public.item_availability set (security_invoker = on);
