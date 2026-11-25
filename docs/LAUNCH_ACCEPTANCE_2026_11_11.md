# HK Family Fun V2 — Launch acceptance tracker (2026-11-11)

**State: HOLD release; Production maintenance remains enabled.** This is an evidence-based acceptance tracker, not full-launch approval.

## Verified
- CI / lint / TypeScript / build: PASS on SHA 7f2c3426.
- Quality Gate: PASS on SHA 7f2c3426.
- Cookie POST smoke: PASS on SHA 7f2c3426.
- Anonymous Chromium Desktop / Mobile 320 / 375 / 390: 70/70 PASS on GitHub Action 43018963713.
- Public homepage and search show real event links without visible QA fixtures; no horizontal overflow at checked widths.
- Public event parity: 22 published visible records, 22 cover URLs, 0 QA posts in both Production and Staging on 2026-11-11; selected content/ID hashes matched 2026-11-10.
- Merchant/Auth/Admin approval-publish/recovery: 23 checks PASS on isolated Staging E2E run 42633386999; rerun same suite on candidate before release.
- Membership and Community: six private tables have RLS enabled on both databases; this alone does not verify every role's permissions.
- Published-image last-cover guard: Staging migration installed and tested, Production not yet applied.
- Vercel runtime error clusters: no clusters over recent 48 hours.

## P0 remaining before Production release
1. Real new parent signup confirmation round-trip: first-time mailbox, delivery, click verification, login, logout, password reset, correct redirects.
2. Authenticated two-user cross-device favorites and preferences browser test, including negative RLS paths.
3. Authenticated Community submit photo/consent, private pending state, Admin review, public post, replies and likes; mobile E2E, cleanup.
4. Merchant/Admin real browser clicks and actual notification email deliverability after approval/publishing.
5. Verify public event image reuse rights/provenance and live image loading; external image URL is not proof of permission.
6. Review/apply Production published-image integrity migration safely with rollback and source-pipeline checks.
7. Address Supabase Auth leaked-password protection advisor warning in Staging/Production if supported by account tier.
8. Post-merge release controls: same-SHA CI, controlled migration, rollback point, maintenance-off, real-domain Chrome/cookie/SEO/email smoke.

## Scope limits
- Production/private member/merchant records are not copied into Staging.
- Staging event sync was a one-time public-content snapshot; not continuous sync.
- Existing browser gate is anonymous/read-only and cannot substitute for signed-in end-to-end acceptance.
- Email provider 'delivered' does not prove user completed confirmation.
- Build READY does not mean launch approved.
