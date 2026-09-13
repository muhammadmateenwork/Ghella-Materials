-- Lets an admin delete a material that has ever been reserved (active or
-- cancelled reservations both count) without the delete failing outright.
-- reservations.item_id had no ON DELETE behavior, so deleting any item
-- that had ever been reserved — most materials in normal use — was
-- blocked by this FK. Historical reservation rows now survive the item's
-- deletion with item_id set to null, the same treatment already given to
-- reservations.user_id when a user account is deleted (see
-- 0004_deletable_users.sql).

alter table public.reservations alter column item_id drop not null;

alter table public.reservations
  drop constraint reservations_item_id_fkey,
  add constraint reservations_item_id_fkey
    foreign key (item_id) references public.items (id) on delete set null;
