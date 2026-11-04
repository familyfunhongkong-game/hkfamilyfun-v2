-- Community photos and likes remain separate from official event publishing.
-- Staging already has a pilot schema; production uses this idempotent migration.
create table if not exists public.community_tip_likes (
 post_id uuid not null references public.community_tips(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (post_id,user_id)
);
alter table public.community_tip_likes enable row level security;
revoke all on public.community_tip_likes from public, anon, authenticated;
grant select,insert,delete on public.community_tip_likes to authenticated;
drop policy if exists "Member reads own likes" on public.community_tip_likes;
create policy "Member reads own likes" on public.community_tip_likes
 for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Member likes approved posts only" on public.community_tip_likes;
create policy "Member likes approved posts only" on public.community_tip_likes
 for insert to authenticated with check(
 user_id=(select auth.uid()) and exists(
 select 1 from public.community_tips p where p.id=post_id and p.status='approved'));
drop policy if exists "Member removes own like" on public.community_tip_likes;
create policy "Member removes own like" on public.community_tip_likes
 for delete to authenticated using(user_id=(select auth.uid()));

create table if not exists public.community_tip_photos (
 post_id uuid not null references public.community_tips(id) on delete cascade,
 image_position integer not null check(image_position between 0 and 3),
 author_id uuid not null references auth.users(id) on delete cascade,
 storage_path text not null unique check(length(storage_path) between 20 and 350),
 created_at timestamptz not null default now(),
 primary key(post_id,image_position)
);
create index if not exists community_tip_photos_owner_idx on public.community_tip_photos(author_id);
alter table public.community_tip_photos enable row level security;
revoke all on public.community_tip_photos from public,anon,authenticated;
grant select,insert,delete on public.community_tip_photos to authenticated;
drop policy if exists "Community photo owner and admin may read" on public.community_tip_photos;
create policy "Community photo owner and admin may read" on public.community_tip_photos
 for select to authenticated using(
 author_id=(select auth.uid()) or (select public.is_platform_admin()));
drop policy if exists "Member may attach up to 4 photos to own pending post" on public.community_tip_photos;
create policy "Member may attach up to 4 photos to own pending post" on public.community_tip_photos
 for insert to authenticated with check(
 author_id=(select auth.uid()) and
 split_part(storage_path,'/',1)=author_id::text and
 split_part(storage_path,'/',2)=post_id::text and
 exists(select 1 from public.community_tips p
 where p.id=post_id and p.author_id=(select auth.uid()) and p.status='pending'));
drop policy if exists "Owner may remove pending photo" on public.community_tip_photos;
create policy "Owner may remove pending photo" on public.community_tip_photos
 for delete to authenticated using(
 author_id=(select auth.uid()) and exists(
 select 1 from public.community_tips p where p.id=post_id and p.status='pending'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('community-tip-images','community-tip-images',false,3145728,array['image/jpeg','image/png','image/webp'])
 on conflict (id) do nothing;
drop policy if exists "Members upload own pending community photo" on storage.objects;
create policy "Members upload own pending community photo" on storage.objects
 for insert to authenticated with check(
 bucket_id='community-tip-images' and
 (storage.foldername(name))[1]=(select auth.uid())::text and
 exists(select 1 from public.community_tips p where
 p.id::text=(storage.foldername(name))[2] and
 p.author_id=(select auth.uid()) and p.status='pending'));
drop policy if exists "Community photos owner or admin can view" on storage.objects;
create policy "Community photos owner or admin can view" on storage.objects
 for select to authenticated using(
 bucket_id='community-tip-images' and
 ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_platform_admin())));
drop policy if exists "Community photos owner may remove pending upload" on storage.objects;
create policy "Community photos owner may remove pending upload" on storage.objects
 for delete to authenticated using(
 bucket_id='community-tip-images' and
 (storage.foldername(name))[1]=(select auth.uid())::text and
 exists(select 1 from public.community_tips p where
 p.id::text=(storage.foldername(name))[2] and p.author_id=(select auth.uid()) and p.status='pending'));
