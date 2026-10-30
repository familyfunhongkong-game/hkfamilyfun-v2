# Legacy Recovery Reconciliation — 24 October 2026

**Scope:** Old Supabase `nyutyriuypjznbxtlbmo` -> V2 `uiyrbqqvgnfhfdhedmav`.

This document records a production read-only audit. **It is not authorization to link accounts or publish events.**

## Verified
- 158 legacy merchant identities were retained in the private `legacy_recovery.merchants` staging table; equality checksum against the source passed.
- 183 source event-to-merchant UUID links were retained in `legacy_recovery.event_merchant_links`; checksum passed.
- 174 rows in `public.legacy_event_migrations` each identify a distinct source and distinct target event. These 174 rows cover 93 source merchants.
- 9 further legacy events have one exact-title candidate each in `legacy_recovery.event_match_candidates`. All remain `verified=false`.
- Legacy source Auth had 43 users, V2 Auth had 4 at the time of audit. None shared UUID; 2 had matching email addresses. **Email equality alone cannot establish ownership.**
- Source had 137/158 merchants without `user_id`, and the V2 Merchant Dashboard explicitly selects `public.merchants` by `owner_user_id` then `public.events` by `merchant_id`.
- No existing V2 events had `merchant_id` set at audit time.

## Date reconciliation of 9 title candidates

Source `activities.start_time/end_time` are `timestamptz`. Convert to **Asia/Hong_Kong** before comparing to V2 `events.start_date/end_date` (date columns). Do not compare the source UTC date substring.

Of the nine exact-title candidate matches:
- **7** share identical Hong Kong-local start and end calendar dates.
- **2** have different end dates. They must NOT be auto-approved or inserted into `legacy_event_migrations`:
  - `2026國際兒童節｜兒童動漫卡通嘉年華`: old end date in Hong Kong local time **2026-05-26**, V2 end date **2026-05-27**.
  - `HK Family Fun Like & Share 填問卷有機會抽中百佳禮券$50`: old end date in Hong Kong local time **2026-05-23**, V2 end date **2026-05-25**.

Even the seven date-equal candidate matches require organizer, venue, source URL, pricing and event edition checks before approving an ID mapping. The matching titles do not prove that these are the same event versions.

## Safe next actions
1. Preserve current private staging and never grant anon/authenticated access to `legacy_recovery`.
2. Confirm eligible source merchant ownership via independent authentication and an admin-reviewed claim. Never grant rights based solely on matching email/name.
3. Preserve historical, frozen, pending, rejected status and original order relationships; do not auto-publish or auto-approve.
4. Reconcile GitHub migration history (Issue #52) on isolated infrastructure; keep the existing `db:push` guard enabled.
5. Run Admin/Merchant E2E on isolated test Supabase and then owner-assisted manual production smoke. Maintenance mode must remain until gates pass.

## Verification query
See `scripts/legacy-recovery-audit.sql`, which is read-only and only intended for authenticated database administrators.
