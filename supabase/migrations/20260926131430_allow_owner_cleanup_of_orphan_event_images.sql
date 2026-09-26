drop policy if exists "Merchant can delete own event image files" on storage.objects;
create policy "Merchant can delete own event image files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-images'
  and owner_id = (select auth.uid())::text
  and (
    exists (
      select 1
      from public.events e
      join public.merchants m on m.id = e.merchant_id
      where e.id::text = (storage.foldername(objects.name))[1]
        and m.owner_user_id = (select auth.uid())
        and m.status = 'approved'
        and e.status in ('draft','rejected')
    )
    or not exists (
      select 1
      from public.events e
      where e.id::text = (storage.foldername(objects.name))[1]
    )
  )
);
