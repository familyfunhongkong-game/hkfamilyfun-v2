create table public.merchant_advertising_orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  submitted_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  promo_banner_id uuid null references public.promo_banners(id) on delete set null,

  promotion_type text not null check (
    promotion_type in ('home_banner','events_featured','sponsored_content','other')
  ),
  campaign_name text not null check (char_length(btrim(campaign_name)) between 1 and 120),
  official_url text null,
  preferred_start date null,
  duration_key text null,
  budget_range text null,
  notes text null,

  contact_name text null,
  contact_email text null,
  contact_phone text null,

  status text not null default 'enquiry' check (
    status in (
      'enquiry','quoted','payment_pending','paid',
      'scheduled','live','completed','cancelled','rejected'
    )
  ),
  quoted_amount numeric(12,2) null check (quoted_amount is null or quoted_amount >= 0),
  currency text not null default 'HKD' check (currency = 'HKD'),
  payment_status text not null default 'not_requested' check (
    payment_status in ('not_requested','pending','paid','refunded','failed')
  ),
  paid_at timestamptz null,
  starts_at timestamptz null,
  ends_at timestamptz null,
  admin_notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint merchant_advertising_orders_schedule_check
    check (ends_at is null or starts_at is null or ends_at >= starts_at),
  constraint merchant_advertising_orders_paid_state_check
    check (
      payment_status <> 'paid'
      or (paid_at is not null and status in ('paid','scheduled','live','completed'))
    )
);

comment on table public.merchant_advertising_orders is
  'Durable HK Family Fun merchant advertising enquiry, quote, payment-confirmation and campaign lifecycle.';

create index merchant_advertising_orders_merchant_created_idx
  on public.merchant_advertising_orders (merchant_id, created_at desc);

create index merchant_advertising_orders_status_created_idx
  on public.merchant_advertising_orders (status, created_at desc);

create index merchant_advertising_orders_payment_status_idx
  on public.merchant_advertising_orders (payment_status, created_at desc);

create index merchant_advertising_orders_promo_banner_idx
  on public.merchant_advertising_orders (promo_banner_id)
  where promo_banner_id is not null;

alter table public.merchant_advertising_orders enable row level security;

revoke all on public.merchant_advertising_orders from anon;
revoke all on public.merchant_advertising_orders from authenticated;
grant select, insert, update, delete on public.merchant_advertising_orders to authenticated;
grant all on public.merchant_advertising_orders to service_role;

create policy "Merchant owners can view own advertising orders"
on public.merchant_advertising_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.merchants m
    where m.id = merchant_advertising_orders.merchant_id
      and m.owner_user_id = (select auth.uid())
  )
);

create policy "Approved merchants can create advertising enquiries"
on public.merchant_advertising_orders
for insert
to authenticated
with check (
  submitted_by = (select auth.uid())
  and status = 'enquiry'
  and payment_status = 'not_requested'
  and quoted_amount is null
  and paid_at is null
  and promo_banner_id is null
  and admin_notes is null
  and exists (
    select 1
    from public.merchants m
    where m.id = merchant_advertising_orders.merchant_id
      and m.owner_user_id = (select auth.uid())
      and m.status = 'approved'
  )
);

create policy "Platform admin can manage advertising orders"
on public.merchant_advertising_orders
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create trigger merchant_advertising_orders_set_updated_at
before update on public.merchant_advertising_orders
for each row
execute function public.set_updated_at();
