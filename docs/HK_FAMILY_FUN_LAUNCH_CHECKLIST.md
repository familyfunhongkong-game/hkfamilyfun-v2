# HK Family Fun V2 — Launch Checklist

> **CURRENT STATUS — 2026-10-23:** Refer first to [`LAUNCH_GATES_2026_10_23.md`](./LAUNCH_GATES_2026_10_23.md). The date-specific historical snapshot below predates the verified V2 custom-domain assignment and current event counts. Do not follow old domain-transfer or staging-only assumptions; maintenance is still enabled and final legacy/human gates remain outstanding.


Updated: 2026-10-12 (Hong Kong time)

## Quality target

HK Family Fun V2 is being hardened toward an Awwwards / Webby / FWA-level product bar while preserving practical SaaS requirements:

- clear information hierarchy and strong visual polish
- mobile-first family discovery and one-hand navigation
- fast, resilient event imagery and graceful fallbacks
- TC / SC / EN consistency
- accessibility, keyboard focus and reduced-motion support
- stable Merchant/Admin workflows
- secure role separation and database RLS
- deterministic CI, read-only production smoke gates, and mutable E2E isolated from production

Visual polish must never trade away accessibility, SEO, performance, data safety or operational stability.

## Canonical branch

- `main` is the only canonical rebuild branch.
- Do **not** blindly merge `phase-1c-merchant-portal` / PR #3. It is heavily diverged from `main`.
- Production domain cutover remains a separate final action after the remaining external gates below are cleared.
- Obsolete PR #3 (`phase-1c-merchant-portal`) is closed and explicitly marked DO NOT MERGE; the branch is retained only as historical reference.

## Live infrastructure snapshot

Verified from the current HK Family Fun Supabase / Vercel rebuild on 2026-10-10:

- GitHub repository: `familyfunhongkong-game/hkfamilyfun-v2`
- Supabase V2 project: `hkfamilyfun-v2` / `uiyrbqqvgnfhfdhedmav`
- Supabase region: `ap-southeast-1`
- Vercel project: `hkfamilyfun-v2`
- Events: **247**
- Published: **17**
- Current/future published: **17**
- Draft: **83**
- Approved: **1**
- Rejected: **1**
- Archived: **145**
- Merchant accounts: **0**
- Legacy events migrated into V2: **174**
- `event-images` Storage objects: **30**
- Current/future published critical completeness issues: **0**
- Current/future official-image warnings: **6**
- Unsupported legacy `0–99` age placeholders: **0**
- Current/future explicit `主辦方未註明` age classification: **8**
- Rebuild custom domain currently attached: **hkfamilyfun-v2.vercel.app only**
- Public legacy `hkfamilyfun.com` / `www.hkfamilyfun.com` still responds and must be treated as live until controlled cutover

The app currently uses `events.cover_image_url` + `gallery_image_urls` + Supabase Storage as the active image model. A zero-row legacy `event_images` table is therefore not, by itself, an application failure.

## Product scope implemented

### Public
- Home / Today / Calendar / Events / Map / Event Detail
- TC / SC / EN with persistent locale cookie and TC fallback
- date / district / MTR / price / free / category / SEN / nearby discovery
- favorites, share, Google Maps and official-organizer CTA
- responsive mobile bottom navigation
- resilient event-image fallback using the original HK Family Fun logo
- staging `noindex` before domain cutover

### Merchant
- registration and email/password login
- 12-character password policy
- password recovery
- pending → approved merchant workflow
- create / edit / autosave / preview / submit
- image upload / delete / cover ordering
- URL import and direct PDF upload into editable draft data
- TC / SC / EN core fields
- TC / SC / EN highlights, terms, parent note, safety note and cancellation/refund fields
- optional one-click SC + English translation when Azure Translator is configured

### Admin
- dedicated email + password login at `/admin/login`; authorized accounts are rechecked with `is_platform_admin()` after sign-in
- no QR Code / TOTP / web-app two-factor challenge
- merchant review / approval
- dedicated `/admin/login` using authorized Admin email + password only (no QR / TOTP / web-app 2FA)
- event create / edit through the shared admin-capable editor
- approve / reject / publish / archive / return-to-draft
- permanent event deletion and event-image storage cleanup
- review notes and publication-readiness checks
- promotional banner / export workflows already present in the rebuild

