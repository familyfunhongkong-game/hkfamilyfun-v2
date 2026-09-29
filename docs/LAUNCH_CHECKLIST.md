# HK Family Fun V2 — Launch Checklist

_Last updated: 2026-09-29_

## 1. Production safety

- [x] Rebuild is isolated from the legacy production domain.
- [x] Do not switch `hkfamilyfun.com` until every launch blocker below is complete.
- [x] Public events come only from the `public_events` view.
- [x] Hong Kong date/time logic uses `Asia/Hong_Kong`.
- [x] Merchant users cannot self-publish events.
- [x] Merchant users cannot edit other merchants' events.
- [x] Merchant users cannot self-approve their merchant account.
- [x] Merchant-controlled legal/review fields are protected at database level.
- [x] Admin event workflow is two-stage: `submitted -> approved -> published`.

## 2. Legacy migration

- [x] Legacy activities inventoried: 182.
- [x] Internal legacy duplicates excluded: 8.
- [x] Unique legacy activities migrated: 174.
- [x] Merchant login accounts were NOT bulk-created from legacy placeholder merchants.
- [x] Legacy events were safety-gated before public publishing.
- [x] HOLD legacy review items moved back to draft.
- [x] READY legacy review items remain approved for manual publish review.
- [x] No legacy migrated event is automatically public.
- [ ] Legacy Storage recovery for old archived/draft images is optional and remains incomplete while the old project's egress is restricted.
- [ ] Final delta sync from legacy production immediately before domain cutover.

## 3. Merchant Portal

- [x] Merchant registration.
- [x] Email confirmation messaging.
- [x] Business profile stored once and reused.
- [x] Merchant Terms + Privacy acceptance timestamp/version audit trail.
- [x] Pending merchant cannot create events.
- [x] Approved merchant can create draft events.
- [x] Draft/rejected events are editable.
- [x] Submitted/approved/published/archived events are merchant read-only.
- [x] Submit validation matches database requirements.
- [x] Merchant cannot self-publish or edit another merchant's event.
- [x] Admin merchant approval requires business name, contact name, email, Terms and Privacy acceptance.
- [x] Admin receives pending merchant/event notification workflow in code.
- [x] Merchant receives approval/rejection/event status notification workflow in code.
- [x] Notification requests use idempotency keys to prevent duplicate emails.
- [ ] Configure Resend runtime secrets in Vercel and run authenticated end-to-end notification test.

## 3A. Event scheduling

- [x] Weekly recurring event model added with weekday/include/exclude dates.
- [x] Public Today/Tomorrow/Week/Weekend filters respect recurrence.
- [x] Calendar and Planner respect recurrence instead of treating date ranges as daily events.
- [x] Merchant editor and Admin review support recurring schedules.
- [x] Database rejects invalid weekly schedules and end dates earlier than start dates.

## 4. Admin

- [x] Merchant approval center.
- [x] Event approval center.
- [x] Approved and Published are separate states.
- [x] Rejection reason shown to merchant.
- [x] System Health page added.
- [x] Admin cannot accidentally approve a merchant missing legal acceptance.
- [x] Publish gate checks critical event data.
- [x] Authenticated workflow E2E passed against real Supabase Auth/RLS: pending merchant -> admin approve -> draft -> submit -> merchant self-publish blocked -> admin approve -> not public -> admin publish -> public. Test user/event/merchant cleanup verified.

## 5. Automatic event discovery

- [x] Daily GitHub Actions discovery workflow.
- [x] Draft-only import; never auto-publish.
- [x] URL/fingerprint dedupe.
- [x] Official source allow-list.
- [x] Image content-type validation.
- [x] HK geocoding support.
- [x] GitHub approval issue fallback.
- [x] Resend approval-email support.
- [x] Family relevance tightened to reduce generic-page false positives.
- [x] Automation scripts included in CI syntax checks.
- [x] Scheduled discovery reviewed; one old-revision false positive was identified, and the latest family filter dry-run accepted 0/20 generic candidates with zero database writes.

## 6. Email

- [x] Resend domain `hkfamilyfun.com` verified.
- [x] DKIM verified.
- [x] SPF verified.
- [x] Sending MX verified.
- [x] Tracking CNAME verified.
- [x] Test approval email was received through the existing `info@hkfamilyfun.com` forwarding route.
- [x] Sender standardized to `HK Family Fun <no-reply@hkfamilyfun.com>`.
- [x] Reply-To remains `info@hkfamilyfun.com`.
- [ ] Vercel Production + Preview env: `RESEND_API_KEY`.
- [ ] Vercel Production + Preview env: `APPROVAL_EMAIL=info@hkfamilyfun.com`.

## 7. Google Calendar / Planner

- [x] Planner uses Hong Kong date/time.
- [x] Cantonese browser speech input is implemented.
- [x] Google Calendar add-event links use Hong Kong timezone.
- [x] OAuth scope reduced to `calendar.freebusy`.
- [ ] Google Cloud OAuth client setup.
- [ ] Vercel env: `GOOGLE_CLIENT_ID`.
- [ ] Vercel env: `GOOGLE_CLIENT_SECRET`.
- [ ] Vercel env: `GOOGLE_TOKEN_ENCRYPTION_KEY`.
- [ ] Vercel env: `GOOGLE_REDIRECT_URI=https://hkfamilyfun-v2.vercel.app/api/google-calendar/callback`.
- [ ] Add final `hkfamilyfun.com` callback only at domain cutover.

## 8. Security

- [x] Public table RLS reviewed.
- [x] Merchant event RLS attack tests passed.
- [x] Merchant profile self-approval attack tests passed, including attempts to supply legal timestamps and self-approve.
- [x] Admin approve/publish DB flow tests passed.
- [x] Merchant cannot overwrite admin rejection/review fields.
- [x] Trigger-only SECURITY DEFINER merchant approval function is no longer externally executable by anon/authenticated roles.
- [x] Password reset requires a PASSWORD_RECOVERY event.
- [x] GitHub CI runs automation syntax check, dependency security audit, TypeScript check and Next.js build.
- [ ] Production runtime dependency audit must be green before domain cutover.
- [ ] Supabase Auth: enable Leaked Password Protection.
- [x] Authenticated Supabase security/E2E test passed with real user session and public client; temporary test records were fully cleaned up.
- [ ] After domain cutover: rotate/revoke legacy Supabase secrets and remove obsolete developer access.

## 9. Domain cutover — LAST

Do not change the production domain until all required items above are green.

Cutover sequence:

1. Final legacy delta sync.
2. Final public/Admin/Merchant E2E.
3. Confirm Resend runtime notifications.
4. Confirm Google Calendar OAuth if included in launch scope.
5. Confirm Supabase security settings.
6. Add production domain to the correct Vercel project/team.
7. Update IONOS web DNS only after the V2 deployment is verified.
8. Verify HTTPS, redirects, canonical URL and callback URLs.
9. Keep the old system available briefly for rollback.
10. Rotate/revoke legacy credentials only after the new production system is stable.
