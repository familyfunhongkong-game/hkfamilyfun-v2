# HK Family Fun V2 — Launch Checklist

Updated: 2026-10-01

## Canonical branch
- `main` is the current canonical working branch.
- Do not blindly merge `phase-1c-merchant-portal`: it is heavily diverged from `main` and PR #3 is stale.
- Production domain cutover remains blocked until authenticated E2E, legacy-data reconciliation and production smoke tests pass.

## Current live infrastructure snapshot
- GitHub repository: `familyfunhongkong-game/hkfamilyfun-v2`
- Supabase project: `hkfamilyfun-v2` (`uiyrbqqvgnfhfdhedmav`) — ACTIVE_HEALTHY
- Supabase region: `ap-southeast-1`
- Events: 232 total
- Published: 37
- Draft: 104
- Archived: 85
- Rejected: 1
- Profiles: 3
- Merchants: 2
- `event_images` table rows: 0
- Supabase security advisor: leaked-password protection still disabled

## Core product scope that must remain working
- Public event discovery, Today, Calendar and nearby map
- Traditional Chinese-first UI with TC / SC / EN support
- Persistent language selector (繁 / 简 / EN) with server-side cookie storage
- Date / district / MTR / age / category / price / free / SEN filters
- Event details with official registration / source CTA
- Merchant registration / login / password reset
- Merchant create / edit / preview / submit / delete
- Merchant image upload and event management
- Admin merchant approval
- Admin event CRUD, approve / reject / publish
- Admin-managed promotional banner workflow
- URL / PDF event import
- CSV / JSON export
- Privacy-safe event analytics
- Hong Kong date boundary handling
- Supabase RLS and role separation

## Verified / recently hardened
- Map cards and viewport-only filtering updated on main
- Merchant password recovery session check hardened
- Merchant password UI aligned with 12-character policy
- Axios security patch upgraded
- Supabase project is healthy
- RLS/security work remains in place
- Quality gate restored to main on 2026-09-30
- Core i18n database fields added for title / short description / description / venue / address (SC + EN)
- Security-invoker public i18n view added and anon-tested: 0 non-published events exposed
- Current 10 active published events backfilled with SC + EN titles and descriptions
- Home / Today / Calendar shell and event content now read selected locale with TC fallback
- Public Events search now searches TC / SC / EN content and renders localized event content
- Public Event Detail now renders localized event content
- Merchant event editor can save TC / SC / EN title, descriptions, venue and address
- Admin event review includes language completeness checks and language readiness badges
- Latest checked Vercel deployment for merchant trilingual editor reached READY
- Vercel runtime errors: none found in the last 24 hours at the time of this update

## Required before public domain cutover
- GitHub quality gate must pass on latest main
- Merchant authenticated E2E:
  - login
  - create event
  - upload images
  - edit
  - preview
  - submit
- Admin authenticated E2E:
  - login
  - merchant approval
  - event approve / reject / publish
- URL/PDF import regression test
- Confirm published event appears correctly on public site
- Mobile + desktop smoke test: Home / Events / Today / Calendar / Map / Event Detail
- Verify official CTA / share / favorite flows
- Verify password-reset flow end-to-end
- Reconcile old HK Family Fun data and media before destructive cleanup
- Fix or explicitly accept every remaining production security warning
- Confirm Vercel deployment access and production deployment status
- Only then connect / switch `hkfamilyfun.com`

## Current known blockers / risks
1. Vercel project/deployment listing is now available and latest deployments can be verified as READY, but direct deployment-page fetch/smoke-test access through the connector is still denied. Do not change domain/DNS until browser-level production smoke testing is completed.
2. PR #3 (`phase-1c-merchant-portal` -> `main`) is draft and heavily diverged; do not merge it as a launch shortcut.
3. Supabase leaked-password protection is still disabled.
4. Database now contains 232 events, substantially more than the prior 49-event snapshot; legacy/import reconciliation is required before cleanup.
5. `event_images` table has 0 rows while event image objects exist in storage, so image/media linkage must be verified against the actual storage/object workflow before launch.
6. Automated translation is not yet enabled. Planned low-cost path: OpenCC-compatible TC→SC conversion locally; optional Azure Translator F0 for EN at create/update time only. Public rendering always falls back to TC so translation outages cannot blank event pages.

## Launch rule
Do not switch `hkfamilyfun.com` to the rebuilt site until the latest `main` build passes, authenticated Merchant/Admin E2E passes, data/media reconciliation is complete, and final public smoke testing is clean.