## Automated gates already verified

### GitHub quality
- Node 22
- deterministic `npm ci`
- dependency audit
- ESLint
- TypeScript `tsc --noEmit`
- production `next build`

### Authenticated Merchant/Admin/Auth E2E — HISTORICAL PASS / MANUAL-ONLY NOW

A production-writing authenticated E2E previously proved the Merchant/Admin/Auth lifecycle, including signup, approval, draft creation, image handling, submission, publish protection and password recovery.

That evidence remains useful, but **the mutable E2E is no longer an automatic production release gate**. The latest safety policy makes it manual-only until a dedicated non-production Supabase test project exists. This prevents CI from creating/deleting production users, merchants, events or storage objects on every main push.

Current automated release gates are:

- HK Family Fun CI;
- HK Family Fun Quality Gate;
- read-only Production Smoke / Vercel runtime checks.

Do not re-enable production-writing E2E merely to make the checklist look more comprehensive. If repeatable mutable E2E is required, provision a dedicated test Supabase project first.

Historical transaction/E2E evidence confirmed:

- signup trigger creates pending merchant;
- legal acceptance fields are protected;
- pending merchant cannot create events;
- Admin approval is separate;
- merchant cannot self-publish;
- unpublished events do not leak publicly;
- image upload/delete ownership is enforced;
- password recovery flow works when redirect URLs are correctly allowlisted.

### Production smoke — PASS

The production smoke gate now verifies:

- exact Vercel commit deployment
- `/`
- `/api/health`
- `/events`
- `/today`
- `/calendar`
- `/events/map`
- `/planner`
- `/merchant/login`
- `/merchant/register`
- `/merchant/events/import`
- `/admin`
- `/admin/forgot-password`
- original HK Family Fun logo integrity (exact SHA-256)
- Instagram / Facebook / Threads production links
- Google Calendar OAuth runtime configuration and redirect generation
- one live published event detail
- locale persistence cookie
- anonymous import/translation writes rejected with 401
- Vercel staging remains `noindex`
- TC / SC / EN locale cookies change the server-rendered document language
- Chrome-rendered DOM contains the main application surface and no Next.js error overlay / Application error
- mobile (390×844) and desktop (1440×1000) screenshots are captured for Home / Events / Today / Calendar / Map / Event Detail and retained as a workflow artifact

The smoke workflow now skips superseded commits instead of treating cancelled obsolete Vercel deployments as product failures.

### Final human visual review — PASS

The retained mobile (390×844) and desktop (1440×1000) screenshot artifact was manually reviewed across Home / Events / Today / Calendar / Map / Event Detail.

Issues found and corrected during the review:
- desktop brand text was being truncated
- desktop navigation labels were wrapping because the header was over-compressed
- the Home featured image could over-crop official source artwork

After correction, a new Production Smoke visual artifact was reviewed:
- desktop brand is fully visible
- desktop navigation stays on one line
- mobile bottom navigation remains clear and unobstructed
- Home featured artwork preserves source aspect ratio
- Map remains usable on mobile and desktop
- Event Detail has no visible control overlap and resilient image handling remains active

## Security / data verification

- public i18n view is `security_invoker` + `security_barrier`
- anonymous public view test exposed **0 non-published events**
- open-ended published events use explicit `end_date` semantics: missing `end_date` remains visible for Admin review; an anon RLS transaction smoke test confirmed open-ended visible / explicitly expired hidden
- known pending test merchant records were removed with event/source history preserved via `ON DELETE SET NULL`
- current/future published data has **0 critical completeness blockers**; localized-content quality remains subject to editorial review
- Merchant cannot modify another merchant's non-public events
- Merchant cannot modify legal acceptance audit fields
- Merchant cannot directly publish
- Admin review/publish permissions are enforced separately
- Vercel runtime error checks have recently reported **0 runtime errors**

### Recurring-event correctness — VERIFIED

