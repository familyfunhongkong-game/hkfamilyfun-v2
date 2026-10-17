-- STAGED ONLY: do not deploy until HKFF migration history drift issue #52
-- has been repaired and the migration replayed on a disposable database.
-- Null = legacy single-time recurrence; object keys "0"..."6" = day schedule.
-- Each key must map to {"start":"HH:MM","end":"HH:MM"} in HK local time.
-- Absent key = closed that weekday. No overnight spans in the first version.

create or replace function public.hkff_valid_weekly_opening_hours(value jsonb)
returns boolean language plpgsql immutable
set search_path = pg_catalog
as $$
declare
  day_key text;
  period jsonb;
  start_clock text;
  end_clock text;
begin
  if value is null then return true; end if;
  if jsonb_typeof(value) <> 'object' then return false; end if;
  for day_key, period in select key, val from jsonb_each(value) as p(key, val)
  loop
    if day_key !~ '^[0-6]$' or jsonb_typeof(period) <> 'object' then
      return false;
    end if;
    if (select count(*) from jsonb_object_keys(period)) <> 2
       or not (period ? 'start') or not (period ? 'end') then
      return false;
    end if;
    start_clock := period ->> 'start';
    end_clock := period ->> 'end';
    if start_clock !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or end_clock !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or start_clock >= end_clock then
      return false;
    end if;
  end loop;
  return true;
end
$$;

alter table public.events
  add column if not exists weekly_opening_hours jsonb;

alter table public.events
  drop constraint if exists events_weekly_opening_hours_valid;

alter table public.events
  add constraint events_weekly_opening_hours_valid
  check (public.hkff_valid_weekly_opening_hours(weekly_opening_hours));

comment on column public.events.weekly_opening_hours is
  'HK wall-clock weekly hours. NULL=legacy start_time/end_time; JSON object keys 0(Sun)-6(Sat). Missing keys=closed. Requires weekly recurrence, matching recurrence_weekdays, and Admin review before publication.';

-- Public SELECT already uses events RLS to restrict unpublished events.
-- Explicitly grant column read to enable the separate per-day lookup by ID,
-- without recreating public_events_i18n or exposing private event columns.
grant select (id, weekly_opening_hours) on table public.events to anon, authenticated;
grant update (weekly_opening_hours) on table public.events to authenticated;
notify pgrst, 'reload schema';
