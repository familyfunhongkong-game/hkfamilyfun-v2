# HK Family Fun V2 — Launch Checklist

Updated: 2026-09-26

## Current development branch
- `phase-1c-merchant-portal`
- Production merge to `main` remains blocked until authenticated Preview E2E and legacy-data reconciliation pass.

## Completed in code
- Public event discovery, event detail, Today, Calendar, Favorites and Location Explorer
- Search-first public UI with date / district / MTR / age / category / price / indoor / outdoor / SEN / registration / time-of-day filters
- Original user-supplied Family Fun logo used as the canonical web brand asset
- Photorealistic family-lifestyle homepage visuals with AI imagery clearly labelled `AI 示意圖`
- Public event cards resilient to missing/broken images
- Public Google Map display and map explorer
- Merchant registration / login / password reset
- Merchant dashboard
- Merchant create / edit / preview / delete workflow
- Cover + up to 5 gallery images
- Merchant drag-and-drop image ordering
- Merchant event analytics totals and per-event engagement metrics
- Admin event approval / rejection / publish workflow
- Admin merchant approval workflow
- Admin-managed Banner CMS
- Banner image upload, placement, schedule, pause/archive/delete and automatic public expiry
- Public Partner banner placements
- Admin CSV / JSON data export
- Free URL/PDF import pipeline with Jina fallback and optional TinyFish fallback
- Duplicate source-URL protection
- Supabase RLS/security hardening
- Public sanitized event view
- Hong Kong date boundary for public event expiry
- Merchant submission validation for title/date/location/price/action/image
- Privacy-safe event views/clicks/shares analytics
- Event URL/PDF importer SSRF/private-network protections
- Admin noindex/nofollow metadata
- GitHub Actions TypeScript + production-build quality gate
- `package-lock.json` regenerated with the PDF importer dependency
- Quality gate switched back to deterministic `npm ci`

## Verified Preview / infrastructure
- ✅ Latest development branch builds successfully before final documentation commits
- ✅ Vercel Preview deployment path is connected to the development branch
- ✅ Public route smoke tests passed
- ✅ Search/filter regression QA passed
- ✅ Original Family Fun logo visible in public UI
- ✅ Password reset flow previously confirmed by user
- ✅ Supabase `hkfamilyfun-v2` connection restored
- ✅ Supabase project verified as `uiyrbqqvgnfhfdhedmav`
- ✅ Banner database/storage/RLS infrastructure exists
- ✅ Event analytics database/RLS infrastructure exists
- ✅ Current DB integrity check: no event end-date-before-start-date rows

## Authenticated QA still required before production
- Test Merchant real login
- Test Merchant create -> upload images -> reorder -> save -> preview -> submit
- Test supplied AIRSIDE SpongeBob PDF import through logged-in Merchant Portal
- Confirm extracted title, dates, time, venue, price state, official URL and notes
- Test Admin real login
- Test Admin approve / reject / publish
- Test published event appears on public pages
- Test Admin Banner create -> upload -> schedule -> activate -> public display -> pause/delete
- Test Merchant analytics after real public view/click/share
- Re-test Favorites, Share and Official CTA on desktop + mobile
- Re-test Location Explorer client-side selection on desktop + mobile

## Current database snapshot
- Events: 49 total
- Published status: 37
- Merchants: 2 total
- Approved merchants: 1
- Promo banners: 0
- Event image objects: 16
- Invalid date ranges: 0
- Published records whose event dates have already ended: 23
  - These are hidden from the public site by RLS/view date rules; archival cleanup is optional and should not be done blindly before legacy-data reconciliation.

## Security follow-up
- Supabase leaked-password protection is still disabled and should be enabled before production.
- `track_event_metric(uuid,text)` is intentionally callable by public visitors because anonymous public traffic must be able to record privacy-safe aggregate event views/clicks/shares. Supabase flags the SECURITY DEFINER RPC for review; keep the implementation minimal and do not add sensitive reads/writes to that function.
- Do not remove currently-unused indexes merely because the dataset is small; reassess after real production traffic.

## Data / launch blockers
- Read-only inventory of the old HK Family Fun Supabase project
- Decide which legacy events, merchants and accounts must be migrated
- Migrate approved legacy data and media
- Reconcile source/target counts and image availability
- Complete authenticated Merchant/Admin E2E
- Merge approved development branch to `main`
- Switch/connect `hkfamilyfun.com`
- Run final production smoke test and auth reset test

## Launch rule
Do not switch the production domain until Merchant + Admin authenticated E2E, PDF import QA, legacy-data reconciliation and public smoke tests all pass.

## AIRSIDE SpongeBob PDF regression fixture
Expected primary event fields from the supplied official press release:
- Title: AIRSIDE X 海綿寶寶復活節呈獻「比奇堡滋味派對」
- Start: 2026-03-27
- End: 2026-04-23
- Time: 10:00-22:00
- Venue: AIRSIDE 二樓中庭
- Source contains multiple sub-events, so importer should warn that the document may need to be split into separate activities.
- Main event admission fee is not explicitly stated in the press-release detail block; do not invent a price. Paid DIY/workshop and redemption thresholds belong to separate sub-events.
