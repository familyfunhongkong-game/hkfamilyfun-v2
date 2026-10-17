-- Replies are moderated separately from the parent post.
create table if not exists public.community_tip_replies (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.community_tips(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null check(char_length(trim(display_name)) between 1 and 50),
 body text not null check(char_length(trim(body)) between 1 and 1000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id)
);
create index if not exists community_tip_replies_post_idx on public.community_tip_replies(post_id,created_at) where status='approved';
create index if not exists community_tip_replies_review_idx on public.community_tip_replies(created_at desc) where status='pending';
alter table public.community_tip_replies enable row level security;
revoke all on public.community_tip_replies from anon;
grant select on public.community_tip_replies to anon;
grant select,insert,update on public.community_tip_replies to authenticated;

drop policy if exists "Public approved replies" on public.community_tip_replies;
create policy "Public approved replies" on public.community_tip_replies for select to anon,authenticated
using (status='approved' and exists(select 1 from public.community_tips p where p.id=post_id and p.status='approved'));

drop policy if exists "Own replies" on public.community_tip_replies;
create policy "Own replies" on public.community_tip_replies for select to authenticated
using(author_id=(select auth.uid()));

drop policy if exists "Members submit replies" on public.community_tip_replies;
create policy "Members submit replies" on public.community_tip_replies for insert to authenticated
with check(author_id=(select auth.uid()) and status='pending' and reviewed_at is null and reviewed_by is null
and exists(select 1 from public.community_tips p where p.id=post_id and p.status='approved'));

drop policy if exists "Admin reads replies" on public.community_tip_replies;
create policy "Admin reads replies" on public.community_tip_replies for select to authenticated
using((select public.is_platform_admin()));

drop policy if exists "Admin moderates replies" on public.community_tip_replies;
create policy "Admin moderates replies" on public.community_tip_replies for update to authenticated
using((select public.is_platform_admin()))
with check((select public.is_platform_admin()));

create or replace function public.enforce_community_reply_limits() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 new.created_at:=now();new.status:='pending';new.reviewed_at:=null;new.reviewed_by:=null;
 perform pg_advisory_xact_lock(hashtextextended(new.author_id::text, 17));
 if(select count(*) from public.community_tip_replies where author_id=new.author_id
 and created_at>now()-interval '24 hours')>=15 then
 raise exception 'Daily reply limit reached';
 end if;
 return new;
end;
$$;
revoke all on function public.enforce_community_reply_limits() from public,anon,authenticated;
drop trigger if exists enforce_community_reply_limits on public.community_tip_replies;
create trigger enforce_community_reply_limits before insert on public.community_tip_replies
for each row execute function public.enforce_community_reply_limits();
