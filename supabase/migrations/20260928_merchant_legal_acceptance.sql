-- HK Family Fun V2
-- Merchant legal acceptance audit trail.
-- Applied to Supabase project uiyrbqqvgnfhfdhedmav on 2026-09-28.

alter table public.merchants
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists privacy_version text;

drop policy if exists "User can create own merchant profile" on public.merchants;

create policy "User can create own merchant profile"
on public.merchants
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
  and status = 'pending'
  and terms_accepted_at is not null
  and privacy_accepted_at is not null
);

create or replace function public.protect_merchant_review_fields()
returns trigger
language plpgsql
set search_path to 'public', 'auth'
as $function$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role')
     or coalesce(auth.role(), '') = 'service_role'
     or public.is_platform_admin() then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Merchant ID cannot be changed by merchant user.';
  end if;

  if new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'Merchant owner cannot be changed by merchant user.';
  end if;

  if new.status is distinct from old.status then
    raise exception 'Merchant status can only be changed by platform admin.';
  end if;

  if new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'Merchant review fields can only be changed by platform admin.';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'Merchant creation timestamp cannot be changed.';
  end if;

  if new.terms_accepted_at is distinct from old.terms_accepted_at
     or new.terms_version is distinct from old.terms_version
     or new.privacy_accepted_at is distinct from old.privacy_accepted_at
     or new.privacy_version is distinct from old.privacy_version then
    raise exception 'Merchant legal acceptance records cannot be changed by merchant user.';
  end if;

  return new;
end;
$function$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;

  if coalesce(new.raw_user_meta_data ->> 'account_type', '') = 'merchant' then
    if nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '') is null
       or nullif(new.raw_user_meta_data ->> 'terms_version', '') is null
       or nullif(new.raw_user_meta_data ->> 'privacy_accepted_at', '') is null
       or nullif(new.raw_user_meta_data ->> 'privacy_version', '') is null then
      raise exception 'Merchant registration requires Terms and Privacy acceptance.';
    end if;

    insert into public.merchants (
      owner_user_id,
      business_name,
      contact_name,
      contact_email,
      contact_phone,
      website_url,
      status,
      terms_accepted_at,
      terms_version,
      privacy_accepted_at,
      privacy_version
    )
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'business_name', ''), '未命名商戶'),
      nullif(new.raw_user_meta_data ->> 'contact_name', ''),
      new.email,
      nullif(new.raw_user_meta_data ->> 'contact_phone', ''),
      nullif(new.raw_user_meta_data ->> 'website_url', ''),
      'pending',
      (new.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz,
      new.raw_user_meta_data ->> 'terms_version',
      (new.raw_user_meta_data ->> 'privacy_accepted_at')::timestamptz,
      new.raw_user_meta_data ->> 'privacy_version'
    )
    on conflict (owner_user_id) do nothing;
  end if;

  return new;
end;
$function$;
