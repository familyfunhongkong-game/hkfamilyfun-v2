create table if not exists public.promotion_events (
  id uuid primary key default gen_random_uuid(),
  banner_id uuid not null references public.promo_banners(id) on delete cascade,
  event_type text not null check (event_type in ('impression','click')),
  placement text not null,
  page_path text,
  occurred_at timestamptz not null default now()
);

alter table public.promotion_events enable row level security;

create index if not exists promotion_events_banner_time_idx
  on public.promotion_events(banner_id, occurred_at desc);

create index if not exists promotion_events_type_time_idx
  on public.promotion_events(event_type, occurred_at desc);

drop policy if exists "Admins can read promotion analytics"
on public.promotion_events;

create policy "Admins can read promotion analytics"
on public.promotion_events
for select
to authenticated
using (public.is_platform_admin());

revoke insert, update, delete on public.promotion_events from anon, authenticated;
grant select on public.promotion_events to authenticated;
