-- HK Family Fun V2
-- Core public event localization fields for Traditional Chinese, Simplified Chinese and English.
-- Applied to Supabase project uiyrbqqvgnfhfdhedmav.

alter table public.events
  add column if not exists title_sc text,
  add column if not exists title_en text,
  add column if not exists short_description_sc text,
  add column if not exists short_description_en text,
  add column if not exists description_sc text,
  add column if not exists description_en text,
  add column if not exists venue_name_sc text,
  add column if not exists venue_name_en text,
  add column if not exists address_sc text,
  add column if not exists address_en text;

grant select (
  id,
  title_sc,
  title_en,
  short_description_sc,
  short_description_en,
  description_sc,
  description_en,
  venue_name_sc,
  venue_name_en,
  address_sc,
  address_en
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
  e.address_en
from public.public_events pe
join public.events e on e.id = pe.id;

grant select on public.public_events_i18n to anon, authenticated;

notify pgrst, 'reload schema';
