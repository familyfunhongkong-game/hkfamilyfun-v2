# HK Family Fun — Nov 13, 2026 Relaunch Gate / P0 UX Fix

**As of Nov 12:** PR #173 is a non-production release-candidate patch. No production promotion is authorized by this document. Parent / Merchant / Admin / Community acceptance remains mandatory; READY is not enough.

## Changes already implemented in branch
- Parent signup and parent password reset require **8–72** characters. Parent login is not gated by a registration-only minimum. Merchant/Admin recovery password policy remains unchanged.
- Public event detail and quick-facts card: date range can wrap without clamp; full-width date line on mobile; time no longer competes for half-width.
- Public compact/full event cards and public search results display complete cross-year date ranges.
- Stale `free` flags cannot override explicit positive HKD ticket prices in main event mapper and search filters.
- Prebuild script `scripts/check-relaunch-password-date-layout.mjs` checks registration/reset minimum, complete date markup, cross-year formatting and PMQ price conflict.

## PMQ verified source / one-record correction
Official PMQ source https://www.pmq.org.hk/event/pmq-picture-book-library-start-from-here/?lang=ch lists 23 Apr 2026 – March 2027, Wed–Sun 13:00–18:00, day ticket HK$20, pass HK$80.
Event UUID `5704bdb8-93b8-41af-b943-1530741f0747` had `price_type='free'`, `is_free=false`, `price_label='日票 HK$20；通行證 HK$80（指定展覽時段）'` in both staging and production. **Staging corrected** to `price_type='paid'` on Nov 12; **Production still unchanged** pending release and explicit migration/rollback.
Production release SQL must be exact-row guarded, preflight-read, logged, and only after approval:
```sql
update public.events
set price_type = 'paid', updated_at = now()
where id = '5704bdb8-93b8-41af-b943-1530741f0747'
  and price_type = 'free'
  and is_free = false
  and price_label = '日票 HK$20；通行證 HK$80（指定展覽時段）'
returning id, price_type, is_free, price_label, updated_at;
```
Expected **exactly one row**; anything else STOP. Rollback to `price_type='free'` only if explicitly reverting this correction after checking the recorded pre-image; doing so also restores the known misleading fee bug and is not a normal business rollback.
Do not replace official public date 2027 March with invented '10 March' without clarifying PMQ's machine timestamp vs displayed publication.

## No-Go gates (each requires real evidence on the same candidate SHA)
1. TypeScript, lint, prebuild + all quality scripts, Vercel exact-SHA build, dependency/security review.
2. Parent **7 characters rejected, 8 and 10 accepted**, confirmed-mail round-trip, login, logout, recovery email, update password and old account login; Supabase Auth server-side min8 configuration checked in both environments.
3. Two real independently authenticated parents, cross-device cloud saved events, signed-out cache clear, RLS cross-user denied.
4. Merchant registration/import/submit/withdraw and Admin review/approve/reject/publish; no HTTP 401 from Preview Protection. Test source uploads and image rights. No unauthorised auto-publish.
5. Community posting image/consent + private pending, Admin approval, public visibility, photo restrictions, reply, like, complaint and moderation plus negative RLS.
6. Event routes: homepage, Today, Search, Calendar, Map, Event detail, Favorites, Planner; age/SEN/free/paid/MTR/district; past/future, recurring and cross-year; HK time zone; no duplicate/expired data; PMQ correct paid label.
7. Screenshot-based Chrome/Android and Safari/iPhone at **320, 375, 390, 768, 1440px**: date not truncated, hero poster available in full, no horizontal overflow; bottom nav & sticky CTA not overlapped with safe area; TC/SC/EN and accessibility.
8. Email confirmation, reset, merchant approval notifications; Cookie choice and persistence; SEO/canonical/schema & metadata, image copyright/provenance; pricing correctness.
9. Staging and Production RLS policies/advisors, migration parity + migration lock status, backup and exact commit rollback, no secrets in public build, deploy only to approved project.
10. Once all green: founder explicit Go, promote exact tested SHA, guarded data patch, disable Maintenance Mode, live-domain smoke Chrome/mobile/SEO/cookie/real email and monitor errors.

## Comparator UX — after P0 passes, no risky redesign right before release
- Klook: visible primary action, decision-making price/tickets above fold, concise merchant info and trust.
- Hong Kong Tourism Board Events & Festivals: Today/This Week/This Month and month navigation, Family-Friendly filter.
- Eventbrite: This Weekend / Free/Paid / Save/Share, progressive filters and clear ticket route.
- HK Family Fun advantage: age + district + MTR + SEN + free/NGO filters, accurate verified official sources. Prefer **one-click search and direct official booking** for relaunch; do not claim in-platform payment if untested.
