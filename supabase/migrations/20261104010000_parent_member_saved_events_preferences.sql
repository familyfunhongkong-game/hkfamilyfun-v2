-- HK Family Fun member-owned bookmarks and simple preferences.
-- Only a user's own UUID identifiers are exposed, never unpublished event rows.
create table if not exists public.user_saved_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
create index if not exists user_saved_events_event_id_idx on public.user_saved_events(event_id);
alter table public.user_saved_events enable row level security;
revoke all on public.user_saved_events from anon;
grant select, insert, delete on public.user_saved_events to authenticated;
drop policy if exists "Members read own saved events" on public.user_saved_events;
create policy "Members read own saved events" on public.user_saved_events
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Members add own publicly visible events" on public.user_saved_events;
create policy "Members add own publicly visible events" on public.user_saved_events
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.public_events_i18n v where v.id = event_id)
);
drop policy if exists "Members remove own saved events" on public.user_saved_events;
create policy "Members remove own saved events" on public.user_saved_events
for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.user_event_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  favorite_district text not null default '',
  free_only boolean not null default false,
  preferred_category text not null default '',
  updated_at timestamptz not null default now(),
  constraint favorite_district_size check (length(favorite_district) <= 80),
  constraint preferred_category_size check (length(preferred_category) <= 80)
);
alter table public.user_event_preferences enable row level security;
revoke all on public.user_event_preferences from anon;
grant select, insert, update, delete on public.user_event_preferences to authenticated;
drop policy if exists "Members read own preferences" on public.user_event_preferences;
create policy "Members read own preferences" on public.user_event_preferences
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Members create own preferences" on public.user_event_preferences;
create policy "Members create own preferences" on public.user_event_preferences
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Members update own preferences" on public.user_event_preferences;
create policy "Members update own preferences" on public.user_event_preferences
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "Members delete own preferences" on public.user_event_preferences;
create policy "Members delete own preferences" on public.user_event_preferences
for delete to authenticated using ((select auth.uid()) = user_id);
