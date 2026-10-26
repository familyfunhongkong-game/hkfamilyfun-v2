# HK Family Fun — Legacy Delta Read-Only Audit (2026-10-25)

**Databases:** Old `nyutyriuypjznbxtlbmo`, rebuilt `uiyrbqqvgnfhfdhedmav`. **Read-only SQL**, no migrations, inserts, approvals, or user data exports.

## Event delta (exact legacy ID, not title-only matching)
- Old `public.activities`: **183** rows / **183** distinct IDs.
- Rebuild `public.events` with `source_fingerprint LIKE 'legacy:%'`: **175** rows / **175** distinct fingerprints.
- Exact `legacy:<old UUID>` match: **175**.
- Old ID not present in rebuild fingerprint: **8**, **all old status = draft**.
- For each of those 8 IDs, a rebuilt activity exists with exactly the same normalized Traditional Chinese title. This strongly suggests historical duplicates, **but a title match is not proof of equivalent event details, dates, organizers or permissions**. The 8 should not be auto-imported.
- Four missing-ID drafts have an end date on **2026-12-31**; four ended earlier in 2026. All eight have other same-title records in Rebuild.
- Old activities last `updated_at`: **2026-10-11 13:29:45 UTC**. No old activity was created on/after 2026-10-10, but one old update on 2026-10-11 was observed. Recheck before public cutover because old database remains live.
- Rebuild legacy row statuses in this audit: **94 archived, 76 draft, 4 published, 1 approved**. These are editorial statuses of the target, not automatic copies of old states.

## Merchant delta (critical)
- Old `public.merchants`: **158** rows (151 approved, 3 pending, 3 frozen, 1 rejected).
- Old `public.activities`: **183/183** have a merchant ID, referencing **95 distinct merchant IDs**.
- Rebuild `public.merchants`: **2 approved** during this read-only audit. These two counts do not establish any old/new merchant identity correspondence.
- **Merchant account recovery is unresolved.** Password credentials, Auth user IDs, legal consents, merchant verification, commercial entitlements, and activity ownership must NOT be moved or inferred by matching a business name/email alone.
- Proposed non-destructive path: invite old organizers to claim a profile, validate control of existing contact channels plus organizer authorization, require new password/consent, Admin-reviewed claim, and only then transfer a specific activity's ownership with an auditable mapping.

## QA gates and owner decisions
1. Before launch rerun a read-only comparison of old IDs vs Rebuild fingerprints. If any unique unmatched newly added legacy event exists, only import as **draft** with official-source validation. Do not publish automatically.
2. Separately audit the eight same-title drafts for different dates or details. Keep them held for review; no blind deduplication.
3. Keep legacy merchant profiles and old Supabase intact. Do not bulk assign ownership or migrate credentials. Use verified claim steps.
4. Complete isolated Merchant/Admin E2E and migration-history Issue #52 before any schema migration or full legacy merchant migration.
5. No automatic changes to production status, maintenance mode, DNS, or secrets.

This document contains aggregate counts and general decisions only; no personal contacts, account IDs, private event notes, or old user credentials.
