-- Private community photos, member likes and approved-only public counts.
-- Never expose unreviewed family photos through a public Storage bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-tip-images','community-tip-images',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public=false,
    file_size_limit=5242880,
    allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];

create table if not exists public.community_tip_photos (
  post_id uuid not null references public.community_tips(id) on delete cascade,
  image_position integer not null check(image_position between 0 and 3),
  author_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique check(char_length(storage_path) between 20 and 250),
  created_at timestamptz not null default now(),
  primary key (post_id,image_position)
);
alter table public.community_tip_photos enable row level security;
revoke all on public.community_tip_photos from public,anon,authenticated;
grant select,insert,delete on public.community_tip_photos to authenticated;
create index if not exists community_tip_photos_author_idx on public.community_tip_photos(author_id,post_id);

drop policy if exists "Community photo owner and admin may read" on public.community_tip_photos;
create policy "Community photo owner and admin may read"
on public.community_tip_photos for select to authenticated
using (author_id=(select auth.uid()) or (select public.is_platform_admin()));

drop policy if exists "Member may attach up to 4 photos to own pending post" on public.community_tip_photos;
create policy "Member may attach up to 4 photos to own pending post"
on public.community_tip_photos for insert to authenticated
with check (
 author_id=(select auth.uid())
 and split_part(storage_path,'/',1)=author_id::text
 and split_part(storage_path,'/',2)=post_id::text
 and exists(select 1 from public.community_tips p
   where p.id=post_id and p.author_id=(select auth.uid()) and p.status='pending')
);
drop policy if exists "Owner may remove pending photo" on public.community_tip_photos;
create policy "Owner may remove pending photo" on public.community_tip_photos for delete to authenticated
using (author_id=(select auth.uid()) and exists(select 1 from public.community_tips p
  where p.id=post_id and p.status='pending'));

drop policy if exists "Members upload own pending community photo" on storage.objects;
create policy "Members upload own pending community photo"
on storage.objects for insert to authenticated
with check (bucket_id='community-tip-images'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists(select 1 from public.community_tips p where p.id::text=(storage.foldername(name))[2]
     and p.author_id=(select auth.uid()) and p.status='pending'));

drop policy if exists "Community photos owner or admin can view" on storage.objects;
create policy "Community photos owner or admin can view"
on storage.objects for select to authenticated
using (bucket_id='community-tip-images'
 and ((storage.foldername(name))[1]=(select auth.uid())::text
      or (select public.is_platform_admin())));

drop policy if exists "Community photos owner may remove pending upload" on storage.objects;
create policy "Community photos owner may remove pending upload"
on storage.objects for delete to authenticated
using (bucket_id='community-tip-images'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.community_tips p where p.id::text=(storage.foldername(name))[2]
     and p.author_id=(select auth.uid()) and p.status='pending'));

create table if not exists public.community_tip_likes (
  post_id uuid not null references public.community_tips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);
create index if not exists community_tip_likes_user_idx on public.community_tip_likes(user_id);
alter table public.community_tip_likes enable row level security;
revoke all on public.community_tip_likes from public,anon,authenticated;
grant select,insert,delete on public.community_tip_likes to authenticated;

drop policy if exists "Member reads own likes" on public.community_tip_likes;
create policy "Member reads own likes" on public.community_tip_likes for select to authenticated
using (user_id=(select auth.uid()));

drop policy if exists "Member likes approved posts only" on public.community_tip_likes;
create policy "Member likes approved posts only"
on public.community_tip_likes for insert to authenticated
with check (user_id=(select auth.uid()) and exists(select 1 from public.community_tips p
 where p.id=post_id and p.status='approved'));

drop policy if exists "Member removes own like" on public.community_tip_likes;
create policy "Member removes own like" on public.community_tip_likes for delete to authenticated
using (user_id=(select auth.uid()));

-- Public-safe aggregate. The view cannot expose liker identities or unpublished posts.
create or replace view public.community_tip_like_totals
with (security_barrier=true) as
select p.id as post_id,count(l.user_id)::bigint as like_count
from public.community_tips p
left join public.community_tip_likes l on l.post_id=p.id
where p.status='approved'
group by p.id;
revoke all on public.community_tip_like_totals from public,anon,authenticated;
grant select on public.community_tip_like_totals to anon,authenticated;

-- Notifications use the existing Admin inbox, never auto-approve community content.
alter table public.platform_notifications drop constraint if exists platform_notifications_kind_check;
alter table public.platform_notifications
add constraint platform_notifications_kind_check
check(kind in (
 'merchant_registered','merchant_updated','event_created','event_updated',
 'event_submitted','event_status_changed','merchant_status_changed',
 'community_tip_submitted','community_reply_submitted'
));

create or replace function public.notify_admin_community_submission()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.platform_notifications(
    kind,recipient_scope,actor_user_id,title,message,status_snapshot,dedupe_key
  ) values (
    case when tg_table_name='community_tip_replies' then 'community_reply_submitted' else 'community_tip_submitted' end,
    'admin',new.author_id,
    case when tg_table_name='community_tip_replies' then '社區有新留言待審批' else '社區有新報料待審批' end,
    case when tg_table_name='community_tip_replies'
      then '新留言等待審核，請進入社區留言審批。'
      else left(coalesce(to_jsonb(new)->>'title','新社區投稿'),150) end,
    'pending','community:' || tg_table_name || ':' || new.id::text
  ) on conflict do nothing;
  return new;
end $$;
revoke all on function public.notify_admin_community_submission() from public,anon,authenticated;
drop trigger if exists notify_admin_new_community_tip on public.community_tips;
create trigger notify_admin_new_community_tip
after insert on public.community_tips for each row
execute function public.notify_admin_community_submission();
drop trigger if exists notify_admin_new_community_reply on public.community_tip_replies;
create trigger notify_admin_new_community_reply
after insert on public.community_tip_replies for each row
execute function public.notify_admin_community_submission();
