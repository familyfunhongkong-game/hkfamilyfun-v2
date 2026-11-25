-- Keep claim uploads private. Only super admins can preview.
create policy "super admins preview claim images" on storage.objects
for select to authenticated
using (bucket_id = 'event-claim-images' and (select public.is_super_admin()));

-- Preserve the existing RPC signature. Reject approval unless a public copy exists.
create or replace function public.review_event_claim_image(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $function$
declare v public.event_claim_image_proposals%rowtype; v_path text; v_prefix text; v_public_path text;
begin
 if auth.uid() is null or not public.is_super_admin() then raise exception 'Not authorized'; end if;
 if p_approve is null then raise exception 'Decision required'; end if;
 select * into v from public.event_claim_image_proposals where id=p_id and status='pending' for update;
 if not found then raise exception 'Proposal not pending'; end if;
 if p_approve then
   if not coalesce(v.copyright_confirmed,false) or not exists (
     select 1 from public.event_claim_requests c where c.id=v.claim_id and c.event_id=v.event_id
       and c.claimant_user_id=v.submitted_by and c.status='approved'
   ) then raise exception 'Claim or copyright confirmation invalid'; end if;
   v_prefix := 'https://uiyrbqqvgnfhfdhedmav.supabase.co/storage/v1/object/public/event-claim-images/';
   if v.image_url is null or left(v.image_url,length(v_prefix))<>v_prefix then raise exception 'Image must be uploaded to claim storage'; end if;
   v_path:=substr(v.image_url,length(v_prefix)+1);
   if split_part(v_path,'/',1)<>v.submitted_by::text or split_part(v_path,'/',2)<>v.claim_id::text
      or v_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|png|webp)$'
      or not exists(select 1 from storage.objects where bucket_id='event-claim-images' and name=v_path)
   then raise exception 'Invalid image upload'; end if;
   v_public_path := 'claim-approved/' || v.id::text || '/' || split_part(v_path,'/',3);
   if not exists(select 1 from storage.objects where bucket_id='event-images' and name=v_public_path and owner_id=auth.uid()::text)
   then raise exception 'Public image copy required'; end if;
   update public.events set cover_image_url='https://uiyrbqqvgnfhfdhedmav.supabase.co/storage/v1/object/public/event-images/' || v_public_path where id=v.event_id;
   if not found then raise exception 'Event not found'; end if;
 end if;
 update public.event_claim_image_proposals set status=case when p_approve then 'approved' else 'rejected' end,
 reviewed_by=auth.uid(),reviewed_at=now(),review_note=left(coalesce(p_note,''),1000) where id=p_id;
end; $function$;
