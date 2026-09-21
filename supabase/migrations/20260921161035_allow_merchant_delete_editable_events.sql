drop policy if exists "Merchant can delete own drafts" on public.events;

create policy "Merchant can delete own draft or rejected events"
on public.events
for delete
to authenticated
using (
  status = any (array['draft'::text, 'rejected'::text])
  and exists (
    select 1
    from public.merchants m
    where m.id = events.merchant_id
      and m.owner_user_id = (select auth.uid())
      and m.status = 'approved'
  )
);
