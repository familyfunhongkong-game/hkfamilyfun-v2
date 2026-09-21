alter policy "Public can view published events"
on public.events
using (
  status = 'published'
  and start_date is not null
  and coalesce(end_date, start_date) >= current_date
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
      and coalesce(e.end_date, e.start_date) >= current_date
  )
);
