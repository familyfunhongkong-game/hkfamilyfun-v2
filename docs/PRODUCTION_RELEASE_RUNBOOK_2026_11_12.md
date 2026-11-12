# HK Family Fun V2 — Controlled Production Release / Rollback (2026-11-12)

**Release state: HOLD** until the P0 blockers in docs/LAUNCH_ACCEPTANCE_2026_11_11.md are resolved. Do not auto-merge or turn off maintenance.

## Baselines verified on November 12
- GitHub Production main: 12de8cf60289a19d902f0ee0c5e90c6e6f94cb55 (recheck immediately before deployment).
- Production Vercel: MAINTENANCE_MODE=true; NEXT_PUBLIC_SITE_URL and SITE_URL=https://www.hkfamilyfun.com.
- Staging alias hkfamilyfun-staging.vercel.app remains separate and points to Staging Supabase (gwoiocllrgdwuxzibcuu).
- Production Supabase ref: uiyrbqqvgnfhfdhedmav; NEVER use Staging service keys against Production.
- Six membership/community tables already exist in both environments with RLS on.
- Production public_events_i18n = 22 visible rows with cover URLs. Staging public view matched snapshot, not a continuous replica.
- Staging migration 20261109141403_guard_live_published_event_media_20261109 already applied; Production trigger not yet installed.

## Before any Production database write
1. Obtain final CI/Quality/Chrome (320/375/390/1440), authenticated Community, Merchant/Admin, and real email PASS evidence on ONE exact commit SHA.
2. Review all 22 public event cover images for a valid rights basis; source host alone does not confer permission.
3. Preserve previous deployment ID and commit SHA, obtain a recent database backup/snapshot by an authorized method, and verify restore access.
4. Verify migration order/history, SQL privileges, public views, RLS and Storage rules. Confirm active published events all retain a cover image.
5. Ensure maintenance remains enabled and no staging-service secrets or test users are moved into Production.

## Production-only forward schema change
Apply the already-reviewed `supabase/migrations/20261109141403_guard_live_published_event_media_20261109.sql` in controlled release after preflight, then verify:

```sql
select tgname, pg_get_triggerdef(t.oid) from pg_trigger t
where t.tgrelid='public.events'::regclass
and t.tgname='guard_live_published_event_media_trigger';
select count(*) from public.public_events_i18n;
```

The trigger prevents a NEW active published event (or an existing active published event that currently has media) from losing its last photo. It deliberately tolerates legacy already-image-less rows. Test draft -> submitted -> approved -> published and update behavior after applying it.

## Rollback (only if this particular trigger causes an operational regression)
Run only after documenting the reason, and with Production maintenance ON:

```sql
begin;
drop trigger if exists guard_live_published_event_media_trigger on public.events;
drop function if exists public.guard_live_published_event_media();
commit;
```

Do not silently roll back unrelated schema changes or delete user/event records. Restore prior Vercel deployment if release code fails, with Production maintenance re-enabled; verify DB backward compatibility and rerun smoke checks.

## Release promotion
1. Revalidate every P0 gate. Preserve source/rollback/deployment SHA evidence.
2. Merge approved integrated PR to main only after gates PASS; confirm exact deployed SHA and intended Production database.
3. Run Production health, auth-confirmation, Merchant/Admin, Community role-negative, public event images, SEO/robots, cookies and mobile smoke tests while maintenance gating permits internal testing.
4. Turn MAINTENANCE_MODE=false only after all checks pass, then run public-domain desktop/mobile smoke and monitoring.
5. On error, immediately re-enable maintenance, restore previous Vercel deployment, and execute a documented DB rollback ONLY when necessary.

## Outstanding external dependencies
- Real cross-role browser acceptance, actual Merchant/Admin delivery receipt on latest code, and image reuse rights cannot be inferred from CI build or source URLs.
- Supabase leaked-password protection requires Pro or higher per current Supabase pricing; do not purchase an upgrade without founder approval. Maintain strong password validation and auth rate limits meanwhile.
