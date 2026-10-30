-- HK Family Fun V2: read-only legacy migration audit (2026-10-24)
-- Run only in authenticated Supabase SQL Editor with administrator privileges.
-- Never expose the private legacy_recovery schema through the Data API.
-- This script changes no data or permissions.
SELECT 'staged_merchants' AS metric, count(*)::bigint AS total FROM legacy_recovery.merchants
UNION ALL SELECT 'legacy_event_links', count(*) FROM legacy_recovery.event_merchant_links
UNION ALL SELECT 'verified_migrated_events', count(*) FROM legacy_recovery.verified_event_merchants
UNION ALL SELECT 'unverified_title_candidates', count(*) FROM legacy_recovery.event_match_candidates WHERE NOT verified
UNION ALL SELECT 'production_merchant_records', count(*) FROM public.merchants
UNION ALL SELECT 'production_events_without_merchant', count(*) FROM public.events WHERE merchant_id IS NULL;

-- Ensure no invalid legacy merchant references.
SELECT count(*) AS invalid_legacy_merchant_links
FROM legacy_recovery.event_merchant_links l
LEFT JOIN legacy_recovery.merchants m ON m.legacy_id=l.legacy_merchant_id
WHERE m.legacy_id IS NULL;

-- Title-only matching is not a verified migration: review all fields before mapping.
SELECT c.legacy_event_id, c.proposed_new_event_id, e.title_tc,
       e.start_date, e.end_date, e.organizer_name, e.status, c.verified
FROM legacy_recovery.event_match_candidates c
JOIN public.events e ON e.id=c.proposed_new_event_id
ORDER BY e.title_tc;

-- Guardrail: never populate public.events.merchant_id with the old merchant UUID,
-- and never associate a legacy merchant with a new Supabase Auth user solely by email.
-- The production Merchant Dashboard filters public.events by merchant_id, which
-- must point to public.merchants(id) AFTER independently verified ownership.
