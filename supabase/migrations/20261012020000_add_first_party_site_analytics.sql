create table if not exists public.site_analytics_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  session_id uuid not null,
  event_type text not null check (event_type in ('page_view','event_view','cta_click')),
  page_path text not null check (char_length(page_path) between 1 and 300),
  event_id uuid null references public.events(id) on delete set null,
  referrer_hostname text null check (referrer_hostname is null or char_length(referrer_hostname) <= 180),
  device_type text not null default 'unknown'
    check (device_type in ('mobile','tablet','desktop','unknown')),
  occurred_at timestamptz not null default now()
);

alter table public.site_analytics_events enable row level security;

revoke all on table public.site_analytics_events from anon, authenticated;
grant select, insert on table public.site_analytics_events to service_role;

create index if not exists site_analytics_events_occurred_at_idx
  on public.site_analytics_events (occurred_at desc);
create index if not exists site_analytics_events_type_occurred_idx
  on public.site_analytics_events (event_type, occurred_at desc);
create index if not exists site_analytics_events_event_occurred_idx
  on public.site_analytics_events (event_id, occurred_at desc)
  where event_id is not null;
create index if not exists site_analytics_events_visitor_occurred_idx
  on public.site_analytics_events (visitor_id, occurred_at desc);
create index if not exists site_analytics_events_session_occurred_idx
  on public.site_analytics_events (session_id, occurred_at desc);

create or replace function public.admin_site_analytics_summary(p_start timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if public.is_platform_admin() is not true then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'totals', jsonb_build_object(
      'visitors', count(distinct a.visitor_id),
      'sessions', count(distinct a.session_id),
      'pageViews', count(*) filter (where a.event_type = 'page_view'),
      'eventViews', count(*) filter (where a.event_type = 'event_view'),
      'ctaClicks', count(*) filter (where a.event_type = 'cta_click')
    ),
    'trend', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', t.day::text,
        'visitors', t.visitors,
        'sessions', t.sessions,
        'pageViews', t.page_views,
        'eventViews', t.event_views,
        'ctaClicks', t.cta_clicks
      ) order by t.day), '[]'::jsonb)
      from (
        select
          (x.occurred_at at time zone 'Asia/Hong_Kong')::date as day,
          count(distinct x.visitor_id) as visitors,
          count(distinct x.session_id) as sessions,
          count(*) filter (where x.event_type = 'page_view') as page_views,
          count(*) filter (where x.event_type = 'event_view') as event_views,
          count(*) filter (where x.event_type = 'cta_click') as cta_clicks
        from public.site_analytics_events x
        where x.occurred_at >= p_start
        group by 1
      ) t
    ),
    'topPages', (
      select coalesce(jsonb_agg(jsonb_build_object('path', t.page_path, 'views', t.views)
        order by t.views desc), '[]'::jsonb)
      from (
        select x.page_path, count(*) as views
        from public.site_analytics_events x
        where x.occurred_at >= p_start and x.event_type = 'page_view'
        group by x.page_path order by views desc limit 12
      ) t
    ),
    'topEvents', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id, 'title', t.title, 'category', t.category,
        'district', t.district, 'views', t.views, 'clicks', t.clicks
      ) order by t.views desc, t.clicks desc), '[]'::jsonb)
      from (
        select e.id,
          coalesce(nullif(e.title_tc,''), nullif(e.title,''), '未命名活動') as title,
          coalesce(nullif(e.activity_category,''), nullif(e.category,''), '未分類') as category,
          coalesce(nullif(e.district,''), '未分類') as district,
          count(*) filter (where x.event_type = 'event_view') as views,
          count(*) filter (where x.event_type = 'cta_click') as clicks
        from public.site_analytics_events x
        join public.events e on e.id = x.event_id
        where x.occurred_at >= p_start and x.event_id is not null
          and x.event_type in ('event_view','cta_click')
        group by e.id, e.title_tc, e.title, e.activity_category, e.category, e.district
        order by views desc, clicks desc limit 12
      ) t
    ),
    'categories', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'label', t.label, 'views', t.views, 'clicks', t.clicks
      ) order by t.views desc), '[]'::jsonb)
      from (
        select coalesce(nullif(e.activity_category,''), nullif(e.category,''), '未分類') as label,
          count(*) filter (where x.event_type = 'event_view') as views,
          count(*) filter (where x.event_type = 'cta_click') as clicks
        from public.site_analytics_events x
        join public.events e on e.id = x.event_id
        where x.occurred_at >= p_start and x.event_id is not null
          and x.event_type in ('event_view','cta_click')
        group by 1 order by views desc limit 12
      ) t
    ),
    'districts', (
      select coalesce(jsonb_agg(jsonb_build_object('label', t.label, 'views', t.views)
        order by t.views desc), '[]'::jsonb)
      from (
        select coalesce(nullif(e.district,''), '未分類') as label,
          count(*) filter (where x.event_type = 'event_view') as views
        from public.site_analytics_events x
        join public.events e on e.id = x.event_id
        where x.occurred_at >= p_start and x.event_id is not null
          and x.event_type = 'event_view'
        group by 1 order by views desc limit 12
      ) t
    ),
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object('label', t.device_type, 'views', t.views)
        order by t.views desc), '[]'::jsonb)
      from (
        select x.device_type, count(*) as views
        from public.site_analytics_events x
        where x.occurred_at >= p_start and x.event_type = 'page_view'
        group by x.device_type order by views desc
      ) t
    ),
    'referrers', (
      select coalesce(jsonb_agg(jsonb_build_object('label', t.label, 'views', t.views)
        order by t.views desc), '[]'::jsonb)
      from (
        select coalesce(nullif(x.referrer_hostname,''), 'Direct') as label, count(*) as views
        from public.site_analytics_events x
        where x.occurred_at >= p_start and x.event_type = 'page_view'
        group by 1 order by views desc limit 12
      ) t
    )
  )
  into result
  from public.site_analytics_events a
  where a.occurred_at >= p_start;

  return coalesce(result, '{}'::jsonb);
end;
$$;

revoke all on function public.admin_site_analytics_summary(timestamptz) from public, anon;
grant execute on function public.admin_site_analytics_summary(timestamptz) to authenticated;
