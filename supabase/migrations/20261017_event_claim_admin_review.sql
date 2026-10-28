-- Admin-only review; never expose request updates to normal merchants.
create policy "platform admins read claim queue"
on public.event_claim_requests for select to authenticated
using (public.is_super_admin());

create or replace function public.review_event_claim(
  p_claim_id uuid, p_approve boolean, p_review_note text default null
) returns void language plpgsql security definer
set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'Not authorized';
  end if;
  update public.event_claim_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = left(coalesce(p_review_note,''),1000),
      updated_at = now()
  where id = p_claim_id and status = 'pending';
  if not found then raise exception 'Claim not found or already reviewed'; end if;
  -- Intentionally does not change merchant ownership: verify organizer identity
  -- and decide event editing permissions in a separate, audited operation.
end;
$$;
revoke all on function public.review_event_claim(uuid,boolean,text) from public,anon;
grant execute on function public.review_event_claim(uuid,boolean,text) to authenticated;
