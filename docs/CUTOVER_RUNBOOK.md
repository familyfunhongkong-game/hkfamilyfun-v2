# HK Family Fun V2 — Production Cutover & Rollback Runbook

Updated: 2026-10-10

This runbook is the operational procedure for moving `hkfamilyfun.com` / `www.hkfamilyfun.com` from the legacy HK Family Fun site to `hkfamilyfun-v2`.

## 0. Non-negotiable rules

- The canonical rebuild branch is `main`.
- The canonical public hostname after cutover is **https://www.hkfamilyfun.com**.
- The apex hostname **https://hkfamilyfun.com** should redirect to the canonical `www` host.
- Do **not** delete the old Vercel domain assignment before confirming exactly which old project/account currently owns it.
- Do **not** run a legacy migration from an unreviewed script or from a local ad-hoc command.
- Do **not** auto-publish legacy records.
- Do **not** enable Admin QR/TOTP/MFA. Admin remains email + password with server-side Admin authorization.
- Do **not** delete V2 data during rollback.
- Do **not** treat a page returning HTTP 200 as proof of a successful cutover. `/api/health` must identify `service=hkfamilyfun-v2` and the expected latest `main` SHA.

## 1. HARD STOP conditions

Do not begin domain cutover if any item below is true:

- CI, Quality Gate or read-only Production Smoke is failing on latest `main`.
- Latest Vercel production deployment is not `READY`.
- Vercel runtime has unresolved 5xx/runtime errors.
- Old Vercel project/domain ownership is unknown.
- Final legacy delta dry-run has not been reviewed.
- Any mutable Merchant/Auth E2E is configured to write against production Supabase. Production-writing E2E must remain manual-only until a dedicated test Supabase project exists.
- The safe delta report contains unexplained duplicates, unsafe rows or unexpected drift.
- Supabase Auth live redirect URLs have not been prepared.
- Google OAuth live callback URLs have not been prepared.
- The rollback destination (old project/domain assignment) is not known.

## 1A. Verified rebuild state before cutover

Verified on 2026-10-10:

- latest rebuild production runs on `hkfamilyfun-v2.vercel.app`;
- latest checked main deployment is READY with no recent runtime error/warning logs;
- current/future published events: **13**;
- critical published-data completeness issues: **0**;
- current/future missing official-image warnings: **2** (allowed branded placeholder; not a hard blocker);
- unsupported legacy `0–99` age placeholders: **0**;
- public `/events` server-renders event records instead of shipping a zero/loading-only first response;
- rebuild custom domains: only `hkfamilyfun-v2.vercel.app`;
- production Google Drive callback is still on the staging Vercel host;
- live-domain `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_API_URL` cutover values are not yet active;
- Supabase Security Advisor has no critical database/RLS finding; it still warns that leaked-password protection is disabled. Supabase documents that leaked-password protection requires Pro plan or above, so treat this as a security-hardening item according to the active plan rather than adding web-app QR/TOTP to Admin.

## 2. Pre-cutover content freeze

Start a short editorial freeze before the final delta:

- no event create/edit/publish on the legacy site;
- no merchant approval changes on the legacy site;
- no manual database changes on either legacy or V2 unless part of this runbook.

Record:
- freeze start time;
- latest V2 `main` SHA;
- V2 event counts;
- old legacy activity count if accessible;
- current old Vercel project/domain assignment.

Keep the freeze until cutover succeeds or rollback is completed.

## 3. Record V2 baseline

Before the delta, capture:

- `/api/health` response;
- total/published/draft/approved/rejected/archived event counts;
- legacy-migrated count;
- `event-images` Storage object count;
- current Vercel production deployment ID/SHA;
- Supabase Security Advisor and Performance Advisor state.

Expected rebuild fingerprint:

- service: `hkfamilyfun-v2`;
- Supabase project: `uiyrbqqvgnfhfdhedmav`;
- Vercel project: `prj_8hPqrhdOXsiengS6zfxvJQEO3wMJ`.

## 4. Final legacy delta — DRY RUN first

