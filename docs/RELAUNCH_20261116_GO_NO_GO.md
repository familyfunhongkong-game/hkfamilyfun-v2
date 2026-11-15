# HK Family Fun Rebuild V2 — November 16, 2026 Go / No-Go

**Status: HOLD / NO-GO until live Auth email and operational evidence below passes. This file supersedes the older 2026-11-11 acceptance baseline and 2026-11-12 runbook where counts or migration state conflict. Do not enable Production or merge PR #171 into `main` automatically.**

## Source of truth at November 15
- Repository: `familyfunhongkong-game/hkfamilyfun-v2`.
- Candidate: PR #171, branch `release/rebuild-v2-launch-candidate-20261109`, integrated via PR #173 on November 15.
- Equivalent tested code tree: `b9ef944cecd225a41a037f188872d60607eb46d3` on tested SHA `0fa39223ecdfe33bb2abc5b03a1d5e3af85120c2` and candidate merge SHA `2695974979dd91773aca0be15d1f6bd592bb08d9`. The two commits have **identical Git tree hashes**. Recheck tree on any subsequent commit.
- Latest completed CI: [Run 43769663959](https://github.com/familyfunhongkong-game/hkfamilyfun-v2/actions/runs/43769663959): **five same-SHA jobs passed** (Verify, Parent, Merchant, Community, Anonymous desktop/mobile). Anonymous browser report: **70/70 checks PASS**. Screenshots are in GitHub Actions artifacts. The **parent suite verifies a real non-admin JWT cannot execute both admin claim-review SECURITY DEFINER RPCs**.
- Main `12de8cf60289a19d902f0ee0c5e90c6e6f94cb55` as checked November 15; do not assume unchanged at release time.
- Production Maintenance Mode has not been lifted by this work. Do not infer release from Vercel Preview READY.

## Data
- Production Supabase `uiyrbqqvgnfhfdhedmav`; Staging `gwoiocllrgdwuxzibcuu`.
- Production: **68 published records**, of which **64 published events overlap 2026-11-16 through 2027-04-01**, and only **six** have reliable lat/lon within this scope.
- Images: **19 external organization / official URLs**, **45 original generic `/images/verified-event-placeholder.svg` covers**. An externally hosted organizer image is **not** proof of commercial reuse rights. The two 2026 Discovery Bay Christmas market events currently reference archived 2023 `handmadehongkong.com` image filenames; avoid representing them as actual 2026 photos.
- AI generation request attempted but IMAGE GENERATION FAILED on November 15. **No AI images have been produced or seeded.** Do not mark the generic fallback as AI-generated. `components/resilient-event-image.tsx` now automatically overlays **“AI 示意圖 · 非活動實景”** on successfully loaded covers from controlled `/images/ai-event-covers/` or `hkff-ai-event-covers` paths.
- Source-first Event Image Admin QA for unpublished drafts already exists, including rights acknowledgment; do not automatically publish scraped organizer photos or rewrite event identity.
- Production **Published Media Guard now installed** via migration `relaunch_guard_published_event_media_parity_20261115`, same function as Staging `guard_live_published_event_media`, actual trigger `guard_live_published_event_media_trigger`. 68 published remain intact, zero lack image paths. Both environments passed an SQL negative test attempting to delete a published event's last image in a caught-exception DO block. **DO NOT reapply old staging migration or rerun this DDL in Production.** Rollback, only if specific regression: `BEGIN; DROP TRIGGER IF EXISTS guard_live_published_event_media_trigger ON public.events; DROP FUNCTION IF EXISTS public.guard_live_published_event_media(); COMMIT;`.

## P0 external / real-user gates still OPEN
1. **Public member signup** using an actual deliverable inbox, email confirmation link click, sign in, logout, and forgot-password link click through to successful 8+ character reset. An Admin-created confirmed test user **does not verify this flow**, nor server-side password policy. Historical Staging `@example.com` mail failed with SMTP 550.
2. **Branded hosted Supabase Auth email templates**: source HTML is committed at `supabase/templates/confirmation.html` and `supabase/templates/recovery.html`, original-logo hash verified. But this source code **does not update hosted Supabase Auth**; source-only is NOT a PASS. Configure Staging via Dashboard Authentication -> Email Templates or the manually approved `.github/workflows/auth-email-branding-manual.yml` with correctly configured secret. Read back hosted settings and prove **actual received HTML includes original Logo**. Do the same for Production with explicit approval.
3. **Merchant/Admin notification delivered** in a fresh run at current approved SHA. Current Merchant E2E verifies in-app notification queue with `REQUIRE_NOTIFICATION=false`, **not outbound delivered email**. Verify actual recipient, proper redirect and mail branding, no secrets in logs.
4. **Published images**: confirm the 19 external covers' reuse permission/copyright provenance or replace with an accurate first-party generic fallback. In particular, replace/archive outdated imagery so 2026/2027 events do not appear to use earlier-year posters. Generate original AI images only once the generation system is available, only with clear “AI 示意圖” label. User's 45 generic covers are functional placeholders, not visually finished event image seeding.
5. **Supabase Auth leaked password protection** still listed by security advisor. Determine available account tier and enable if supported; otherwise document acceptance and enforce appropriate password policy. Two callable SECURITY DEFINER claim-review RPCs still generate linter WARN despite confirmed ordinary-member rejection; retain authenticated negative E2E and review least privilege.
6. **Production DB backup / tested restore, rollback point and permissioned release procedure** need operator evidence. Do not claim a migration rollback SQL file equals a full DB backup.

## Exact safe release sequence
1. Finish P0 external gates with actual Inbox + Auth + Merchant/Admin delivery and image-rights evidence. Collect screenshots and no secrets.
2. Save current Production backup and existing Vercel deployment ID/SHA. Verify restore access and migration history. Confirm Production and Staging secrets cannot cross environments.
3. Recheck PR #171 head, exact code tree, GitHub required CI, Supabase roles and deployed SHA. Merge PR #171 to `main` only after explicit Go/No-Go signoff.
4. Keep maintenance ON during internal Production deployment smoke. Verify health SHA, direct public event images, login/confirmation/recovery redirects, private role isolation, Merchant/Admin flow, Cookie, SEO and robots.
5. Lift MAINTENANCE_MODE only after passing Production smoke. Verify the live `www.hkfamilyfun.com` domain on actual 320/375/390/1440 screens, and monitor failures. On regression restore maintenance and previous deployment. Trigger schema rollback only if the new media guard specifically caused issue.

**Runbook owner decision:** as of the last evidence in this document, **NO-GO**. Candidate readiness is not equivalent to public-release approval.
