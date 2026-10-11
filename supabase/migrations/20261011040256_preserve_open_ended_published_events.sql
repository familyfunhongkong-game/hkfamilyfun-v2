-- HK Family Fun V2
-- Keep published events with an unknown end date visible. Only an explicit
-- end_date before the Hong Kong current date makes an event expired.

alter policy "Public can view published events"
on public.events
using (
  status = 'published'
  and start_date is not null
  and (
    end_date is null
    or end_date >= (timezone('Asia/Hong_Kong', now()))::date
  )
);

alter policy "Public can view published event images"
on public.event_images
using (
  exists (
    select 1
    from public.events e
    where e.id = event_images.event_id
      and e.status = 'published'
      and e.start_date is not null
      and (
        e.end_date is null
        or e.end_date >= (timezone('Asia/Hong_Kong', now()))::date
      )
  )
);

do $$
declare
  cols text;
begin
  select string_agg(format('e.%I', a.attname), ', ' order by a.attnum)
    into cols
  from pg_attribute a
  where a.attrelid = 'public.public_events'::regclass
    and a.attnum > 0
    and not a.attisdropped;

  execute format(
    'create or replace view public.public_events
     with (security_barrier = true, security_invoker = true)
     as select %s
        from public.events e
       where e.status = ''published''
         and e.start_date is not null
         and (e.end_date is null or e.end_date >= (timezone(''Asia/Hong_Kong'', now()))::date)
         and coalesce(e.hidden_pending_confirmation, false) = false',
    cols
  );
end
$$;

grant select on public.public_events to anon, authenticated;
notify pgrst, 'reload schema';