Use GitHub Actions → **Legacy Delta Sync**.

Run:
- mode: `dry-run`;
- do not provide safe-apply confirmation.

Required secrets:
- `OLD_SUPABASE_SERVICE_ROLE_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- optional `OLD_SUPABASE_URL` if the legacy project URL changes.

Review the generated report for:

- old rows scanned;
- exact existing `legacy:<old-id>` matches;
- existing-row drift;
- URL duplicates;
- semantic duplicates;
- invalid rows;
- planned safe inserts;
- planned current/future drafts;
- planned expired archives.

Safety expectations:

- existing legacy rows are never overwritten;
- unseen current/future rows become `draft`;
- unseen expired rows become `archived`;
- no legacy row becomes `approved` or `published`;
- no legacy merchant login account is migrated.

If the report is surprising, **STOP**. Do not safe-apply.

## 5. Final legacy delta — SAFE APPLY

Only after dry-run approval:

Run GitHub Actions → **Legacy Delta Sync** with:
- mode: `safe-apply`;
- confirmation: exactly `SAFE_DELTA_ONLY`.

The migration script itself also refuses writes unless both guards are present.

After safe-apply:
- compare actual inserted count with dry-run planned inserts;
- rerun data-quality checks;
- confirm no new legacy record is public;
- rerun CI / Quality Gate / read-only Production Smoke.
- Do **not** use the mutable Merchant/Auth E2E against production as a release gate; it remains manual-only until a dedicated test Supabase project exists.

## 6. Prepare production URLs — do not break Preview

Production and Preview must not share the same callback URL after cutover.

For **Vercel production environment**, set:

- `NEXT_PUBLIC_APP_URL=https://www.hkfamilyfun.com`
- `NEXT_PUBLIC_SITE_URL=https://www.hkfamilyfun.com`
- `NEXT_PUBLIC_API_URL=https://www.hkfamilyfun.com/api`
- `SITE_URL=https://www.hkfamilyfun.com`
- `GOOGLE_ADMIN_DRIVE_REDIRECT_URI=https://www.hkfamilyfun.com/api/admin/google-drive/callback`

For **Preview**, retain the staging/Vercel callback and URLs. Do not replace Preview values with the live domain.

`GOOGLE_ADMIN_DRIVE_REDIRECT_URI` is currently shared across Production / Preview / Development. Before cutover, split it by Vercel environment target:

- Production → `https://www.hkfamilyfun.com/api/admin/google-drive/callback`
- Preview → retain `https://hkfamilyfun-v2.vercel.app/api/admin/google-drive/callback` unless a dedicated preview callback is intentionally configured
- Development → keep a deliberate development/staging callback; do not point local development at the production callback accidentally

Likewise, set the live `NEXT_PUBLIC_*` / `SITE_URL` values for **Production only** unless there is an explicit reason for Preview to generate live-domain links.

Secrets such as Supabase keys, Google client secret, token-encryption key and Resend key are not changed merely because the domain changes.

A fresh Vercel deployment is required after production environment changes.

## 7. Supabase Auth URL configuration

Rebuild Supabase project: `uiyrbqqvgnfhfdhedmav`.

Set **Site URL** to:

`https://www.hkfamilyfun.com`

Ensure **Additional Redirect URLs** include the live flows used by current code:

- `https://www.hkfamilyfun.com/merchant/login`
- `https://www.hkfamilyfun.com/merchant/update-password`
- `https://www.hkfamilyfun.com/merchant/update-password?return=admin`

Retain rollback/preview URLs, including:

- `https://hkfamilyfun-v2.vercel.app/merchant/login`
- `https://hkfamilyfun-v2.vercel.app/merchant/update-password`
- `https://hkfamilyfun-v2.vercel.app/merchant/update-password?return=admin`
- an appropriate Vercel Preview wildcard if previews require Auth redirects.

Do not remove staging redirects until post-cutover stability is established.

## 7A. Supabase Auth cutover rule

The current password-reset code sends users directly to the request origin:

