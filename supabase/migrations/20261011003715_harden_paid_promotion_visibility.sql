alter table public.promo_banners
  add constraint promo_banners_active_commercial_guard
  check (
    status <> 'active'
    or is_paid
    or lower(btrim(coalesce(sponsor_name, ''))) = 'hk family fun'
  );

drop policy if exists "Anon can view active promo banners"
on public.promo_banners;

create policy "Anon can view active promo banners"
on public.promo_banners
for select
to anon
using (
  status = 'active'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
  and (
    is_paid
    or lower(btrim(coalesce(sponsor_name, ''))) = 'hk family fun'
  )
);

drop policy if exists "Authenticated can view public banners or admin all"
on public.promo_banners;

create policy "Authenticated can view public banners or admin all"
on public.promo_banners
for select
to authenticated
using (
  (
    status = 'active'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
    and (
      is_paid
      or lower(btrim(coalesce(sponsor_name, ''))) = 'hk family fun'
    )
  )
  or public.is_platform_admin()
);
