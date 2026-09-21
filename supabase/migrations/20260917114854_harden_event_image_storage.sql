begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'event-images',
  'event-images',
  true,
  8388608,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Remove legacy / overly broad storage policies.
drop policy if exists "Authenticated users can delete event images" on storage.objects;
drop policy if exists "Authenticated users can update event images" on storage.objects;
drop policy if exists "Authenticated users can upload event images" on storage.objects;
drop policy if exists "Merchant can delete own event image files" on storage.objects;
drop policy if exists "Merchant can update own event image files" on storage.objects;
drop policy if exists "Merchant can upload own event image files" on storage.objects;
drop policy if exists "Merchant can view own event image files" on storage.objects;
drop policy if exists "Public can read event images" on storage.objects;
drop policy if exists "Platform admin can manage event image files" on storage.objects;

create policy "Public can read event images"
on storage.objects
for select
to public
using (bucket_id = 'event-images');

create policy "Merchant can upload own event image files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-images'
  and exists (
    select 1
    from public.events e
    join public.merchants m on m.id = e.merchant_id
    where e.id::text = (storage.foldername(name))[1]
      and m.owner_user_id = auth.uid()
      and m.status = 'approved'
      and e.status in ('draft', 'rejected')
  )
);

create policy "Merchant can update own event image files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'event-images'
  and exists (
    select 1
    from public.events e
    join public.merchants m on m.id = e.merchant_id
    where e.id::text = (storage.foldername(name))[1]
      and m.owner_user_id = auth.uid()
      and m.status = 'approved'
      and e.status in ('draft', 'rejected')
  )
)
with check (
  bucket_id = 'event-images'
  and exists (
    select 1
    from public.events e
    join public.merchants m on m.id = e.merchant_id
    where e.id::text = (storage.foldername(name))[1]
      and m.owner_user_id = auth.uid()
      and m.status = 'approved'
      and e.status in ('draft', 'rejected')
  )
);

create policy "Merchant can delete own event image files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-images'
  and exists (
    select 1
    from public.events e
    join public.merchants m on m.id = e.merchant_id
    where e.id::text = (storage.foldername(name))[1]
      and m.owner_user_id = auth.uid()
      and m.status = 'approved'
      and e.status in ('draft', 'rejected')
  )
);

create policy "Platform admin can manage event image files"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'event-images'
  and public.is_platform_admin()
)
with check (
  bucket_id = 'event-images'
  and public.is_platform_admin()
);

-- Rebuild metadata-table policies to match event ownership/status.
drop policy if exists "Merchant can add own event images" on public.event_images;
drop policy if exists "Merchant can delete own event images" on public.event_images;
drop policy if exists "Merchant can update own event images" on public.event_images;
drop policy if exists "Merchant can view own event images" on public.event_images;
drop policy if exists "Public can view published event images" on public.event_images;
drop policy if exists "Platform admin can manage event images" on public.event_images;

create policy "Public can view published event images"
on public.event_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_images.event_id
      and e.status = 'published'
  )
);

create policy "Merchant can view own event images"
on public.event_images
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    join public.merchants m on m.id = e.merchant_id
    where e.id = event_images.event_id
      and m.owner_user_id = auth.uid()
  )
);

create policy "Merchant can add own event images"
on public.event_images
for insert
to authenticated
with check (
  exists (
    select 1
    from public.events e
    join public.merchants m on m.id = e.merchant_id
    where e.id = event_images.event_id
      and m.owner_user_id = auth.uid()
      and m.status = 'approved'
      and e.status in ('draft', 'rejected')
  )
);

create policy "Merchant can update own event images"
on public.event_images
for update
to authenticated
using (
  exists (
    select 1
    from public.events e
    join public.merchants m on m.id = e.merchant_id
    where e.id = event_images.event_id
      and m.owner_user_id = auth.uid()
      and m.status = 'approved'
      and e.status in ('draft', 'rejected')
  )
)
with check (
  exists (
    select 1
    from public.events e
    join public.merchants m on m.id = e.merchant_id
    where e.id = event_images.event_id
      and m.owner_user_id = auth.uid()
      and m.status = 'approved'
      and e.status in ('draft', 'rejected')
  )
);

create policy "Merchant can delete own event images"
on public.event_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.events e
    join public.merchants m on m.id = e.merchant_id
    where e.id = event_images.event_id
      and m.owner_user_id = auth.uid()
      and m.status = 'approved'
      and e.status in ('draft', 'rejected')
  )
);

create policy "Platform admin can manage event images"
on public.event_images
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

commit;
