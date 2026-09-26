create index if not exists promo_banners_created_by_idx
  on public.promo_banners (created_by);

drop policy if exists "Public can view active promo banners" on public.promo_banners;
drop policy if exists "Platform admin can manage promo banners" on public.promo_banners;

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
