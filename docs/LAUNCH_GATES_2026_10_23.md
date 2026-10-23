# HK Family Fun V2 — Current Launch Gate Evidence

**Status checked:** 2026-10-23 (Calgary time)  
**Canonical app:** https://www.hkfamilyfun.com  
**Canonical source:** `familyfunhongkong-game/hkfamilyfun-v2`, branch `main`  
**Do not declare 100% launch-ready or disable maintenance mode until the remaining gates below pass.**

This is a *current operational snapshot*. The 2026-10-10/12 facts in `CUTOVER_RUNBOOK.md` and `HK_FAMILY_FUN_LAUNCH_CHECKLIST.md` remain historical, not authoritative for today's domain ownership or counts.

## Verified, evidence-backed facts

| Area | Confirmed observation |
| --- | --- |
| GitHub main / Vercel deployed SHA | `3c221e48626df5f3617d64ce6342de9a976bb770` |
| Vercel production | `READY` with custom aliases for `www.hkfamilyfun.com` and `hkfamilyfun.com` |
| Live health URL | `https://www.hkfamilyfun.com/api/health` returns `ok=true`, `service=hkfamilyfun-v2`, matching `buildSha` and 31 public events |
| Vercel runtime | Zero runtime error clusters returned in the last 24 hours at time of check |
| Production maintenance | `MAINTENANCE_MODE=true`: public Home and Today show upgrade notice, intentionally not fully open |
| V2 Supabase | `uiyrbqqvgnfhfdhedmav`, `ACTIVE_HEALTHY` |
| Event rows | 267 total: 31 published, 83 draft, 151 archived, 1 approved, 1 rejected |
| Legacy-fingerprint rows | 175 total / 175 distinct `legacy:` fingerprints; **not proof the old database has no newer records** |
| Merchant rows | 1; **not** evidence the merchant can sign in, submit or receive emails |
| Published invalid date intervals | 0 |
| Vercel production URL env | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `NEXT_PUBLIC_API_URL` reference `www.hkfamilyfun.com` |
| Vercel Google Drive callback | Production uses `www.hkfamilyfun.com/api/admin/google-drive/callback`, Preview uses staging hostname |
| Public login route smoke | `/merchant/login` and `/admin/login` respond with login interfaces, not proven authenticated |
| Cookie preferences | User screenshot shows essential-only stored and explicit green success; HTTP consent contract and PR #117 mobile UI passed; not a blanket confirmation of every browser |

### Security fix applied directly to Supabase

**Migration registered in remote Supabase history:** `20261023205227_restrict_merchant_change_history_trigger_execution`.

```sql
REVOKE EXECUTE ON FUNCTION public.record_merchant_event_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_merchant_event_changes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_merchant_event_changes() FROM authenticated;
```

Verified afterward: `anon_execute=false`, `authenticated_execute=false`; the audit function remains attached to **two triggers** (`public.events` and `public.merchants`). Security Advisor no longer reports that publicly callable definer function.

Two other `SECURITY DEFINER` RPCs remain authorized for `authenticated` by design: `review_event_claim` and `review_event_claim_image`; the actual function bodies require `auth.uid()` and `public.is_super_admin()`. Do not revoke these without a full Admin regression test.

Other Advisor notices: leaked-password protection disabled (check current Supabase plan/capability); `site_analytics_events` RLS enabled with no policies (review intentional server-side ingestion; do not invent public policies).

**Schema history caveat:** repository Issue #52 already blocks `npm run db:push` because production migration history is not reconciled with local files. Applying a migration to the remote project is **not** proof that the GitHub migration tree is aligned. Keep the guard enabled and resolve history via official Supabase CLI before attempting any blanket schema push.

## Open GitHub work — do not confuse feature backlog with launch gates

