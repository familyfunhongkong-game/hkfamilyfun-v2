-- HK Family Fun V2
-- Safe merchant event duplication.
-- Applied to Supabase project uiyrbqqvgnfhfdhedmav on 2026-09-28.

create or replace function public.duplicate_merchant_event(source_event_id uuid)
returns uuid
language plpgsql
security invoker
set search_path to 'public', 'auth'
as $function$
declare
  source_row public.events%rowtype;
  new_event_id uuid := gen_random_uuid();
  payload jsonb;
begin
  select e.*
  into source_row
  from public.events e
  where e.id = source_event_id;

  if not found then
    raise exception 'Event not found or not accessible.';
  end if;

  if source_row.merchant_id is null then
    raise exception 'Only merchant-owned events can be duplicated.';
  end if;

  if not exists (
    select 1
    from public.merchants m
    where m.id = source_row.merchant_id
      and m.owner_user_id = auth.uid()
      and m.status = 'approved'
  ) then
    raise exception 'Only an approved merchant owner can duplicate this event.';
  end if;

  payload :=
    to_jsonb(source_row)
    - array[
        'id','status','created_at','updated_at','submitted_at','approved_at',
        'published_at','rejected_at','rejection_reason','reviewed_at','reviewed_by',
        'admin_review_note','ai_extraction_status','ai_extracted_json',
        'merchant_confirmed_at','source_fingerprint','auto_imported_at','auto_import_note'
      ]
    || jsonb_build_object(
      'id', new_event_id,
      'status', 'draft',
      'title_tc', coalesce(source_row.title_tc, source_row.title, '未命名活動') || ' 副本',
      'title', case
        when source_row.title is null or trim(source_row.title) = '' then null
        else source_row.title || ' 副本'
      end,
      'cover_image_url', null,
      'gallery_image_urls', '[]'::jsonb,
      'created_at', now(),
      'updated_at', now(),
      'submitted_at', null,
      'approved_at', null,
      'published_at', null,
      'rejected_at', null,
      'rejection_reason', null,
      'reviewed_at', null,
      'reviewed_by', null,
      'admin_review_note', null,
      'ai_extraction_status', null,
      'ai_extracted_json', null,
      'merchant_confirmed_at', null,
      'source_fingerprint', null,
      'auto_imported_at', null,
      'auto_import_note', null,
      'is_featured', false,
      'platform_takes_booking', false,
      'platform_takes_payment', false,
      'hidden_pending_confirmation', false
    );

  insert into public.events
  select (jsonb_populate_record(null::public.events, payload)).*;

  return new_event_id;
end;
$function$;

revoke all on function public.duplicate_merchant_event(uuid) from public;
grant execute on function public.duplicate_merchant_event(uuid) to authenticated;
