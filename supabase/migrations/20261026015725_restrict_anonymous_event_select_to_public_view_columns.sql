-- Already applied to production via Supabase migration 20261026015725.
-- Keep issue #52 db:push drift lock enabled. Do not replay against production.
-- public_events and public_events_i18n are security_invoker views.
-- Anon should be able to read view-required event columns but NOT raw
-- ai_extracted_json, admin_review_note, rejection_reason, or other internals.
DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(format('%I', a.attname), ', ' ORDER BY a.attnum)
  INTO cols
  FROM pg_attribute a
  WHERE a.attrelid = 'public.events'::regclass
    AND a.attnum > 0 AND NOT a.attisdropped
    AND (
      a.attname = 'hidden_pending_confirmation'
      OR EXISTS (
        SELECT 1
        FROM pg_attribute v
        WHERE v.attrelid IN (
          'public.public_events'::regclass,
          'public.public_events_i18n'::regclass
        )
          AND v.attname = a.attname
          AND v.attnum > 0 AND NOT v.attisdropped
      )
    );

  IF cols IS NULL THEN
    RAISE EXCEPTION 'No public columns resolved; refusing to change grants';
  END IF;

  REVOKE SELECT ON public.events FROM anon;
  EXECUTE format('GRANT SELECT (%s) ON public.events TO anon', cols);
END;
$$;

NOTIFY pgrst, 'reload schema';
