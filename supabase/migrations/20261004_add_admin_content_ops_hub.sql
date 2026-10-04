-- HK Family Fun V2
-- Unified one-person operations layer: content/news, promotions, social drafts,
-- Google Drive / form ingestion registry, sync reporting and Admin-only integration state.

create table if not exists public.content_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  article_type text not null default 'news'
    check (article_type in ('news','feature','guide','sponsored')),
  status text not null default 'draft'
    check (status in ('draft','review','published','archived')),
  title_tc text not null default '',
  title_sc text,
  title_en text,
  excerpt_tc text,
  excerpt_sc text,
  excerpt_en text,
  body_tc text,
  body_sc text,
  body_en text,
  cover_image_url text,
  gallery_image_urls jsonb not null default '[]'::jsonb,
  source_url text,
  linked_event_id uuid references public.events(id) on delete set null,
  sponsor_name text,
  is_sponsored boolean not null default false,
  featured boolean not null default false,
  seo_title text,
  seo_description text,
  ai_notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists content_articles_status_published_idx
  on public.content_articles(status, published_at desc);
create index if not exists content_articles_featured_idx
  on public.content_articles(featured, published_at desc);
create index if not exists content_articles_linked_event_idx
  on public.content_articles(linked_event_id);

alter table public.content_articles enable row level security;

drop policy if exists "Public can read published content articles" on public.content_articles;
create policy "Public can read published content articles"
on public.content_articles
for select
to anon, authenticated
using (
  status = 'published'
  and (published_at is null or published_at <= now())
);

drop policy if exists "Admins can manage content articles" on public.content_articles;
create policy "Admins can manage content articles"
on public.content_articles
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());


-- Reuse the existing promo_banners table as the single source of truth.
alter table public.promo_banners
  add column if not exists internal_name text,
  add column if not exists headline_tc text,
  add column if not exists headline_sc text,
  add column if not exists headline_en text,
  add column if not exists subheadline_tc text,
  add column if not exists subheadline_sc text,
  add column if not exists subheadline_en text,
  add column if not exists mobile_image_url text,
  add column if not exists target_url text,
  add column if not exists cta_label_tc text,
  add column if not exists cta_label_sc text,
  add column if not exists cta_label_en text,
  add column if not exists badge_text_tc text,
  add column if not exists badge_text_sc text,
  add column if not exists badge_text_en text,
  add column if not exists sponsor_name text,
  add column if not exists is_paid boolean not null default false,
  add column if not exists priority integer not null default 100;

update public.promo_banners
set
  internal_name = coalesce(nullif(internal_name, ''), title),
  headline_tc = coalesce(nullif(headline_tc, ''), title),
  subheadline_tc = coalesce(subheadline_tc, subtitle),
  target_url = coalesce(target_url, link_url),
  priority = coalesce(priority, sort_order, 100)
where
  internal_name is null
  or headline_tc is null
  or target_url is null
  or priority is null;

alter table public.promo_banners
  drop constraint if exists promo_banners_placement_check;

alter table public.promo_banners
  add constraint promo_banners_placement_check
  check (placement in (
    'home_top','home_mid','home_middle','events_top',
    'event_detail','news_top','article_inline'
  ));

create index if not exists promo_banners_ops_live_idx
  on public.promo_banners(placement, status, priority, starts_at, ends_at);

alter table public.promo_banners enable row level security;

create table if not exists public.social_content_drafts (
  id uuid primary key default gen_random_uuid(),
  source_event_id uuid references public.events(id) on delete set null,
  source_article_id uuid references public.content_articles(id) on delete set null,
  channel text not null default 'instagram'
    check (channel in ('instagram','facebook','threads','all')),
  locale text not null default 'zh-Hant'
    check (locale in ('zh-Hant','zh-Hans','en')),
  status text not null default 'draft'
    check (status in ('draft','ready','posted','archived')),
  title text,
  copy_text text not null default '',
  image_brief text,
  generated_by_ai boolean not null default false,
  scheduled_for timestamptz,
  posted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_content_drafts_status_idx
  on public.social_content_drafts(status, created_at desc);

alter table public.social_content_drafts enable row level security;

drop policy if exists "Admins can manage social content drafts" on public.social_content_drafts;
create policy "Admins can manage social content drafts"
on public.social_content_drafts
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());


create table if not exists public.external_data_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_type text not null
    check (source_type in ('google_sheet','google_drive','form','website','manual')),
  display_name text not null,
  source_url text,
  sheet_id text,
  sheet_name text,
  active boolean not null default true,
  sync_mode text not null default 'manual'
    check (sync_mode in ('manual','oauth','webhook','scheduled')),
  config jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.external_data_sources enable row level security;