- Merchant → `/merchant/update-password`
- Admin → `/merchant/update-password?return=admin`

Therefore the **live Supabase Auth redirect allowlist must be added before DNS is switched**. Keep the stable Vercel staging URLs during the rollback window.

Do not rely on the Supabase default Site URL alone for password recovery; the explicit redirect URLs above must remain allowed.

## 8. Google OAuth authorized redirect URIs

In the Google OAuth client used by HK Family Fun, add the live callbacks before users are sent to them:

- `https://www.hkfamilyfun.com/api/google-calendar/callback`
- `https://www.hkfamilyfun.com/api/admin/google-drive/callback`

Retain staging callbacks during the cutover/rollback window:

- `https://hkfamilyfun-v2.vercel.app/api/google-calendar/callback`
- `https://hkfamilyfun-v2.vercel.app/api/admin/google-drive/callback`

Do not rotate the Google client secret or token-encryption key as part of normal domain cutover.

## 9. Confirm old Vercel domain assignment

As of 2026-10-10, the public legacy site still responds on `https://www.hkfamilyfun.com`, and `https://hkfamilyfun.com` redirects to the `www` host. The rebuild project itself still owns only `hkfamilyfun-v2.vercel.app`. Treat the legacy site as live until the controlled cutover is complete.

Before any domain write:

- sign in/connect the legacy HK Family Fun Vercel account;
- identify the exact source project containing:
  - `hkfamilyfun.com`;
  - `www.hkfamilyfun.com`;
- record source project ID/team;
- record redirects/aliases;
- confirm the old deployment remains available for rollback.

Vercel supports moving a project domain directly between projects when the required source/target access is available. Prefer a controlled project-domain move over deleting the domain first.

If the source and target are in different ownership scopes and the move cannot be performed directly, **STOP** and complete Vercel domain ownership/verification first. Do not force-remove the old domain.

## 9A. Recommended order of operations

Use this exact high-level order so callback changes never point users at an unavailable hostname:

1. Start editorial freeze and record the old DNS/domain destination.
2. Run final guarded legacy delta dry-run; safe-apply only after review.
3. Re-run CI / Quality Gate / read-only Production Smoke on latest `main`.
4. In Google OAuth, **add** both live callbacks while keeping staging callbacks.
5. In Supabase Auth, **add** live reset/redirect URLs while keeping staging URLs.
6. Add/verify the two domains on the target Vercel project without destroying the recorded rollback path.
7. Split/update **Production-only** live URL and Drive callback env values; redeploy and confirm READY.
8. Switch only the web-routing DNS/domain assignment; preserve MX/TXT/email records.
9. Verify TLS, apex→www redirect, health fingerprint, indexability, password reset and Google callbacks.
10. Keep the old destination available throughout the monitoring window.
11. Only after the monitoring window passes should the old web assignment be retired.

## 10. Domain cutover

Target Vercel project:

`prj_8hPqrhdOXsiengS6zfxvJQEO3wMJ`

Target behavior:

- `www.hkfamilyfun.com` → HK Family Fun V2 production;
- `hkfamilyfun.com` → permanent redirect to `https://www.hkfamilyfun.com`.

Preserve DNS/email records unrelated to web hosting. Do not replace an entire DNS zone merely to change website routing.

Wait for Vercel domain verification and TLS to be valid before declaring success.

## 11. Mandatory post-cutover automated smoke

Manually dispatch **Production Smoke Test** with:

- `base_url=https://www.hkfamilyfun.com`
- `index_expectation=production-index`

This test must pass all checks, including:

- target reports `service=hkfamilyfun-v2`;
- target `buildSha` equals latest `main`;
- public routes work;
- original Family Fun logo SHA matches;
- Instagram/Facebook/Threads links exist;
- public event detail works;
- locale persistence works;
- anonymous protected writes return 401;
- Google Calendar OAuth runtime is configured;
- production is not `noindex`;
- canonical host is `www.hkfamilyfun.com`;
- rendered DOM has no framework error;
- mobile/desktop screenshots are generated.

