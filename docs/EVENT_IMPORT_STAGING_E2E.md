# HK Family Fun — Safe Staging E2E Runbook

**Purpose:** verify activity import, media upload, Merchant submission and Admin review **without touching live HK Family Fun data**.

## Release status

- PR #126 remains Draft until isolated, authenticated E2E is complete.
- The default Rebuild Supabase project `uiyrbqqvgnfhfdhedmav` is **production**. Never use it for this workflow.
- The existing Vercel Preview may use variables that also target Production. Preview deployment alone is **NOT** evidence of staging isolation.
- Do **not** run the old mutable E2E against live credentials or `hkfamilyfun.com`.

## One-time staging setup

1. Provision or identify a **separate Supabase project** owned by Rebuild HK Family Fun. Check plan limits and any recurring costs before creating it. Apply schema changes only through the approved migration process; never export/copy personal customer records into test data.
2. Create a dedicated Vercel Preview (or staging project) bound to this **different** Supabase URL and publishable key. Check its deployed environment and verify the project ref is not `uiyrbqqvgnfhfdhedmav`. Ensure no production service-role key or production email recipient is available in the staging environment.
3. In GitHub, set **staging-only** Action secrets (ideally under an Environment with access controls):
   - `E2E_SUPABASE_URL`
   - `E2E_SUPABASE_PUBLISHABLE_KEY`
   - `E2E_SUPABASE_SERVICE_ROLE_KEY`
   - `E2E_SITE_URL` (the isolated staging URL, not a live domain or an ordinary production-backed Preview).
   Never put these credentials in commits, logs, URLs, screenshots, tickets, or this document.
4. Run **Merchant Auth E2E** manually via GitHub Actions `workflow_dispatch`. The script refuses missing staging variables, the live Supabase project ref, and the live website domain. It creates synthetic users/events and removes them in a `finally` cleanup. Verify that cleanup succeeded and no test users, events, notifications or Storage objects remain.

## Acceptance criteria (do not mark passed without evidence)

- File picker: PNG, JPG/JPEG, WebP poster preview, upload and public image read-back from staging.
- Save as Draft: database cover URL persists after reload; submit the same event twice without creating duplicate records.
- URL: official public event page extracts a meaningful title, valid start/end dates, location and source URL; extraction notes flag unknown or conflicting prices and schedules.
- PDF <=4 MB: reader returns text or a clear error; it never auto-publishes. Larger files produce an actionable error.
- Merchant role: only an approved merchant may create/submit a draft. Merchant cannot approve/publish.
- Admin role: review/approve then publish, with approved-but-unpublished hidden from public views.
- Negative tests: invalid file signatures, wrong MIME, oversized files, SSRF/internal URL denial, invalid dates, retry/cleanup.
- Notification: confirm in-app durable queue and (separately) Resend Delivered/Inbox to recipient, using test recipient configuration.
- Content moderation: do not automatically publish the Wine & Dine Festival or assume an alcohol-oriented event is appropriate for children.

## Release gate

Only after exact-head GitHub CI + Quality Gate + Preview READY, authenticated staging E2E, data cleanup, editorial review, and migration safety checks are green should PR #126 be eligible for merge. Then run production smoke checks without test events or unauthorized data changes.
