# HK Family Fun — Production security hardening (2026-10-26 HKT)

Scope: `hkfamilyfun-v2` Supabase production and schema-only staging.
Maintenance: **not disabled**; production Vercel `MAINTENANCE_MODE=true` independently verified.

## Changes already applied via Supabase MCP migrations

1. Production migration `20261026014850` / `fix_event_claim_image_cross_event_rls`.
   - Corrects erroneous `c.event_id = c.event_id` to **correlate** `c.event_id` with the proposed `event_claim_image_proposals.event_id`.
   - Retains claimant identity, approved claim status, pending proposal and review-null checks.
   - The stage SQL dry run used a fake approved claim for event A and two event rows, accepted a valid A image proposal, blocked an attempt to propose an image for B using claim A. Test transaction was rolled back; no fake data persists.
   - Production policy was re-read; `exact_event_match=true`, `old_bug_present=false`.

2. Production migration `20261026015047` / `revoke_client_ddl_like_table_privileges`.
   - Revokes `TRUNCATE`, `TRIGGER`, `REFERENCES` on all `public` tables from `anon` and `authenticated`.
   - Staging tested normal merchant profile UPDATE still works while merchant self-approval is blocked by existing `protect_merchant_review_fields` trigger. Test rolled back.
   - Production cross-table grants audit: 0 remaining grants of these three privileges to `anon` or `authenticated`.


3. Production migration `20261026015725` / `restrict_anonymous_event_select_to_public_view_columns`.
   - Found 24 published events with non-null `ai_extracted_json` and `admin_review_note`, and confirmed anonymous broad SELECT access to all 167 base event columns before patch (potential data exposure; no evidence of actual exfiltration).
   - Removed base table-wide `anon` SELECT and granted only 135 projected public-view columns plus `hidden_pending_confirmation`.
   - Staging and production checked anonymous `public_events_i18n` view access stays functional.
   - Production role-impersonation assertions verified anonymous queries of `admin_review_note`, `ai_extracted_json`, and `rejection_reason` fail with insufficient privilege.
   - **High priority remaining:** `authenticated` users currently retain broad published event SELECT and may read internal fields; resolving this safely requires a schema/API redesign separating internal per-event data from public event data, because merchants/admins need private columns.

## Remaining security work — not a security certification

- Do not unblock `npm run db:push`. GitHub issue #52 documents existing migration-history drift. This PR records already-applied production versions; reconcile history via supported Supabase CLI procedures and review.
- Security Advisor still warns about two privileged event-claim review RPCs. Function source has Super Admin checks; test direct unauthenticated/non-admin calls and remove broad RPC execution if changing the app integration.
- Strong-password rules and leaked-password protection require plan/feature review.
- Validate the `public_events` view and direct `authenticated` SELECT permissions on base event columns (AI extraction/review/internal notes) using non-admin persona tests. Do not revoke base-table SELECT without auditing existing Merchant/Admin API usage.
- Restrict public upload visibility and validate image content; `event-claim-images` is currently a **public** storage bucket, so anyone with a URL may see a pending asset.
- Validate email approval actions and configure a dedicated `APPROVAL_ACTION_SECRET` after reviewing current link validity.
- Add rate limits / Turnstile to registration and uploads; check Cloudflare routing, WAF and CSP in report-only mode first.
- Review Supabase security advisors and security roles after each permission change; complete restore tests and code-based dependency checks.

## Safeguards

No production event, merchant, auth user or uploaded object was intentionally created/deleted by these changes. Staging personas used SQL transactions and explicit `ROLLBACK`. Production maintenance mode was not changed.

This document is an evidence log, not proof of penetration-test completion or zero data leakage.
