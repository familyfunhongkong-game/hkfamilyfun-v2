-- HK Family Fun V2
-- Durable in-app notification queue with RLS.

create table if not exists public.platform_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'merchant_registered',
    'event_submitted',
    'event_status_changed',
    'merchant_status_changed'
  )),
  recipient_scope text not null check (recipient_scope in ('admin','merchant')),
  actor_user_id uuid not null default auth.uid(),
  merchant_id uuid references public.merchants(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  title text not null,
  message text,
  status_snapshot text,
  email_to text,
  email_sent boolean not null default false,
  email_error text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists platform_notifications_created_at_idx
  on public.platform_notifications(created_at desc);

create index if not exists platform_notifications_admin_unread_idx
  on public.platform_notifications(recipient_scope, read_at, created_at desc);

alter table public.platform_notifications enable row level security;

drop policy if exists "Admins can manage notifications" on public.platform_notifications;
create policy "Admins can manage notifications"
on public.platform_notifications
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists "Merchants can enqueue own admin notifications" on public.platform_notifications;
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
        where m.id = merchant_id
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
        where e.id = event_id
          and e.merchant_id = merchant_id
          and e.status = 'submitted'
          and m.owner_user_id = auth.uid()
      )
    )
  )
);

drop policy if exists "Merchants can read own merchant notifications" on public.platform_notifications;
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
    where m.id = merchant_id
      and m.owner_user_id = auth.uid()
  )
);

grant select, insert, update on public.platform_notifications to authenticated;

notify pgrst, 'reload schema';
