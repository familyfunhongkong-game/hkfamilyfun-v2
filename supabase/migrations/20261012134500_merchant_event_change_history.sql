-- Durable merchant/event change history, including changes before approval.
-- Never store account passwords or full private records in the audit feed.
create table if not exists public.merchant_change_history (
 id uuid primary key default gen_random_uuid(),
 entity_type text not null check (entity_type in ('merchant','event')),
 entity_id uuid not null,
 merchant_id uuid,
 actor_user_id uuid,
 action text not null check (action in ('created','updated','submitted','status_changed','deleted')),
 old_status text,
 new_status text,
 changed_fields text[] not null default '{}',
 summary text not null,
 created_at timestamptz not null default now()
);
create index if not exists merchant_change_history_recent_idx on public.merchant_change_history(created_at desc);
create index if not exists merchant_change_history_merchant_idx on public.merchant_change_history(merchant_id, created_at desc);
create index if not exists merchant_change_history_entity_idx on public.merchant_change_history(entity_type, entity_id, created_at desc);
alter table public.merchant_change_history enable row level security;
drop policy if exists "Platform admins read merchant change history" on public.merchant_change_history;
create policy "Platform admins read merchant change history"
on public.merchant_change_history for select to authenticated
using (public.is_platform_admin());
revoke all on public.merchant_change_history from anon, authenticated;
grant select on public.merchant_change_history to authenticated;

alter table public.platform_notifications drop constraint if exists platform_notifications_kind_check;
alter table public.platform_notifications add constraint platform_notifications_kind_check
check (kind in ('merchant_registered','merchant_updated','event_created','event_updated','event_submitted','event_status_changed','merchant_status_changed'));

create or replace function public.record_merchant_event_changes()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_entity text := case when tg_table_name = 'merchants' then 'merchant' else 'event' end;
  v_mid uuid;
  v_id uuid;
  v_actor uuid := auth.uid();
  v_old jsonb;
  v_new jsonb;
  v_changed text[];
  v_action text;
  v_old_status text;
  v_new_status text;
  v_label text;
  v_kind text;
  v_fields text;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_new := '{}'::jsonb;
    v_id := old.id;
    v_mid := case when v_entity = 'merchant' then old.id else old.merchant_id end;
    v_old_status := old.status;
    v_new_status := null;
    v_action := 'deleted';
  else
    v_new := to_jsonb(new);
    v_old := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
    v_id := new.id;
    v_mid := case when v_entity = 'merchant' then new.id else new.merchant_id end;
    v_old_status := case when tg_op = 'UPDATE' then v_old->>'status' else null end;
    v_new_status := new.status;
    v_action := case when tg_op = 'INSERT' then 'created'
      when v_old_status is distinct from v_new_status and v_new_status = 'submitted' then 'submitted'
      when v_old_status is distinct from v_new_status then 'status_changed'
      else 'updated' end;
  end if;
  select coalesce(array_agg(k order by k), '{}'::text[]) into v_changed
  from (
    select coalesce(a.key,b.key) as k
    from jsonb_each(v_old) a
    full join jsonb_each(v_new) b on b.key = a.key
    where a.value is distinct from b.value
  ) diff
  where k not in ('updated_at','created_at','reviewed_at','published_at','password','password_hash','access_token','refresh_token');
  if tg_op = 'UPDATE' and cardinality(v_changed) = 0 then return new; end if;
  v_label := left(coalesce(v_new->>'title_tc',v_old->>'title_tc',v_new->>'business_name',v_old->>'business_name','未命名'),180);
  v_fields := array_to_string(v_changed, ', ');
  insert into public.merchant_change_history
    (entity_type,entity_id,merchant_id,actor_user_id,action,old_status,new_status,changed_fields,summary)
  values
    (v_entity,v_id,v_mid,v_actor,v_action,v_old_status,v_new_status,v_changed,
      left(v_label || '｜' || v_action || '｜' || v_fields,900));
  -- Existing registration and submission mail/queue logic stays intact.
  -- Record extra edits in the Admin notification center without duplicate submission notices.
  if v_entity = 'merchant' and v_action = 'updated' then
    v_kind := 'merchant_updated';
  elsif v_entity = 'event' and v_action = 'updated' then
    v_kind := 'event_updated';
  elsif v_entity = 'event' and v_action = 'created' then
    v_kind := 'event_created';
  else
    v_kind := null;
  end if;
  if v_kind is not null and v_actor is not null
     and not public.is_platform_admin() then
    insert into public.platform_notifications
     (kind,recipient_scope,actor_user_id,merchant_id,event_id,title,message,status_snapshot,dedupe_key)
    values
     (v_kind,'admin',v_actor,v_mid,
      case when v_entity = 'event' then v_id else null end,
      case when v_entity = 'merchant' then '商戶資料已更新：' else '活動資料有變更：' end || v_label,
      '變更欄位：' || v_fields,
      v_new_status,
      'audit-' || v_entity || '-' || v_id::text || '-' || txid_current()::text)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
drop trigger if exists merchant_change_history_trigger on public.merchants;
create trigger merchant_change_history_trigger after insert or update or delete on public.merchants
for each row execute function public.record_merchant_event_changes();
drop trigger if exists event_change_history_trigger on public.events;
create trigger event_change_history_trigger after insert or update or delete on public.events
for each row execute function public.record_merchant_event_changes();
notify pgrst, 'reload schema';
