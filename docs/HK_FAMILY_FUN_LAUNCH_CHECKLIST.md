# HK Family Fun V2 — Launch Checklist

Updated: 2026-10-02 (America/Edmonton)

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

## Live infrastructure snapshot

- GitHub repository: `familyfunhongkong-game/hkfamilyfun-v2`
- Supabase V2 project: `hkfamilyfun-v2` / `uiyrbqqvgnfhfdhedmav`
- Supabase region: `ap-southeast-1`
- Vercel project: `hkfamilyfun-v2`
- Events: **236**
- Published: **37**
- Current/future published: **10**
- Draft: **108**
- Approved: **5**
- Rejected: **1**
- Archived: **85**
- Profiles: **3**
- Merchants: **2**
- Legacy events migrated into V2: **174**
- `event-images` Storage objects: **30**

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
- merchant review / approval
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

### Production smoke — PASS baseline

The production smoke gate has successfully verified:

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
- one live published event detail
- locale persistence cookie
- anonymous import/translation writes rejected with 401
- Vercel staging remains `noindex`

The smoke workflow now skips superseded commits instead of treating cancelled obsolete Vercel deployments as product failures.

## Security / data verification

- public i18n view is `security_invoker` + `security_barrier`
- anonymous public view test exposed **0 non-published events**
- all 10 current public events have core Simplified Chinese + English content
- Merchant cannot modify another merchant's non-public events
- Merchant cannot modify legal acceptance audit fields
- Merchant cannot directly publish
- Admin review/publish permissions are enforced separately
- Vercel runtime error checks have recently reported **0 runtime errors**

### Remaining Supabase security action

Supabase Security Advisor still reports:

- **Leaked Password Protection Disabled**

This requires an Auth dashboard setting and should be enabled before final domain cutover if the Supabase plan supports it.

Performance Advisor also reports multiple-permissive-policy and unused-index notices. These are optimization findings, not evidence of a current public-data leak. Do not drop indexes or rewrite policies blindly before measuring query plans and preserving RLS behavior.

## Legacy migration reconciliation

The historical dry-run recorded:

- old rows: **182**
- old unique after internal dedupe: **174**
- old duplicate rows removed: **8**
- planned unique migration: **174**

Current V2 production contains exactly **174** records marked `legacy_migration=true`.

Reconciliation checks:
- migrated unique count: **174 / 174**
- duplicate legacy source fingerprints found: **0**
- missing title: **0**
- invalid date ranges: **0**
- known missing start date: **1**
- migrated records attached to new Merchant accounts: **0** by design

Current/future legacy content:
- 5 `approved` legacy events are current/future and all 5 have covers
- other current/future legacy records without covers are kept as draft/archived and are not publicly exposed

Do not automatically publish the 5 approved legacy events without re-checking the organizer's current official information.

## Remaining launch actions

### Required before switching `hkfamilyfun.com`

1. Latest `main` must finish with CI + Quality + Production Smoke green after the final code/document commit.
2. Run a final visual mobile + desktop review of Home / Events / Today / Calendar / Map / Event Detail after all UI changes. The HTTP smoke gate does not replace a visual regression pass.
3. Run an authenticated integration regression for URL import and direct PDF upload. PDF parsing depends on the external Jina Reader service.
4. Enable or explicitly accept the Supabase leaked-password-protection warning.
5. Review the two existing Merchant records before launch. At least one is an older test/grandfathered record without the newer Terms/Privacy acceptance timestamps.
6. Re-check the 5 hidden `approved` legacy events before choosing whether to publish them.
7. Confirm final domain ownership/DNS/Vercel assignment, then move `hkfamilyfun.com` only after the gates above pass.

### Operational configuration still outstanding

- Production Merchant submission currently succeeds even if notification email fails.
- The authenticated E2E reported `RESEND_API_KEY not configured`; if Admin email notification is required at launch, configure Resend in the Vercel production environment and rerun the notification gate.
- Azure Translator is optional and is **not** a launch dependency. Without Azure keys, Merchant/Admin can still enter all TC / SC / EN fields manually and public pages fall back safely to TC.

## Content backlog that does not block application launch

- Some draft/archived legacy records still have no recoverable cover image.
- Two current public records previously had no explicit cover URL; resilient branded fallback prevents a broken/blank card, but official imagery should still be added when permission/source quality is clear.
- Continue editorial review of imported and auto-discovered drafts before publication.

## Cutover rule

Do **not** switch `hkfamilyfun.com` to the rebuilt site until the final latest-main automated gates are green and the remaining required external actions above are explicitly cleared.
