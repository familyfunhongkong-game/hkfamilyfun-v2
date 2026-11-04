-- Photo consent is retained on the pending post and checked by both
-- the Storage upload policy and photo metadata RLS. A checkbox alone is not
-- sufficient: clients may bypass browser-side controls.
alter table public.community_tips
 add column if not exists image_rights_acknowledged_at timestamptz,
 add column if not exists image_rights_version text;
alter table public.community_tips
 drop constraint if exists community_tip_photo_rights_version_check;
alter table public.community_tips
 add constraint community_tip_photo_rights_version_check check (
   (image_rights_acknowledged_at is null and image_rights_version is null)
   or
   (image_rights_acknowledged_at is not null and image_rights_version='2026-11')
 );

drop policy if exists "Member may attach up to 4 photos to own pending post" on public.community_tip_photos;
create policy "Member may attach up to 4 photos to own pending post"
 on public.community_tip_photos for insert to authenticated
 with check (
  author_id=(select auth.uid()) and
  split_part(storage_path,'/',1)=author_id::text and
  split_part(storage_path,'/',2)=post_id::text and
  exists (
    select 1 from public.community_tips p
    where p.id=post_id
      and p.author_id=(select auth.uid())
      and p.status='pending'
      and p.image_rights_acknowledged_at is not null
      and p.image_rights_version='2026-11'
  )
 );

drop policy if exists "Members upload own pending community photo" on storage.objects;
create policy "Members upload own pending community photo" on storage.objects
 for insert to authenticated with check (
  bucket_id='community-tip-images'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists(
    select 1 from public.community_tips p
    where p.id::text=(storage.foldername(name))[2]
      and p.author_id=(select auth.uid())
      and p.status='pending'
      and p.image_rights_acknowledged_at is not null
      and p.image_rights_version='2026-11'
  )
 );
comment on column public.community_tips.image_rights_acknowledged_at is
  'User self-attestation for rights and identifiable-person consent. Admin must still inspect photos before approval.';
