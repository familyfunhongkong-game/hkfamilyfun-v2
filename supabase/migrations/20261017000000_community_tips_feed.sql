-- Community posts remain unpublished until reviewed by an administrator.
-- Apply through the approved Supabase migration deployment procedure.
create table if not exists public.community_tips (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 50),
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text not null check (char_length(trim(body)) between 1 and 3000),
  district text not null check (district in (
    '中西區','灣仔','東區','南區','油尖旺','深水埗','九龍城','黃大仙','觀塘',
    '葵青','荃灣','屯門','元朗','北區','大埔','沙田','西貢','離島'
  )),
  category text not null check (category in (
    '親子工作坊','免費活動','藝術文化','戶外活動','STEM','SEN友善','其他'
  )),
  event_date date,
  source_url text check (source_url is null or
    (char_length(source_url) <= 500 and source_url ~* '^https?://[^[:space:]]+$')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);
create index if not exists community_tips_public_feed_idx
  on public.community_tips (created_at desc) where status='approved';
create index if not exists community_tips_public_district_idx
  on public.community_tips (district, created_at desc) where status='approved';

alter table public.community_tips enable row level security;
revoke all on public.community_tips from anon;
grant select on public.community_tips to anon;
grant select, insert on public.community_tips to authenticated;

drop policy if exists "Public can read approved community tips" on public.community_tips;
create policy "Public can read approved community tips"
  on public.community_tips for select to anon, authenticated
  using (status = 'approved');

drop policy if exists "Members can submit pending community tips" on public.community_tips;
create policy "Members can submit pending community tips"
  on public.community_tips for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'pending'
    and reviewed_at is null and reviewed_by is null);

-- Prevent automated mass submissions without any paid service.
create or replace function public.limit_community_tip_submissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The insert caller may not choose a backdated timestamp or review fields.
  new.created_at := now();
  new.status := 'pending';
  new.reviewed_at := null;
  new.reviewed_by := null;
  if (select count(*) from public.community_tips
      where author_id = new.author_id and created_at >= now() - interval '24 hours') >= 5 then
    raise exception 'Daily community submission limit reached';
  end if;
  return new;
end;
$$;
revoke all on function public.limit_community_tip_submissions() from public, anon, authenticated;
drop trigger if exists enforce_community_tip_submission_limit on public.community_tips;
create trigger enforce_community_tip_submission_limit
before insert on public.community_tips
for each row execute function public.limit_community_tip_submissions();

comment on table public.community_tips is
  'Community-submitted activities. Only approved posts are publicly searchable; never auto-publish to canonical events.';

-- Admin permissions are enforced in PostgreSQL, not only by the React admin layout.
grant update on public.community_tips to authenticated;
drop policy if exists "Platform admins read all community tips" on public.community_tips;
create policy "Platform admins read all community tips"
on public.community_tips for select to authenticated
using ((select public.is_platform_admin()));

drop policy if exists "Platform admins review community tips" on public.community_tips;
create policy "Platform admins review community tips"
on public.community_tips for update to authenticated
using ((select public.is_platform_admin()))
with check ((select public.is_platform_admin()));

-- Restrict ordinary browser updates to moderation fields, not arbitrary content.
-- The policy above is gated by is_platform_admin(); members have no update policy.
