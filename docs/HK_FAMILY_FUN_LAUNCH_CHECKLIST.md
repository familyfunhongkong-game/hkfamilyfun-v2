# HK Family Fun V2 — Launch Checklist

Updated: 2026-09-30

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
1. Vercel connected account can see the HK Family Fun team, but current connector returns 403 when listing deployments. Do not change domain/DNS until access is restored.
2. PR #3 (`phase-1c-merchant-portal` -> `main`) is draft and heavily diverged; do not merge it as a launch shortcut.
3. Supabase leaked-password protection is disabled.
4. Database now contains 232 events, substantially more than the prior 49-event snapshot; legacy/import reconciliation is required before cleanup.
5. `event_images` table has 0 rows, so image/media linkage must be verified against the actual storage/object workflow before launch.

## Launch rule
Do not switch `hkfamilyfun.com` to the rebuilt site until the latest `main` build passes, authenticated Merchant/Admin E2E passes, data/media reconciliation is complete, and final public smoke testing is clean.