If the health fingerprint or SHA is wrong, the domain is not serving the intended rebuild even if the page looks correct.

## 12. Mandatory human functional checks

After automated smoke passes:

### Public
- open Home / Today / Calendar / Events / Map / Planner;
- TC / SC / EN switch correctly;
- open at least two current event details;
- official registration CTA works;
- logo is complete and uncropped;
- mobile navigation is usable.

### Admin
- sign in with authorized Admin email + password;
- confirm **no QR/TOTP/2FA prompt**;
- create a temporary draft;
- edit/save/preview;
- verify event review queue;
- delete the temporary draft;
- verify System Health.

### Merchant
- password login works;
- use an intentionally approved test/operations merchant for the manual check; do not re-enable production-writing automated E2E;
- approved merchant can create draft;
- upload/delete an image;
- submit event;
- merchant cannot self-publish;
- Admin can review the submission.

### Password recovery
Test both:
- Merchant password reset;
- Admin password reset.

The recovery email must return to the live `www.hkfamilyfun.com` domain and complete successfully.

### Email notifications
Trigger one controlled merchant submission/review notification and confirm:
- durable in-app queue entry;
- Resend email delivery.

### Google
- Calendar connect reaches the live callback;
- Admin Google Drive connect reaches the live callback;
- Admin Google Sheets sync still reads data.

## 13. SEO/domain checks

Confirm:

- `https://hkfamilyfun.com` redirects to `https://www.hkfamilyfun.com`;
- live pages are indexable;
- canonical URLs resolve to the live `www` host;
- no staging `vercel.app` URL appears as canonical;
- sitemap/robots behavior is appropriate for production;
- staging Vercel host remains noindex.

## 14. Monitoring window

For at least the first 30–60 minutes:

- watch Vercel runtime errors;
- watch 4xx/5xx spikes;
- verify Supabase Auth errors;
- verify Merchant submissions/notifications;
- verify public event reads;
- re-run `/api/health` and at least one live event.

Do not remove rollback access during this window.

## 15. Rollback triggers

Rollback immediately if any critical condition cannot be corrected quickly:

- live domain does not report `service=hkfamilyfun-v2`;
- live `buildSha` is not the approved latest main SHA;
- widespread 5xx/application errors;
- public event data unavailable;
- Admin password login broken;
- password recovery broken for live domain;
- Merchant login/submit workflow broken;
- severe RLS/auth authorization regression;
- incorrect noindex/canonical behavior that cannot be corrected immediately;
- domain/TLS routing unstable.

Non-critical optional integrations such as AI fallback alone are not rollback triggers.

## 16. Rollback procedure

1. Move/restore `hkfamilyfun.com` and `www.hkfamilyfun.com` to the recorded legacy Vercel project/assignment.
2. Verify the old public site is serving again.
3. Revert **rebuild production-only** URL/callback envs back to the staging Vercel host if the rebuild will continue operating only on staging.
4. Set rebuild Supabase Site URL back to the staging host if recovery/confirmation flows must continue on staging.
5. Keep live and staging Auth redirect allowlists during diagnosis.
6. Keep Google live + staging callbacks temporarily; remove only after the next stable cutover.
7. **Do not delete or roll back safely imported V2 delta rows merely because the domain was rolled back.**
8. Keep the editorial freeze until data ownership is clear, then resume changes on the authoritative site only.
9. Record the failure reason and corrective action before retrying cutover.

## 17. Cutover completion criteria

Cutover is complete only when:

- final safe delta is reconciled;
- CI, Quality Gate and read-only Production Smoke are green on the approved latest `main` commit;
- live domain serves the expected latest V2 SHA;
- automated live-domain Production Smoke passes in `production-index` mode;
- Admin email/password login works with no QR/2FA;
- Merchant core workflow works;
- password recovery works on live domain;
- Resend notification works;
- Google callbacks work or optional integration is explicitly deferred;
- Vercel runtime remains clean through the monitoring window;
- rollback information is retained.

Only after those checks should the legacy Vercel assignment be treated as retired.
