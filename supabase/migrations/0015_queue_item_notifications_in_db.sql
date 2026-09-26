-- New-material notifications were never sent.
--
-- The clients queued each new item for send-item-notifications with a
-- fire-and-forget `void supabase.from("pending_item_notifications").insert(...)`.
-- But a supabase-js query only sends its request when it's awaited (the
-- request is created inside the builder's then()), so that insert never
-- actually ran: the queue stayed empty and the flush job always found
-- "nothing pending".
--
-- The database now queues every new item itself, in an AFTER INSERT trigger
-- on items. It can't be skipped, doesn't depend on which app version created
-- the item, and runs in the same transaction as the insert. The clients no
-- longer insert into the queue.
--
-- created_by is recorded too, so the flush job can later skip notifying the
-- person who added the material.

alter table public.pending_item_notifications
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

create or replace function public.queue_new_item_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pending_item_notifications (item_name, created_by)
  values (new.name, new.created_by);
  return new;
end;
$$;

drop trigger if exists items_queue_notification on public.items;
create trigger items_queue_notification
  after insert on public.items
  for each row execute function public.queue_new_item_notification();