drop policy if exists "Admins can manage external data sources" on public.external_data_sources;
create policy "Admins can manage external data sources"
on public.external_data_sources
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());


create table if not exists public.data_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.external_data_sources(id) on delete set null,
  status text not null default 'running'
    check (status in ('running','success','partial','failed')),
  rows_read integer not null default 0,
  rows_inserted integer not null default 0,
  rows_updated integer not null default 0,
  rows_skipped integer not null default 0,
  error_count integer not null default 0,
  message text,
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists data_sync_runs_started_idx
  on public.data_sync_runs(started_at desc);

alter table public.data_sync_runs enable row level security;

drop policy if exists "Admins can manage data sync runs" on public.data_sync_runs;
create policy "Admins can manage data sync runs"
on public.data_sync_runs
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());


create table if not exists public.intake_submissions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.external_data_sources(id) on delete set null,
  source_type text not null,
  external_key text,
  submission_type text not null default 'event'
    check (submission_type in ('event','merchant','contact','report','survey','other')),
  status text not null default 'new'
    check (status in ('new','normalized','linked','needs_review','ignored')),
  payload jsonb not null default '{}'::jsonb,
  normalized_payload jsonb not null default '{}'::jsonb,
  linked_event_id uuid references public.events(id) on delete set null,
  linked_merchant_id uuid references public.merchants(id) on delete set null,
  source_updated_at timestamptz,
  received_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists intake_submissions_source_external_uidx
  on public.intake_submissions(source_id, external_key)
  where source_id is not null and external_key is not null;

create index if not exists intake_submissions_status_idx
  on public.intake_submissions(status, received_at desc);

alter table public.intake_submissions enable row level security;

drop policy if exists "Admins can manage intake submissions" on public.intake_submissions;
create policy "Admins can manage intake submissions"
on public.intake_submissions
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());


create table if not exists public.admin_integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique
    check (provider in ('google_drive')),
  status text not null default 'disconnected'
    check (status in ('disconnected','connected','error')),
  account_email text,
  encrypted_refresh_token text,
  granted_scopes text[] not null default '{}',
  last_connected_at timestamptz,
  last_used_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_integrations enable row level security;

drop policy if exists "Admins can manage integrations" on public.admin_integrations;
create policy "Admins can manage integrations"
on public.admin_integrations
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());


grant select on public.content_articles, public.promo_banners to anon;
grant select on public.content_articles, public.promo_banners to authenticated;
grant insert, update, delete on public.content_articles, public.promo_banners to authenticated;
grant select, insert, update, delete
  on public.social_content_drafts,
     public.external_data_sources,
     public.data_sync_runs,
     public.intake_submissions,
     public.admin_integrations
  to authenticated;

insert into public.external_data_sources
  (source_key, source_type, display_name, source_url, sheet_id, sheet_name, sync_mode, config)
values
  (
    'drive_event_intake',
    'google_sheet',
    'HK Family Fun - Event create upload (Template - Upload)',
    'https://docs.google.com/spreadsheets/d/1l8T5vdO35qefIAbJPejreJm9AMmomKpLmMBo3-tq_3E/edit',
    '1l8T5vdO35qefIAbJPejreJm9AMmomKpLmMBo3-tq_3E',
    'Event Intake',
    'oauth',
    '{"schema":"event_intake_v1"}'::jsonb
  ),
  (
    'drive_merchant_event_submission',
    'google_sheet',
    'Family Fun HK – Merchant Event Submission Form',
    'https://docs.google.com/spreadsheets/d/1JGcL95SRyXosdjVydIghvsGAFtXMz3qrTOybE-Q5PMs/edit',
    '1JGcL95SRyXosdjVydIghvsGAFtXMz3qrTOybE-Q5PMs',
    'Sheet1',
    'oauth',
    '{"schema":"merchant_submission_v1"}'::jsonb
  ),
  (
    'drive_event_source_registry',
    'google_sheet',
    'HK-Family-Fun-event-sources-automation-input-final',
    'https://docs.google.com/spreadsheets/d/19cO_oCFMiENrnVepEFJ5IhnDwGvsSZ4D4KnjlKw78Is/edit',
    '19cO_oCFMiENrnVepEFJ5IhnDwGvsSZ4D4KnjlKw78Is',
    'Sheet1',
    'oauth',
    '{"schema":"event_source_registry_v1"}'::jsonb
  )
on conflict (source_key) do update set
  display_name = excluded.display_name,
  source_url = excluded.source_url,
  sheet_id = excluded.sheet_id,
  sheet_name = excluded.sheet_name,
  config = excluded.config,
  updated_at = now();

notify pgrst, 'reload schema';