- Today, Calendar and Events discovery share the same recurrence engine.
- weekly weekdays, include dates and exclude dates are applied consistently.
- PMQ Picture Book Library is configured Wed–Sun and is not treated as free.
- Hong Kong Park Morning Bird Watching is configured Wednesday only with holiday exclusions.
- Hong Kong Park Arts Corner is configured Sat/Sun plus explicit public-holiday dates.

### Remaining Supabase security action

Supabase Security Advisor currently reports one password-hardening warning:

- **Leaked Password Protection Disabled**

Supabase documents that leaked-password protection is available on the Pro plan and above. If the HK Family Fun Supabase project remains on a plan without that feature, record it as an accepted platform limitation rather than inventing a custom substitute. If the project is upgraded, enable leaked-password protection in Supabase Auth settings.

Current controls remain password-length requirements, email confirmation where configured, server-side Admin allowlist/RLS, strict Merchant ownership policies and CI contracts. Do **not** add web-app QR/TOTP/MFA to the Admin Portal unless product requirements change.

Performance Advisor also reports multiple-permissive-policy and unused-index notices. These are optimization findings, not evidence of a current public-data leak. Do not drop indexes or rewrite policies blindly before measuring query plans and preserving RLS behavior.

## Legacy migration reconciliation

The historical dry-run recorded:

- old rows: **182**
- old unique after internal dedupe: **174**
- old duplicate rows removed: **8**
- planned unique migration: **174**

Current V2 production contains exactly **174** legacy-migrated records identified by the existing `source_fingerprint` prefix `legacy:`.

A new manual-only `Legacy Delta Sync` workflow now protects the final cutover delta:
- default mode is **dry-run**
- safe apply requires both `APPLY_MIGRATION=true` and exact confirmation `SAFE_DELTA_ONLY`
- exact old IDs use the existing `legacy:<old-id>` fingerprint format
- existing migrated records are report-only and are never overwritten
- newly discovered current/future legacy records import as **draft**
- expired legacy records import as **archived**
- no legacy record can be auto-approved or auto-published
- legacy merchant login accounts are never migrated

Reconciliation checks:
- migrated unique count: **174 / 174**
- duplicate legacy source fingerprints found: **0**
- missing title: **0**
- invalid date ranges: **0**
- known missing start date: **1**
- migrated records attached to new Merchant accounts: **0** by design

Current/future legacy review:
- Four earlier re-verified legacy activities remain published after source/data correction: Hong Kong Park Arts Corner, Hong Kong Park Morning Bird Watching, PMQ Picture Book Library START FROM HERE, and the 13th Jackfruit Cultural Festival.
- FIFA Museum Hong Kong was re-verified against FIFA Museum / Arena Tix and published with corrected 28 May–28 November 2026 dates, Times Square 4/F 401–404 location, family/all-age context and current admission details.
- The incorrect legacy `愉景灣週末露天市集 2026` continuous May–December record was archived. It was replaced with four source-verified individual future market records: 31 Oct–1 Nov, 14–15 Nov, 28–29 Nov and 12–13 Dec 2026. This prevents Calendar / Today / SEO from treating separate markets as one continuous event.
- We Care Run 2026 remains `draft`: the record was corrected to 29 November 2026, parent-child age 5–11 and verified pricing, but official registration had already closed / sold out. It is intentionally not republished as a bookable event.
- `AI × 競技陀螺實戰班` remains `draft` with a HOLD note because a current official schedule could not be independently verified.
- The long-running Bliss Infinite family-support programme remains `approved` but intentionally not public because it is a support service rather than a conventional event.
- other current/future legacy records without recoverable/verified content remain draft/archived and are not publicly exposed.

## Remaining launch actions

### Required before switching `hkfamilyfun.com`

Core rebuild code/data is now launch-ready on the staging Vercel domain. The remaining blockers are **cutover/external ownership tasks**, not missing core SaaS functions:

