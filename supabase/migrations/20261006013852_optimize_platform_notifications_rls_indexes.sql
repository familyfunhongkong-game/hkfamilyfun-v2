create index if not exists platform_notifications_event_id_idx
  on public.platform_notifications(event_id);

create index if not exists platform_notifications_merchant_id_idx
  on public.platform_notifications(merchant_id);

drop policy if exists "Merchants can enqueue own admin notifications"
on public.platform_notifications;

create policy "Merchants can enqueue own admin notifications"
on public.platform_notifications
for insert
to authenticated
with check (
  actor_user_id = (select auth.uid())
  and recipient_scope = 'admin'
  and private.can_enqueue_platform_notification(kind, merchant_id, event_id)
);

drop policy if exists "Merchants can read own merchant notifications"
on public.platform_notifications;

create policy "Merchants can read own merchant notifications"
on public.platform_notifications
for select
to authenticated
using (
  recipient_scope = 'merchant'
  and merchant_id is not null
  and exists (
    select 1
    from public.merchants m
    where m.id = platform_notifications.merchant_id
      and m.owner_user_id = (select auth.uid())
  )
);

drop policy if exists "Merchants can read own queued admin notifications"
on public.platform_notifications;

create policy "Merchants can read own queued admin notifications"
on public.platform_notifications
for select
to authenticated
using (
  recipient_scope = 'admin'
  and actor_user_id = (select auth.uid())
);
