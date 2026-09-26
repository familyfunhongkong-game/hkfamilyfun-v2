create table if not exists public.promo_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text not null,
  link_url text,
  placement text not null default 'home_mid'
    check (placement in ('home_top','home_mid','events_top','event_detail')),
  status text not null default 'draft'
    check (status in ('draft','active','paused','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_banners_date_order check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create index if not exists promo_banners_public_idx
  on public.promo_banners (placement, status, sort_order, starts_at, ends_at);

alter table public.promo_banners enable row level security;

drop policy if exists "Public can view active promo banners" on public.promo_banners;
create policy "Public can view active promo banners"
on public.promo_banners
for select
to anon, authenticated
using (
  status = 'active'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

drop policy if exists "Platform admin can manage promo banners" on public.promo_banners;
create policy "Platform admin can manage promo banners"
on public.promo_banners
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'banner-images',
  'banner-images',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view banner images" on storage.objects;
create policy "Public can view banner images"
on storage.objects
for select
to public
using (bucket_id = 'banner-images');

drop policy if exists "Platform admin can upload banner images" on storage.objects;
create policy "Platform admin can upload banner images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'banner-images' and public.is_platform_admin());

drop policy if exists "Platform admin can update banner images" on storage.objects;
create policy "Platform admin can update banner images"
on storage.objects
for update
to authenticated
using (bucket_id = 'banner-images' and public.is_platform_admin())
with check (bucket_id = 'banner-images' and public.is_platform_admin());

drop policy if exists "Platform admin can delete banner images" on storage.objects;
create policy "Platform admin can delete banner images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'banner-images' and public.is_platform_admin());

grant select on public.promo_banners to anon, authenticated;
grant insert, update, delete on public.promo_banners to authenticated;