1. Confirm the exact legacy hosting/Vercel project that currently serves `hkfamilyfun.com` / `www.hkfamilyfun.com`, and record the rollback destination.
2. Immediately before cutover, run **Legacy Delta Sync** in dry-run mode against the old source. Review new legacy IDs, duplicates and drift; safe-apply only after acceptance.
3. Ensure latest `main` passes **CI + Quality Gate + read-only Production Smoke**. Mutable production-writing Merchant/Auth E2E stays manual-only until a dedicated test Supabase exists.
4. Add live Supabase Auth redirect URLs for:
   - `https://www.hkfamilyfun.com/merchant/update-password`
   - `https://www.hkfamilyfun.com/merchant/update-password?return=admin`
   Keep staging redirects during rollback window.
5. Add live Google OAuth callbacks before switching traffic:
   - `https://www.hkfamilyfun.com/api/google-calendar/callback`
   - `https://www.hkfamilyfun.com/api/admin/google-drive/callback`
   Keep staging callbacks temporarily.
6. Split Vercel callback/URL variables by environment target. Production must use the live `www` domain; Preview must not be forced to use the live callback.
7. Attach/verify `www.hkfamilyfun.com` and apex `hkfamilyfun.com` on the rebuild project; make `www` canonical and apex redirect to `www`.
8. Change only website routing/DNS records. Preserve MX/TXT and other email/domain records.
9. Run live-domain smoke, password recovery and Google callback checks before retiring the old assignment.
10. Monitor runtime errors for at least 30–60 minutes with rollback destination still available.

Authoritative procedure: **`docs/CUTOVER_RUNBOOK.md`**.

### Operational configuration status

- Latest checked rebuild production deployment on `hkfamilyfun-v2.vercel.app` is READY and recent runtime error/warning scans are clean.
- Public `/events` now server-renders real event records on first response.
- Current/future published events: **17** with **0 critical completeness blockers**.
- Missing official-image count: **6**, intentionally treated as warnings with the branded HK Family Fun fallback rather than fabricated imagery.
- Known pending test merchants: **0**.
- Explicitly expired published events: **0**.
- Open-ended published events requiring review: **0** at the 2026-10-12 HK-time snapshot.
- Expired unowned Draft backlog: **0**.
- Unsupported legacy `0–99` age placeholders: **0**.
- Resend is configured; normal Merchant/Admin notification infrastructure remains present.
- Google Admin Drive callback env targets are now split across Production / Preview / Development; all still intentionally point to the staging Vercel callback until the live Google OAuth callback is allowlisted and custom-domain cutover begins.
- The latest GitHub `main` release candidate must be verified dynamically by exact deployed SHA rather than a hard-coded historical SHA in this checklist. The current release gate requires that exact `main` commit to be READY on `hkfamilyfun-v2.vercel.app`, Vercel commit status to be success, runtime region to remain `sin1`, and the post-deploy runtime error/warning scan to be clean.
- Rebuild Vercel project currently owns only `hkfamilyfun-v2.vercel.app`; the custom domain has not been moved.
- Sell with Family Fun native ticketing remains safely disabled.

### Current live data snapshot

- Events: **247**
- Published: **17**
- Current/future published: **17**
- Draft: **83**
- Submitted: **0**
- Approved: **1**
- Rejected: **1**
- Archived: **145**
- Legacy-migrated records: **174**
- Merchant accounts: **0**
- `event-images` Storage objects: **30**
- Current/future critical completeness issues: **0**
- Current/future image warnings: **6**
- Expired unowned Draft backlog: **0** (historical auto-discovery Drafts were archived, not deleted)

## Content backlog that does not block application launch

- Some draft/archived legacy records still have no recoverable cover image.
- Two current public records previously had no explicit cover URL; resilient branded fallback prevents a broken/blank card, but official imagery should still be added when permission/source quality is clear.
- Continue editorial review of imported and auto-discovered drafts before publication.

## Cutover rule

Do **not** switch `hkfamilyfun.com` to the rebuilt site until the old Vercel domain assignment is confirmed and the final guarded Legacy Delta Sync dry-run is reviewed.

Launch-candidate rule: the candidate is the **latest `main` commit only after CI, Quality Gate and read-only Production Smoke pass for that release**. Mutable production-writing Merchant/Auth E2E is not an automatic gate until a dedicated test Supabase project exists. Do not rely on a hard-coded SHA in this document.
