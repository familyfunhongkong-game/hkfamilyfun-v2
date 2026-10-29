-- S01 staged security migration. REVIEW AND TEST ON A CLONE BEFORE PRODUCTION.
-- Phase 1: establish private storage and admin-only RPC. This phase DOES NOT
-- remove legacy columns or revoke table-wide grants; those require app cutover.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.event_admin_reviews (
  event_id uuid primary key references public.events(id) on delete cascade,
  admin_review_note text,
  ai_extracted_json jsonb,
  reviewed_by uuid,
  updated_at timestamptz not null default now()
);
revoke all on private.event_admin_reviews from public, anon, authenticated;
insert into private.event_admin_reviews(event_id,admin_review_note,ai_extracted_json,reviewed_by)
select id,admin_review_note,ai_extracted_json,reviewed_by
from public.events
where admin_review_note is not null or ai_extracted_json is not null or reviewed_by is not null
on conflict(event_id) do nothing;
create or replace function public.admin_get_event_review(p_event_id uuid)
returns table(admin_review_note text, ai_extracted_json jsonb, reviewed_by uuid)
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return query select r.admin_review_note,r.ai_extracted_json,r.reviewed_by
  from private.event_admin_reviews r where r.event_id = p_event_id;
end;
$$;
revoke all on function public.admin_get_event_review(uuid) from public,anon;
grant execute on function public.admin_get_event_review(uuid) to authenticated;
create or replace function public.admin_set_event_review(
  p_event_id uuid,p_note text,p_ai jsonb,p_reviewed_by uuid
) returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_reviewed_by is distinct from auth.uid() then
    raise exception 'Reviewer identity mismatch' using errcode = '42501';
  end if;
  insert into private.event_admin_reviews(event_id,admin_review_note,ai_extracted_json,reviewed_by,updated_at)
  values(p_event_id,p_note,p_ai,p_reviewed_by,now())
  on conflict(event_id) do update set
    admin_review_note=excluded.admin_review_note,
    ai_extracted_json=excluded.ai_extracted_json,
    reviewed_by=excluded.reviewed_by,
    updated_at=now();
end;
$$;
revoke all on function public.admin_set_event_review(uuid,text,jsonb,uuid) from public,anon;
grant execute on function public.admin_set_event_review(uuid,text,jsonb,uuid) to authenticated;
commit;
-- PHASE 2 REQUIRED BEFORE CLAIMING FIXED:
-- 1. Refactor every admin UI/API path to use admin_get/set RPC.
-- 2. Remove sensitive fields from merchant SELECT * and all direct writes.
-- 3. Verify admin, merchant, anon, service-role negative/positive tests.
-- 4. Transactionally revoke table-level SELECT/INSERT/UPDATE from authenticated,
--    then grant only explicit safe column lists, and remove old sensitive columns.
--    Do not revoke table grants without completing app migration.
