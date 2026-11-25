# Rebuild HK Family Fun — Official Event Seed 2026-11-16 → 2027-04-01

**Date reviewed:** 2026-11-12. **Data operations performed:** staging + production Supabase `events` inserts; no Vercel production promotion or Maintenance Mode change.

## Verified final database state (read-only SQL after both inserts)

| Metric | Production | Staging |
| --- | ---: | ---: |
| New curated events / Published | 44 / 44 | 44 / 44 |
| Curated events in requested overlapping date window | 44 | 44 |
| New rows exposed through `public_events_i18n` | 44 | 44 |
| Existing + new published overlapping requested window | 64 | 65 (one staging-only QA fixture) |
| Duplicate curated source fingerprints | 0 | 0 |
| Inconsistent free / is_free values among curated records | 0 | 0 |
| Missing source URLs, missing cover paths, reversed date ranges | 0 | 0 |
| New records starting Mar 1–Apr 1 2027 | 5 | 5 |

Manifest record counts by actual `start_date` month (do not truncate true organizer dates merely to fit the search window):
- 2026-11: **20**; 2026-12: **10**; 2027-01: **5**; 2027-02: **4**; 2027-03: **3**; 2027-04: **2**. Total = **44**.

## Reproducible audited source
- `data/verified-family-events-20261116-20270401.json` — 37 original event or dated-session rows, 2026–27.
- `data/verified-hkpl-addendum-202612-202704.json` — 7 official HKPL dates, including March and 1 April 2027.
- Fingerprint namespace `hkff:curated:20261112:<stable-key>`. Inserts excluded an existing fingerprint or identical title/date/venue/source; **do not truncate or reseed by deleting existing events**.
- `scripts/check-curated-event-seeds.mjs` runs on prebuild and checks official links, scope, fee consistency, date correctness, uniqueness, date coverage and original artwork.
- `public/images/verified-event-placeholder.svg` — a generic HK Family Fun-original cover, **not an organizer poster** and not a grant of organizer image usage rights. Asset is on this PR branch only; must be included in actual relaunch deploy. Production rows currently refer to this path and will use existing browser fallback until the asset is deployed.
- Title is the activity subject with venue/organizer for identification, not a claim of partnership.

## Existing records corrected in both DBs

1. `540b9ed3-427a-42e7-8153-5e44cd63f7f7` — HKTB WinterFest corrected to 2026-11-18 → 2027-01-05 from previously incorrect Nov 1 → Jan 3. Source: https://www.discoverhongkong.com/eng/events/hong-kong-winterfest.html .
2. `5704bdb8-93b8-41af-b943-1530741f0747` — PMQ `price_type` corrected from `free` to `paid`, consistent with `is_free=false` and saved ticket labels HK$20/HK$80. Source: https://www.pmq.org.hk/event/pmq-picture-book-library-start-from-here/?lang=ch .

## Acceptance and operating limits

- Database state is **not** proof that all public image and CTA links render from the live domain. Perform live browser checks, especially 320/375/390px, once the launch SHA is promoted.
- This is an **official-source-backed snapshot**, not a running daily web crawler or future automatic delta-update pipeline. New organizer dates/closures still require subsequent source checks; do not invent future schedules.
- Public events that start before Nov 16 but continue into the window retain their **true earlier start dates**, for example Ngong Ping 360 Nov 3, Gold Coast Nov 6, MCP Nov 7.
- Display dates extending beyond Apr 1 remain their **true organizer end date** (HKPM exhibition May 5); the window is a *search intersection*, not a data modification.
- Some activities are venues, cultural exhibitions or free library book displays rather than bookable paid family workshops. Clearly distinguish eligibility/booking and give original source URLs.
- Age limits unknown are recorded as `主辦方未註明`; never invent all-ages approval unless explicitly supported.
- RLS, full Merchant/Admin/Community E2E, Auth confirmation and production release/rollback remain separate launch blockers, tracked in PR #171 and #173. **Do not change Maintenance Mode automatically**.
