-- HOTFIX: merchant rows have no merchant_id field; use JSONB to safely handle both table types.
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
    v_mid := case when v_entity = 'merchant' then v_id else nullif(v_old->>'merchant_id','')::uuid end;
    v_old_status := old.status;
    v_new_status := null;
    v_action := 'deleted';
  else
    v_new := to_jsonb(new);
    v_old := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
    v_id := new.id;
    v_mid := case when v_entity = 'merchant' then v_id else nullif(v_new->>'merchant_id','')::uuid end;
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
