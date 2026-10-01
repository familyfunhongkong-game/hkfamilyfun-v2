-- HK Family Fun V2
-- Extend optional event-detail content across Traditional Chinese, Simplified Chinese and English.

alter table public.events
  add column if not exists highlights_sc text,
  add column if not exists highlights_en text,
  add column if not exists terms_sc text,
  add column if not exists terms_en text,
  add column if not exists parent_note_tc text,
  add column if not exists parent_note_sc text,
  add column if not exists parent_note_en text,
  add column if not exists safety_note_tc text,
  add column if not exists safety_note_sc text,
  add column if not exists safety_note_en text,
  add column if not exists cancellation_policy_tc text,
  add column if not exists cancellation_policy_sc text,
  add column if not exists cancellation_policy_en text;

grant select (
  id,
  highlights_sc,
  highlights_en,
  terms_sc,
  terms_en,
  parent_note_tc,
  parent_note_sc,
  parent_note_en,
  safety_note_tc,
  safety_note_sc,
  safety_note_en,
  cancellation_policy_tc,
  cancellation_policy_sc,
  cancellation_policy_en
) on public.events to anon, authenticated;

create or replace view public.public_events_i18n
with (security_barrier = true, security_invoker = true)
as
select
  pe.*,
  e.title_sc,
  e.title_en,
  e.short_description_sc,
  e.short_description_en,
  e.description_sc,
  e.description_en,
  e.venue_name_sc,
  e.venue_name_en,
  e.address_sc,
  e.address_en,
  e.highlights_sc,
  e.highlights_en,
  e.terms_sc,
  e.terms_en,
  e.parent_note_tc,
  e.parent_note_sc,
  e.parent_note_en,
  e.safety_note_tc,
  e.safety_note_sc,
  e.safety_note_en,
  e.cancellation_policy_tc,
  e.cancellation_policy_sc,
  e.cancellation_policy_en
from public.public_events pe
join public.events e on e.id = pe.id;

grant select on public.public_events_i18n to anon, authenticated;

notify pgrst, 'reload schema';
