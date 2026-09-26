begin;

create table if not exists public.promo_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  subtitle text,
  image_url text not null check (length(btrim(image_url)) > 0),
  link_url text check (link_url is null or btrim(link_url) = '' or link_url ~* '^https?://'),
  placement text not null default 'home_mid'
    check (placement in ('home_top','home_mid','events_top','event_detail')),
  status text not null default 'draft'
    check (status in ('draft','active','paused','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.promo_banners enable row level security;

create index if not exists promo_banners_public_lookup_idx
  on public.promo_banners (placement, status, starts_at, ends_at, sort_order);

drop policy if exists "Anon can view active promo banners" on public.promo_banners;
drop policy if exists "Authenticated can view public banners or admin all" on public.promo_banners;
drop policy if exists "Platform admin can insert promo banners" on public.promo_banners;
drop policy if exists "Platform admin can update promo banners" on public.promo_banners;
drop policy if exists "Platform admin can delete promo banners" on public.promo_banners;

create policy "Anon can view active promo banners"
on public.promo_banners
for select
to anon
using (
  status = 'active'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

create policy "Authenticated can view public banners or admin all"
on public.promo_banners
for select
to authenticated
using (
  (
    status = 'active'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  )
  or public.is_platform_admin()
);

create policy "Platform admin can insert promo banners"
on public.promo_banners
for insert
to authenticated
with check (public.is_platform_admin());

create policy "Platform admin can update promo banners"
on public.promo_banners
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Platform admin can delete promo banners"
on public.promo_banners
for delete
to authenticated
using (public.is_platform_admin());

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'promo-banners',
  'promo-banners',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/gif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read promo banners" on storage.objects;
drop policy if exists "Platform admin can upload promo banners" on storage.objects;
drop policy if exists "Platform admin can update promo banners" on storage.objects;
drop policy if exists "Platform admin can delete promo banners" on storage.objects;

create policy "Public can read promo banners"
on storage.objects
for select
to public
using (bucket_id = 'promo-banners');

create policy "Platform admin can upload promo banners"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'promo-banners'
  and public.is_platform_admin()
);

create policy "Platform admin can update promo banners"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'promo-banners'
  and public.is_platform_admin()
)
with check (
  bucket_id = 'promo-banners'
  and public.is_platform_admin()
);

create policy "Platform admin can delete promo banners"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'promo-banners'
  and public.is_platform_admin()
);

commit;
