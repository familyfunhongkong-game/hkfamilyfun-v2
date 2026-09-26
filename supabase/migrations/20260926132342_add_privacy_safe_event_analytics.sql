create table if not exists public.event_metrics_daily (
  event_id uuid not null references public.events(id) on delete cascade,
  metric_date date not null default (timezone('Asia/Hong_Kong', now()))::date,
  views bigint not null default 0 check (views >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  shares bigint not null default 0 check (shares >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, metric_date)
);

alter table public.event_metrics_daily enable row level security;

drop policy if exists "Merchant can view own event analytics" on public.event_metrics_daily;
create policy "Merchant can view own event analytics"
on public.event_metrics_daily
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    join public.merchants m on m.id = e.merchant_id
    where e.id = event_metrics_daily.event_id
      and m.owner_user_id = (select auth.uid())
  )
);

drop policy if exists "Platform admin can view all event analytics" on public.event_metrics_daily;
create policy "Platform admin can view all event analytics"
on public.event_metrics_daily
for select
to authenticated
using ((select public.is_platform_admin()));

grant select on public.event_metrics_daily to authenticated;
revoke insert, update, delete on public.event_metrics_daily from anon, authenticated;

create or replace function public.track_event_metric(
  p_event_id uuid,
  p_metric text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_metric text := lower(btrim(coalesce(p_metric, '')));
  v_today date := (timezone('Asia/Hong_Kong', now()))::date;
begin
  if v_metric not in ('view', 'click', 'share') then
    raise exception 'Unsupported event metric';
  end if;

  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.status = 'published'
      and e.start_date is not null
      and coalesce(e.end_date, e.start_date) >= v_today
      and coalesce(e.hidden_pending_confirmation, false) = false
  ) then
    return;
  end if;

  insert into public.event_metrics_daily (
    event_id,
    metric_date,
    views,
    clicks,
    shares,
    created_at,
    updated_at
  )
  values (
    p_event_id,
    v_today,
    case when v_metric = 'view' then 1 else 0 end,
    case when v_metric = 'click' then 1 else 0 end,
    case when v_metric = 'share' then 1 else 0 end,
    now(),
    now()
  )
  on conflict (event_id, metric_date)
  do update set
    views = public.event_metrics_daily.views +
      case when v_metric = 'view' then 1 else 0 end,
    clicks = public.event_metrics_daily.clicks +
      case when v_metric = 'click' then 1 else 0 end,
    shares = public.event_metrics_daily.shares +
      case when v_metric = 'share' then 1 else 0 end,
    updated_at = now();
end;
$function$;

revoke all on function public.track_event_metric(uuid,text) from public;
grant execute on function public.track_event_metric(uuid,text) to anon, authenticated;
