-- HK Family Fun V2
-- Move the notification authorization SECURITY DEFINER function out of the exposed public schema.

create schema if not exists private;

create or replace function private.can_enqueue_platform_notification(
  p_kind text,
  p_merchant_id uuid,
  p_event_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return false;
  end if;

  if p_kind = 'merchant_registered' then
    return exists (
      select 1
      from public.merchants m
      where m.id = p_merchant_id
        and m.owner_user_id = v_uid
        and m.status = 'pending'
    );
  end if;

  if p_kind = 'event_submitted' then
    return exists (
      select 1
      from public.events e
      join public.merchants m on m.id = e.merchant_id
      where e.id = p_event_id
        and e.merchant_id = p_merchant_id
        and e.status = 'submitted'
        and m.owner_user_id = v_uid
    );
  end if;

  return false;
end;
$$;

grant usage on schema private to authenticated;
revoke all on function private.can_enqueue_platform_notification(text,uuid,uuid) from public;
grant execute on function private.can_enqueue_platform_notification(text,uuid,uuid) to authenticated;

drop policy if exists "Merchants can enqueue own admin notifications"
on public.platform_notifications;

create policy "Merchants can enqueue own admin notifications"
on public.platform_notifications
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and recipient_scope = 'admin'
  and private.can_enqueue_platform_notification(kind, merchant_id, event_id)
);

drop function if exists public.can_enqueue_platform_notification(text,uuid,uuid);
