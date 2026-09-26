alter table public.promo_banners
  drop constraint if exists promo_banners_title_nonempty,
  add constraint promo_banners_title_nonempty
    check (length(btrim(title)) > 0);

alter table public.promo_banners
  drop constraint if exists promo_banners_image_url_nonempty,
  add constraint promo_banners_image_url_nonempty
    check (length(btrim(image_url)) > 0);

alter table public.promo_banners
  drop constraint if exists promo_banners_link_url_http,
  add constraint promo_banners_link_url_http
    check (
      link_url is null
      or btrim(link_url) = ''
      or link_url ~* '^https?://'
    );

drop trigger if exists promo_banners_set_updated_at on public.promo_banners;
create trigger promo_banners_set_updated_at
before update on public.promo_banners
for each row
execute function public.set_updated_at();

drop policy if exists "Authenticated can view public banners or admin all" on public.promo_banners;
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
  or (select public.is_platform_admin())
);

drop policy if exists "Platform admin can insert promo banners" on public.promo_banners;
create policy "Platform admin can insert promo banners"
on public.promo_banners
for insert
to authenticated
with check ((select public.is_platform_admin()));

drop policy if exists "Platform admin can update promo banners" on public.promo_banners;
create policy "Platform admin can update promo banners"
on public.promo_banners
for update
to authenticated
using ((select public.is_platform_admin()))
with check ((select public.is_platform_admin()));

drop policy if exists "Platform admin can delete promo banners" on public.promo_banners;
create policy "Platform admin can delete promo banners"
on public.promo_banners
for delete
to authenticated
using ((select public.is_platform_admin()));
