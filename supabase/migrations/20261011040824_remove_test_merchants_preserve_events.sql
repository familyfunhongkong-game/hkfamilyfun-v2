-- HK Family Fun V2
-- Remove two known pending test merchant records while preserving their event
-- records. The events FK uses ON DELETE SET NULL, so official/source history stays.

update public.events
set status='archived',
    is_featured=false,
    updated_at=now()
where merchant_id='e41384e7-5d1c-4f32-abf7-1bcb12fe7f95'
  and status='draft'
  and end_date is not null
  and end_date < (timezone('Asia/Hong_Kong', now()))::date;

delete from public.merchants
where (
    id='e41384e7-5d1c-4f32-abf7-1bcb12fe7f95'
    and business_name='Test Family Fun Centre'
    and status='pending'
  )
  or (
    id='fa2bd3f9-af2b-47fe-9d09-f1bd670ac3f2'
    and business_name='Test'
    and status='pending'
  );
