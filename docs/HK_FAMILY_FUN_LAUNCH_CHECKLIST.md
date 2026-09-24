# HK Family Fun V2 — Launch Checklist

Updated: 2026-09-24

## Current development branch
- `phase-1c-merchant-portal`
- Production merge to `main` stays blocked until Preview QA passes.

## Completed in code
- Public event list and event detail
- Calendar / Today / Favorites / Location explorer
- Public Google Map display on event detail
- Visible Google Map preview on location explorer
- LocalStorage favorites
- Share actions and official-site CTA
- Merchant registration / login / password reset
- Merchant dashboard
- Merchant create / edit / preview / delete workflow
- Cover + up to 5 gallery images
- Merchant drag-and-drop image ordering
- Admin event and merchant approval workflow
- Supabase RLS/security migrations
- Public sanitized event view
- Expired-event hiding
- Free URL/PDF import pipeline
- Jina Reader no-key fallback for blocked/dynamic/PDF sources
- Optional TinyFish third-level fallback
- Duplicate source-URL protection when saving imported drafts
- Motion hero using the original Family Fun logo asset

## Preview QA still required
- ✅ Latest Vercel Preview build is Ready
- ✅ Public/support route smoke test passed (home, today, calendar, map, tips, merchant pages, legal pages)
- ✅ Motion hero is visible on Preview using the original `/logo.png`
- ✅ Dedicated `/admin/login` is live and database-RPC protected
- ✅ Supplied AIRSIDE SpongeBob PDF is readable by the connected free document extractor and contains the expected main event data
- Test supplied AIRSIDE SpongeBob PDF import through the logged-in Merchant Portal
- Confirm imported dates, time, venue, price, official URL and notes
- Test Merchant real login
- Test Merchant create -> image upload -> drag reorder -> save -> submit
- Test Admin real login -> approve/reject/publish
- Test published event appears on public pages
- ✅ Public event-detail Google Map iframe verified in Preview
- ✅ Visible map-preview panel added to location explorer
- Test location explorer with live client-side event selection on desktop + mobile
- Test favorite survives reload
- Test share and official-site CTA on desktop + mobile
- ✅ Password reset flow confirmed working by user
- Re-test password reset once after final main/production cutover

## Data / launch blockers
- Read-only inventory of old HK Family Fun Supabase data
- Migrate required legacy events / merchants / accounts where possible
- Reconcile migrated counts and images
- Merge approved Preview changes to `main`
- Connect / switch `hkfamilyfun.com`
- Run production smoke test after domain cutover

## Launch rule
Do not switch the production domain until Merchant + Admin real-login E2E, PDF import, data reconciliation, and public smoke tests all pass.

## AIRSIDE SpongeBob PDF regression fixture
Expected primary event fields from the supplied official press release:
- Title: AIRSIDE X 海綿寶寶復活節呈獻「比奇堡滋味派對」
- Start: 2026-03-27
- End: 2026-04-23
- Time: 10:00-22:00
- Venue: AIRSIDE 二樓中庭
- Source contains multiple sub-events, so importer should warn that the document may need to be split into separate activities.
- Main event admission fee is not explicitly stated in the press-release detail block; do not invent a price. Paid DIY/workshop and redemption thresholds belong to separate sub-events.
