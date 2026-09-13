-- Storage bucket for item photos.
-- Files are stored under `<item_id>/<uuid>.<ext>` so policies can key off
-- the first path segment without needing to query the items table.

insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

create policy "item-photos: authenticated read"
  on storage.objects for select
  using (bucket_id = 'item-photos' and auth.role() = 'authenticated');

create policy "item-photos: max tier upload"
  on storage.objects for insert
  with check (bucket_id = 'item-photos' and public.is_max_tier());

create policy "item-photos: max tier update"
  on storage.objects for update
  using (bucket_id = 'item-photos' and public.is_max_tier());

create policy "item-photos: max tier delete"
  on storage.objects for delete
  using (bucket_id = 'item-photos' and public.is_max_tier());
