# HK Family Fun V2 — Production release blocker audit (2026-10-17)

This is an evidence-based read-only audit, **not** approval to cut over the legacy domain or push migrations.

## Verified live state
- GitHub canonical repo: `familyfunhongkong-game/hkfamilyfun-v2`, branch `main`.
- Vercel production `main` commit `70e59584f526a8e939c1ddb9cfdbafcd4d597918` reported **READY** at inspection. READY does not prove Admin/Merchant end-to-end usability.
- Supabase project `uiyrbqqvgnfhfdhedmav` reports **ACTIVE_HEALTHY**.
- Live event counts on inspection: published **33**, draft **83**, approved **1**, rejected **1**, archived **146**, total **264**.
- Among 33 published events, **0** have an explicit end date before today's Hong Kong calendar date; this does not independently verify organizer cancellations.
- Existing `public.events` has `recurrence_weekdays` but does **not** yet have `weekly_opening_hours`.
- `public.events` has row-level security enabled.
- `record_merchant_event_changes()` is a `SECURITY DEFINER` trigger returning `trigger`, but `anon` and `authenticated` currently have `EXECUTE` privilege; Supabase Security Advisor flags this. Verify intended trigger invocation and revoke public RPC execute rights safely through a reviewed migration. Re-test audit afterwards.

## Launch-critical gates (not yet passed)
1. Compare the actual Supabase CLI local migration list to remote migration history, reconcile issue #52 with a verified backup and disposable replay. **Do not bypass `npm run db:push` guard or rewrite live migration history blindly.**
2. Review permissions before enabling staged `weekly_opening_hours`: the staged migration grants `SELECT (id, weekly_opening_hours)` on base `public.events` to `anon` and `authenticated`. Existing privacy controls intentionally restrict direct anonymous reads; audit the RLS/security model and use an explicitly minimal public schedule API instead of broadening exposure accidentally.
3. Bring `feat/weekday-opening-hours-safely-staged` up to date with `main`, preserve subsequent commits, and pass CI in preview. **Do not blindly merge diverged branch.**
4. Test date overrides, weekday/weekend hours and closure precedence on both Today and Event Detail. Validate publication workflow, image upload, Admin approval and Merchant ownership using a **non-production** test environment.
5. Confirm domain DNS/SSL, public redirects, original logo, analytics/privacy, SEO and reliable rollback before custom-domain cutover.

## Safety interpretation
- A Vercel READY status is only a deployment state.
- A green database health state is not a passing authorization audit.
- Historical successful E2E tests do not replace tests of the current commit.
- Do not modify the legacy site or domain before the new site clears release gates.

Relevant issues and guidance:
- https://github.com/familyfunhongkong-game/hkfamilyfun-v2/issues/52
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
