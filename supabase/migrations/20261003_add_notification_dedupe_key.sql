-- HK Family Fun V2
-- Prevent duplicate in-app notifications caused by retries or repeat page loads.

alter table public.platform_notifications
  add column if not exists dedupe_key text;

create unique index if not exists platform_notifications_dedupe_key_uidx
  on public.platform_notifications(dedupe_key)
  where dedupe_key is not null;
