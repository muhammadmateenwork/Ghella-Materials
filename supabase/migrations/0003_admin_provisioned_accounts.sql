-- Accounts are now provisioned by maximum-tier admins (via the
-- admin-create-user edge function), not self-signup. This migration
-- closes a gap in the original policy set: a maximum-tier user could
-- previously update their OWN role through the "max tier manages all"
-- policy, since it had no restriction on the target row. The client
-- requires that a user can never change their own permission level —
-- only another admin can.

drop policy if exists "profiles: max tier manages all" on public.profiles;

create policy "profiles: max tier manages other profiles" on public.profiles
  for update
  using (public.is_max_tier() and id <> auth.uid())
  with check (public.is_max_tier() and id <> auth.uid());

-- "profiles: user updates own name" (id = auth.uid(), with check that role
-- is unchanged) already covers self-updates and still blocks self role
-- changes for everyone, including admins.
