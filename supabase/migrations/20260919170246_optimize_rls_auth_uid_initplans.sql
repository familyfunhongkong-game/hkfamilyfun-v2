alter policy "Users can view own profile"
on public.profiles
using (id = (select auth.uid()));

alter policy "Users can update own profile"
on public.profiles
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

alter policy "Merchant owner can view own merchant profile"
on public.merchants
using (owner_user_id = (select auth.uid()));

alter policy "Merchant owner can update own merchant profile"
on public.merchants
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

alter policy "User can create own merchant profile"
on public.merchants
with check (
  owner_user_id = (select auth.uid())
  and status = 'pending'
);

alter policy "Merchant can view own events"
on public.events
using (
  exists (
    select 1
    from public.merchants m
    where m.id = events.merchant_id
      and m.owner_user_id = (select auth.uid())
  )
);

alter policy "Merchant can create own draft events"
on public.events
with check (
  status = 'draft'
  and exists (
    select 1
    from public.merchants m
    where m.id = events.merchant_id
      and m.owner_user_id = (select auth.uid())
      and m.status = 'approved'
  )
);

alter policy "Merchant can update own draft or rejected events"
on public.events
using (
  status = any (array['draft'::text, 'rejected'::text])
  and exists (
    select 1
    from public.merchants m
    where m.id = events.merchant_id
      and m.owner_user_id = (select auth.uid())
      and m.status = 'approved'
  )
)
with check (
  status = any (array['draft'::text, 'submitted'::text])
  and exists (
    select 1
    from public.merchants m
    where m.id = events.merchant_id
      and m.owner_user_id = (select auth.uid())
      and m.status = 'approved'
  )
);

alter policy "Merchant can delete own drafts"
on public.events
using (
  status = 'draft'
  and exists (
    select 1
    from public.merchants m
    where m.id = events.merchant_id
      and m.owner_user_id = (select auth.uid())
      and m.status = 'approved'
  )
);

alter policy "Merchant can view own event images"
on public.event_images
using (
  exists (
    select 1
    from public.events e
    join public.merchants m on m.id = e.merchant_id
    where e.id = event_images.event_id
      and m.owner_user_id = (select auth.uid())
  )
);

alter policy "Merchant can add own event images"
on public.event_images
with check (
  exists (
    select 1
    from public.events e
    join public.merchants m on m.id = e.merchant_id
    where e.id = event_images.event_id
      and m.owner_user_id = (select auth.uid())
      and m.status = 'approved'
      and e.status = any (array['draft'::text, 'rejected'::text])
  )
);

alter policy "Merchant can update own event images"
on public.event_images
using (
  exists (
    select 1
    from public.events e
    join public.merchants m on m.id = e.merchant_id
    where e.id = event_images.event_id
      and m.owner_user_id = (select auth.uid())
      and m.status = 'approved'
      and e.status = any (array['draft'::text, 'rejected'::text])
  )
)
with check (
  exists (
    select 1
    from public.events e
    join public.merchants m on m.id = e.merchant_id
    where e.id = event_images.event_id
      and m.owner_user_id = (select auth.uid())
      and m.status = 'approved'
      and e.status = any (array['draft'::text, 'rejected'::text])
  )
);

alter policy "Merchant can delete own event images"
on public.event_images
using (
  exists (
    select 1
    from public.events e
    join public.merchants m on m.id = e.merchant_id
    where e.id = event_images.event_id
      and m.owner_user_id = (select auth.uid())
      and m.status = 'approved'
      and e.status = any (array['draft'::text, 'rejected'::text])
  )
);
