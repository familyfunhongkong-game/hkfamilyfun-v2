# HK Family Fun Rebuild V2 — verified staging hardening & P0 run (2026-11-16 HKT)

## Scope
This document is an audit record only, not Production release approval. Production remains under the existing maintenance/release HOLD.

## Evidence checked in live connected systems
- GitHub repository: `familyfunhongkong-game/hkfamilyfun-v2`, release branch `release/rebuild-v2-launch-candidate-20261109`.
- The earlier 2026-11-15 68-published snapshot is superseded. Live Production: **115 published rows**, **113 not expired** from 2026-11-16; Staging: **116 published rows**, one of which is an internal `[QA]` fixture excluded from the public view.
- Live public view: 115 rows in each environment; zero `[QA]` titles exposed.
- Active publicly intended event data: 113 rows in each environment (excluding QA), zero missing title, dates, venue/location, source URL, image cover and zero paid/free cross-field contradictions at the check time.
- Only 6/113 current publicly intended records in either environment have confirmed latitude/longitude. Do NOT fabricate geocodes; prioritize official venue/address verification before enabling precise map pins.

## Staging image-rights hardening actually applied
- 16 current/future published Staging records with externally hosted cover images and no recorded reuse permission were switched to existing first-party category illustration files, using an exact-count preflight and transaction.
- 16 original external cover URLs and any original gallery URLs are preserved inside each affected record's private `admin_review_note` under `[STAGING RIGHTS-SAFE COVER QA 2026-11-16 — ORIGINAL RECOVERY]` for a reversible audit.
- Readback: **0 remaining external cover URLs** and **66 current published records with first-party AI illustration SVG covers**. One published QA fixture still has no image but remains excluded from the public view.
- Neither Production event rows nor Production image URLs were changed. New first-party six-theme photorealistic WebP feature stays OFF until six valid files are committed, deployed, disclosed and visually tested.

## Regression and release rules
- Previous `fa0fc7a4` build failed because `scripts/check-launch-cover-and-community.mjs` expected an obsolete inline regex after a named prefix refactor.
- `5e8ad543` repaired the regression assertion without removing AI image disclosure rules. For that SHA, GitHub CI and Quality Gate passed and the Staging preview became READY. Browser checks must be tied to their exact commit.
- The prior P0 workflow was tied to the obsolete `fix/relaunch-password8-full-dates-20261112` branch and old Preview URL. It is now wired to the release branch's existing Protected Preview alias, with explicit opt-in commit message `test(launch): run final P0 suite` to prevent expensive database-mutating tests from firing on every push.
- The commit adding this document intentionally requests a full same-SHA P0 run: Verify/Build, isolated Merchant/Admin, isolated Parent, isolated Community and anonymous desktop/mobile browser. Recheck results before marking PASS.
- These CI tests **do not prove** a new public user's received and clicked confirmation/recovery emails, hosted Supabase Auth templates, or a real delivered Merchant/Admin email.
- Outstanding go-live gates: real email delivery/branding and reset, no copyrighted public covers, six-asset source deployment (if enabled), Supabase security review/accepted limitation, authorized Production backup and restore verification, exact-SHA controlled promotion and live-domain post-release smoke.

## NO-GO
No Production merge, promotion or MAINTENANCE_MODE change is authorized by this audit or by a CI PASS alone.
