# HK Family Fun V2 — Launch Checklist

Updated: 2026-10-06

## Quality target

HK Family Fun V2 is being hardened toward an Awwwards / Webby / FWA-level product bar while preserving practical SaaS requirements:

- clear information hierarchy and strong visual polish
- mobile-first family discovery and one-hand navigation
- fast, resilient event imagery and graceful fallbacks
- TC / SC / EN consistency
- accessibility, keyboard focus and reduced-motion support
- stable Merchant/Admin workflows
- secure role separation and database RLS
- deterministic CI, authenticated E2E and production smoke gates

Visual polish must never trade away accessibility, SEO, performance, data safety or operational stability.

## Canonical branch

- `main` is the only canonical rebuild branch.
- Do **not** blindly merge `phase-1c-merchant-portal` / PR #3. It is heavily diverged from `main`.
- Production domain cutover remains a separate final action after the remaining external gates below are cleared.
- Obsolete PR #3 (`phase-1c-merchant-portal`) is closed and explicitly marked DO NOT MERGE; the branch is retained only as historical reference.

## Live infrastructure snapshot

- GitHub repository: `familyfunhongkong-game/hkfamilyfun-v2`
- Supabase V2 project: `hkfamilyfun-v2` / `uiyrbqqvgnfhfdhedmav`
- Supabase region: `ap-southeast-1`
- Vercel project: `hkfamilyfun-v2`
- Events: **239**
- Published: **41**
- Current/future published: **13**
- Draft: **111**
- Approved: **1**
- Rejected: **1**
- Archived: **85**
- Profiles: **3**
- Merchants: **2**
- Legacy events migrated into V2: **174**
- `event-images` Storage objects: **35**

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

### Authenticated Merchant/Admin/Auth E2E — PASS

The workflow now runs on every `main` push with concurrency cancellation, so only the newest commit needs to finish. This makes Auth/RLS testing a real release gate rather than evidence from an older commit.

The temporary-data E2E has passed the following production Supabase workflow and cleans up after itself:

- signup trigger creates pending merchant
- legal acceptance audit fields recorded
- merchant password login
- pending merchant cannot create events
- Admin can approve compliant merchant
- approved merchant can create draft
- merchant can upload and delete draft image
- uploaded event image is publicly readable
- merchant can save image reference
- merchant can submit event
- merchant cannot self-publish
- approved-but-unpublished event does not leak publicly
- Admin can publish
- published event is public with i18n + image
- published event route returns HTTP 200
- password recovery changes the login password

Database transaction dry-runs separately confirmed Merchant ownership, Admin access, legal-acceptance protection and self-publish blocking.

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
- all 10 current public events have core Simplified Chinese + English content
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

Supabase Security Advisor still reports:

- **Leaked Password Protection Disabled**

This remains a platform-level password hardening item. Current compensating controls are 12-character passwords, email confirmation, server-side Admin allowlist/RLS, authenticated E2E and a repository-wide CI contract that prevents QR/TOTP/MFA/OTP/OAuth login from being added to the Admin Portal. Do not add web-app QR/TOTP to the Admin Portal unless product requirements change.

Performance Advisor also reports multiple-permissive-policy and unused-index notices. These are optimization findings, not evidence of a current public-data leak. Do not drop indexes or rewrite policies blindly before measuring query plans and preserving RLS behavior.

## Legacy migration reconciliation

The historical dry-run recorded:

- old rows: **182**
- old unique after internal dedupe: **174**
- old duplicate rows removed: **8**
- planned unique migration: **174**

Current V2 production contains exactly **174** records marked `legacy_migration=true`.

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
- Four re-verified legacy activities are now published after source/data correction: Hong Kong Park Arts Corner, Hong Kong Park Morning Bird Watching, PMQ Picture Book Library START FROM HERE, and the 13th Jackfruit Cultural Festival.
- The long-running Bliss Infinite family-support programme remains `approved` but intentionally not public because it is a support service rather than a conventional event.
- other current/future legacy records without recoverable/verified content remain draft/archived and are not publicly exposed.

## Remaining launch actions

### Required before switching `hkfamilyfun.com`

The rebuild application has repeatedly passed the four automated release gates on current `main`:
- HK Family Fun CI — PASS
- HK Family Fun Quality Gate — PASS
- Merchant Auth E2E — PASS
- Production Smoke Test — PASS

The remaining pre-cutover work is now external ownership / final data reconciliation:

1. **Accepted Free-plan limitation:** Supabase leaked-password protection is unavailable on the current Free plan. Current controls remain 12-character passwords, email verification, RLS/Admin allowlist and automated auth/E2E gates. Admin web login remains **email + password only**; no QR/TOTP/web-app 2FA.
2. Connect/read the **old HK Family Fun Vercel account** and confirm where `hkfamilyfun.com` / `www.hkfamilyfun.com` are assigned before any move. The rebuild Vercel team still has **no custom-domain alias** for `hkfamilyfun.com`.
3. Immediately before cutover, run the new **Legacy Delta Sync** workflow in **dry-run** mode using the old Supabase service credential. Review exact legacy IDs, drift, duplicates and planned safe inserts.
4. Only after the dry-run report is accepted, run **safe-apply** with confirmation `SAFE_DELTA_ONLY`. This is insert-only for unseen legacy IDs and cannot auto-publish.
5. Re-run the four automated gates on the post-delta `main` commit.
6. Only then assign `hkfamilyfun.com` / `www.hkfamilyfun.com` to the rebuild and perform post-cutover smoke checks before removing the old assignment.

### Operational configuration status

- **Resend email is configured in Vercel** with `RESEND_API_KEY` and `APPROVAL_EMAIL=info@hkfamilyfun.com`.
- A one-time authenticated production E2E verified the full path: Merchant submission → production notification API → Vercel runtime → Resend → email delivery.
- The normal Merchant E2E has been returned to non-spamming mode; durable in-app notification queueing remains continuously tested.
- Google Calendar Free/Busy is an **optional Planner enhancement**, not a launch blocker. Runtime OAuth configuration and redirect generation are covered by Production Smoke.
- Generative AI remains optional. Without an AI provider key, normalization/social drafting uses safe deterministic fallback instead of blocking Admin operations.
- Google Sheets/Admin Data Hub core workflow remains available through the current connected integration. A Service Account is still recommended later for unattended long-term synchronization.
- The rebuild Vercel project remains on its Vercel staging domain and has not taken over `hkfamilyfun.com`.

### Current live data snapshot

- Events: **239**
- Published: **41**
- Current/future published: **13**
- Draft: **111**
- Submitted: **0**
- Approved: **1**
- Rejected: **1**
- Archived: **85**
- Legacy-migrated records: **174**
- `event-images` Storage objects: **35**

## Content backlog that does not block application launch

- Some draft/archived legacy records still have no recoverable cover image.
- Two current public records previously had no explicit cover URL; resilient branded fallback prevents a broken/blank card, but official imagery should still be added when permission/source quality is clear.
- Continue editorial review of imported and auto-discovered drafts before publication.

## Cutover rule

Do **not** switch `hkfamilyfun.com` to the rebuilt site until the old Vercel domain assignment is confirmed and the final guarded Legacy Delta Sync dry-run is reviewed.

Launch-candidate rule: the candidate is the **latest `main` commit only after CI, Quality Gate, Merchant Auth E2E and Production Smoke all pass on that commit**. Do not rely on a hard-coded SHA in this document.
