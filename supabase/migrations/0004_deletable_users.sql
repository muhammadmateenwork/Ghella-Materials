-- Lets an admin permanently delete a user account (via the admin-delete-user
-- edge function, auth.admin.deleteUser). Without this migration, deleting a
-- user would either fail outright (reservations.user_id is NOT NULL with no
-- ON DELETE behavior) or silently cascade-delete their reservation history
-- (items/locations/item_photos.created_by), which breaks the "every
-- reservation logged" audit trail the app promises.
--
-- Fix: historical rows survive the user's deletion with their
-- user/created_by reference set to null, instead of being deleted or
-- blocking the delete.

alter table public.reservations alter column user_id drop not null;

alter table public.reservations
  drop constraint reservations_user_id_fkey,
  add constraint reservations_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete set null;

alter table public.items
  drop constraint items_created_by_fkey,
  add constraint items_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.locations
  drop constraint locations_created_by_fkey,
  add constraint locations_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.item_photos
  drop constraint item_photos_created_by_fkey,
  add constraint item_photos_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

-- Defense-in-depth delete policy, mirroring the update policy: max-tier
-- users manage other profiles' rows, never their own. The actual delete
-- path goes through the service-role edge function (which enforces the
-- same "not yourself" rule server-side), but RLS should agree regardless
-- of how the row is reached.
create policy "profiles: max tier deletes other profiles" on public.profiles
  for delete
  using (public.is_max_tier() and id <> auth.uid());
