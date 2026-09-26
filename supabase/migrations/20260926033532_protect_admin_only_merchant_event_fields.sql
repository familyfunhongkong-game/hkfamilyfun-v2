create or replace function public.protect_merchant_admin_fields()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if not public.is_platform_admin() then
    if new.status is distinct from old.status
       or new.rejection_reason is distinct from old.rejection_reason
       or new.created_at is distinct from old.created_at then
      raise exception 'Merchant approval fields can only be changed by a platform admin.';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists protect_merchant_admin_fields_trigger on public.merchants;
create trigger protect_merchant_admin_fields_trigger
before update on public.merchants
for each row
execute function public.protect_merchant_admin_fields();

create or replace function public.protect_event_admin_fields()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if public.is_platform_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.reviewed_at is not null
       or new.reviewed_by is not null
       or new.approved_at is not null
       or new.published_at is not null
       or new.rejected_at is not null
       or new.rejection_reason is not null
       or new.admin_review_note is not null
       or coalesce(new.is_featured, false) = true then
      raise exception 'Admin review fields cannot be set by a merchant.';
    end if;
  else
    if new.reviewed_at is distinct from old.reviewed_at
       or new.reviewed_by is distinct from old.reviewed_by
       or new.approved_at is distinct from old.approved_at
       or new.published_at is distinct from old.published_at
       or new.rejected_at is distinct from old.rejected_at
       or new.rejection_reason is distinct from old.rejection_reason
       or new.admin_review_note is distinct from old.admin_review_note
       or new.is_featured is distinct from old.is_featured then
      raise exception 'Admin review fields cannot be changed by a merchant.';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists protect_event_admin_fields_trigger on public.events;
create trigger protect_event_admin_fields_trigger
before insert or update on public.events
for each row
execute function public.protect_event_admin_fields();
