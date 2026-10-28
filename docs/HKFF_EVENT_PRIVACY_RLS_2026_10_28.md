# HK Family Fun — Public Events RLS Cutover, 2026-10-28 UTC

## Scope and provenance

Production Supabase project: `uiyrbqqvgnfhfdhedmav`; isolated staging: `gwoiocllrgdwuxzibcuu`.

**Already applied to production:** `20261028041148_restrict_signed_in_published_event_base_select_20261028`. This is a provenance record, not an instruction to replay the migration. The `db:push` guard in Issue #52 remains mandatory.

- Root issue: a generic `authenticated` user could read all columns of unrelated `published` rows in the base `public.events` table, including AI extraction and Admin review data.
- The shipped app now uses an independent `publicSupabase` client with `persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false` on public Home/Today/Calendar/Events/Event Detail/Saved/Map/Planner reads.
- The public select policy on `public.events` now applies **only to anon**; merchant-own and platform-admin SELECT policies were not changed.
- Both public views remain `security_invoker=true` and filter to `published`, valid dates, and not hidden, with their existing explicit public field projections.

## Tests performed

Staging role impersonation within `BEGIN / ROLLBACK` verified:
- An unauthenticated role can read the published sample through `public_events_i18n`, not drafts.
- An unrelated authenticated role sees zero base event rows.
- A merchant's signed-in role can see and submit its own draft.
- A platform Admin can approve and publish the merchant's submitted event.
- Published events then appear in the anon view.
- Staging sample auth users, merchants and events from this role test were rolled back.

Immediately after production migration:
- Production policy roles: `{anon}`.
- Anonymous public view rows: **24**.
- Simulated unrelated authenticated user: **0** visible base events.
- Production published: **24**, archived: **161** (unchanged).
- HTTPS `https://www.hkfamilyfun.com/api/health` returned `ok=true` and 24 public events on deployed SHA `96e3935b39367d7ee14311686450ff6740cc40aa`.
- Supabase Advisor: no new warning; existing intentional/private RLS INFO, Admin-gated review RPC WARN, and leaked-password-protection WARN remain.

## Explicitly not yet proven

- Real login/logout/password reset in both browsers and mobile.
- Browser image-upload and service-client-only backend endpoints under isolated QA credentials.
- All previously created live merchant accounts and pending claims.
- Complete production restoration and `supabase migration repair`.

## Rollback (only if a verified regression occurs)

Perform a reviewed Supabase DDL migration restoring:
```sql
ALTER POLICY "Public can view published events"
  ON public.events TO anon, authenticated;
```
This rollback restores the former **privacy risk**; do not use casually. Recheck policy, Admin/Merchant access, public view and health immediately. Never change Maintenance Mode as part of this rollback.

## Release decision

Production `MAINTENANCE_MODE=true` remains. This patch closes the public-event base-column exposure for unrelated signed-in users without altering event rows. Do not describe as a full security certification. Do not re-enable `db:push` until Issue #52 migration drift is reconciled.
