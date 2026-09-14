-- pending_item_notifications previously allowed any authenticated user to
-- insert rows (checked only auth.role() = 'authenticated'), not just the
-- maximum-tier users who can actually create items. Since this table
-- drives a real push notification sent to every device, that gap would
-- let any regular staff account spam fake "new material" notifications to
-- everyone by calling the REST API directly, bypassing the app UI
-- entirely. Tightened to match the same privilege level the items table
-- itself requires for inserts.

drop policy if exists "pending_item_notifications: authenticated insert" on public.pending_item_notifications;

create policy "pending_item_notifications: max tier insert" on public.pending_item_notifications
  for insert
  with check (public.is_max_tier());
