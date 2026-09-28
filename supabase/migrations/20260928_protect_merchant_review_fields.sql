-- HK Family Fun V2
-- Protect merchant review-controlled fields from self-approval / ownership tampering.
-- Applied to Supabase project uiyrbqqvgnfhfdhedmav on 2026-09-28.

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

  if old.status = 'approved'
     and new.business_name is distinct from old.business_name then
    new.status := 'pending';
    new.rejection_reason := '商戶／機構名稱已變更，需要 HK Family Fun 重新審批。';
  end if;

  return new;
end;
$function$;

drop trigger if exists prevent_merchant_controlled_fields_change_trigger on public.merchants;
drop trigger if exists trg_guard_merchant_sensitive_update on public.merchants;
drop trigger if exists protect_merchant_review_fields_trigger on public.merchants;

drop function if exists public.prevent_merchant_controlled_fields_change();
drop function if exists public.guard_merchant_sensitive_update();

create trigger protect_merchant_review_fields_trigger
before update on public.merchants
for each row
execute function public.protect_merchant_review_fields();
