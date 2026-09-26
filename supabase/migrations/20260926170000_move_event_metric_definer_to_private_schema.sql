create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.track_event_metric_internal(
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

revoke all on function private.track_event_metric_internal(uuid,text) from public;
grant execute on function private.track_event_metric_internal(uuid,text)
  to anon, authenticated, service_role;

create or replace function public.track_event_metric(
  p_event_id uuid,
  p_metric text
)
returns void
language sql
security invoker
set search_path = ''
as $function$
  select private.track_event_metric_internal(p_event_id, p_metric);
$function$;

revoke all on function public.track_event_metric(uuid,text) from public;
grant execute on function public.track_event_metric(uuid,text)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';
