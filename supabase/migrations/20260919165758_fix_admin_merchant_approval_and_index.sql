create or replace function public.prevent_merchant_controlled_fields_change()
returns trigger
language plpgsql
set search_path to 'public', 'auth'
as $function$
begin
  -- Database owners, service-role requests and approved platform admins
  -- may change review-controlled merchant fields.
  if current_user in ('postgres', 'supabase_admin')
     or auth.role() = 'service_role'
     or public.is_platform_admin() then
    return new;
  end if;

  -- Normal merchant users may edit business details only.
  if auth.uid() is not null then
    if new.status is distinct from old.status then
      raise exception 'Merchant status can only be changed by the platform.';
    end if;

    if new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'Rejection reason can only be changed by the platform.';
    end if;
  end if;

  return new;
end;
$function$;

create index if not exists events_merchant_id_idx
  on public.events (merchant_id);
