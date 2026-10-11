update public.events
set status = 'archived',
    updated_at = now()
where status = 'draft'
  and merchant_id is null
  and coalesce(end_date, start_date) < date '2026-10-11';