**Production blocker:** [Issue #52](https://github.com/familyfunhongkong-game/hkfamilyfun-v2/issues/52) documents a proven local/remote Supabase migration history mismatch; `db:push` must stay locked.

**Unmerged feature branches / roadmap (not automatically safe to release):**

- [PR #101](https://github.com/familyfunhongkong-game/hkfamilyfun-v2/pull/101) — different weekday/weekend event opening hours, explicitly STAGED/DO NOT MERGE pending schema replay and Admin/Merchant E2E.
- [PR #102](https://github.com/familyfunhongkong-game/hkfamilyfun-v2/pull/102) — moderated community tips feed, requires migration, approval queue, spam/RLS and real review verification.
- [PR #103](https://github.com/familyfunhongkong-game/hkfamilyfun-v2/pull/103) — Saved Events compact/search/filter view, requires reconciling archived event visibility and recurrence ordering.
- [PR #111](https://github.com/familyfunhongkong-game/hkfamilyfun-v2/pull/111) — recurring weekday labels; independent of the more complex day-specific opening-hours schema; requires latest-main sync, current CI and a deliberate release decision.
- [Issue #92](https://github.com/familyfunhongkong-game/hkfamilyfun-v2/issues/92) — authenticated Favorites sync and reliable save analytics (must follow Issue #52; currently browser-local saves must not be misrepresented as server totals).
- [Issues #57](https://github.com/familyfunhongkong-game/hkfamilyfun-v2/issues/57) and [#108](https://github.com/familyfunhongkong-game/hkfamilyfun-v2/issues/108) — discovered event drafts pending **source-specific editorial review**, not automatic publication. Some listed dates are historical; verify before any approval.

Feature PRs are **not** proof of missing current login or event availability; prioritize operational cutover gates over unreviewed feature merges.

## Mandatory gates still not independently verified

| Gate | Owner / evidence required | Stop condition |
| --- | --- | --- |
| Final legacy delta | Access to legacy Supabase `nyutyriuypjznbxtlbmo`; manual GitHub **Legacy Delta Sync dry-run** and review | Don't safe-apply without reviewed duplicate / drift / unsafe row report |
| Migration replay history | Operator / DBA, Supabase CLI migration list and repair on isolated test copy | No `db:push` bypass until Issue #52 reconciled |
| Admin real user flow | Authorized Admin login, draft create/edit/delete, pending queue and event approval | A route displaying login does not prove permissions |
| Merchant real user flow | Approved test merchant login, image upload, create draft, submit, Admin approve, cannot self-publish | Do not run mutable CI E2E against live database |
| Auth/password reset | Merchant and Admin recovery emails complete on live `www` domain | No broken or staging redirect |
| Google OAuth | Google Console **Authorized redirect URIs** + real Calendar/Drive connect | Vercel environment being set alone does not prove Google approval |
| Email | Test Resend delivery and durable notification queue, verify inbox | No automatic claim of successful mail |
| Release/rollback | Old Vercel `family-platform` remains accessible; rehearse rollback path and confirm old Supabase read access | Do not delete old project or move/remove DNS records for guesswork |
| Public launch smoke | Latest main READY, latest SHA / health, robots/indexability, full Home/Today/Events/Map on phone and desktop | `MAINTENANCE_MODE` is still `true` |

## Controlled go-live sequence

1. Confirm owner-approved time window; record site/DB baseline, Vercel deployment ID and current maintenance setting.
2. Put editorial changes on hold; obtain old-project read access; dry-run the final guarded legacy delta; examine and approve the report. Apply safe delta only when warranted, then recheck totals.
3. Verify production Supabase Auth redirect allowlist, Google OAuth callback list, Resend mail, Merchant/Admin approval lifecycle and actual reset emails. No credentials in issue comments or screenshots.
4. Run a **read-only** `Production Smoke Test` against `www.hkfamilyfun.com` and compare `buildSha` to latest `main`.
5. With owner approval only, disable `MAINTENANCE_MODE` in the **Production** environment; redeploy. Check user-facing Home/Today/Calendar/Events/Map, Admin/Merchant, SEO/robots, SSL and error logs.
6. Monitor and be ready to re-enable maintenance or rollback web routing if needed. Preserve the legacy deployment and database until the observation window passes.

## Request to operator

- Connect an authorized read-only path to the old Supabase project or provide the **sanitized** final delta dry-run report (no service-role keys/passwords).
- Complete one controlled Admin and Merchant end-to-end test using accounts they control, and confirm Google OAuth / Resend / password reset actual outcomes.
- Confirm approval to lift the maintenance gate **only once** the above checks are signed off.

**Launch completion is binary:** deployed `READY` and passing CI are necessary, not sufficient. Missing human/legacy data evidence means the site must not be marked 100% launched.
