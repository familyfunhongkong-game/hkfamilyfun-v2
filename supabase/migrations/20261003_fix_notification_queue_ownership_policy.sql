-- HK Family Fun V2
-- Fix notification queue ownership check for submitted events.

drop policy if exists "Merchants can enqueue own admin notifications"
on public.platform_notifications;

create policy "Merchants can enqueue own admin notifications"
on public.platform_notifications
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and recipient_scope = 'admin'
  and (
    (
      kind = 'merchant_registered'
      and merchant_id is not null
      and event_id is null
      and exists (
        select 1
        from public.merchants m
        where m.id = platform_notifications.merchant_id
          and m.owner_user_id = auth.uid()
          and m.status = 'pending'
      )
    )
    or
    (
      kind = 'event_submitted'
      and event_id is not null
      and merchant_id is not null
      and exists (
        select 1
        from public.events e
        join public.merchants m on m.id = e.merchant_id
        where e.id = platform_notifications.event_id
          and e.merchant_id = platform_notifications.merchant_id
          and e.status = 'submitted'
          and m.owner_user_id = auth.uid()
      )
    )
  )
);
