-- HK Family Fun V2
-- Cover foreign keys used by the Admin operations/data hub workflows.

create index if not exists data_sync_runs_source_id_idx
  on public.data_sync_runs(source_id);

create index if not exists intake_submissions_linked_event_id_idx
  on public.intake_submissions(linked_event_id);

create index if not exists intake_submissions_linked_merchant_id_idx
  on public.intake_submissions(linked_merchant_id);

create index if not exists social_content_drafts_source_event_id_idx
  on public.social_content_drafts(source_event_id);

create index if not exists social_content_drafts_source_article_id_idx
  on public.social_content_drafts(source_article_id);
