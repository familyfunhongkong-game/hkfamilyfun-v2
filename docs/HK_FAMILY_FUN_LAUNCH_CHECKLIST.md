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
- Confirm latest Vercel Preview build is Ready
- Test supplied AIRSIDE SpongeBob PDF import
- Confirm imported dates, time, venue, price, official URL and notes
- Test Merchant real login
- Test Merchant create -> image upload -> drag reorder -> save -> submit
- Test Admin real login -> approve/reject/publish
- Test published event appears on public pages
- Test Google Map iframe on event detail and location explorer
- Test favorite survives reload
- Test share and official-site CTA on desktop + mobile
- Test password reset end-to-end after the latest deployment

## Data / launch blockers
- Read-only inventory of old HK Family Fun Supabase data
- Migrate required legacy events / merchants / accounts where possible
- Reconcile migrated counts and images
- Merge approved Preview changes to `main`
- Connect / switch `hkfamilyfun.com`
- Run production smoke test after domain cutover

## Launch rule
Do not switch the production domain until Merchant + Admin real-login E2E, PDF import, data reconciliation, and public smoke tests all pass.
