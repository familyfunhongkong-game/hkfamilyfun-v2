-- 2026-11-09 launch QA: Prevent an active published event losing its last image.
-- Preserves legacy published events which already had no image, so unrelated
-- metadata maintenance cannot suddenly fail. New published events require media.
create or replace function public.guard_live_published_event_media()
returns trigger
language plpgsql
set search_path = ''
as $guard$
declare
  guard_required boolean := false;
  new_has_media boolean;
begin
  if new.status is distinct from 'published' then return new; end if;
  if coalesce(new.end_date, new.start_date) < (timezone('Asia/Hong_Kong', now()))::date then
    return new;
  end if;

  if tg_op = 'INSERT' then
    guard_required := true;
  else
    guard_required := old.status is distinct from 'published'
      or nullif(btrim(coalesce(old.cover_image_url, '')), '') is not null
      or exists (
        select 1 from unnest(coalesce(old.gallery_image_urls, array[]::text[])) as old_image(url)
        where nullif(btrim(old_image.url), '') is not null
      );
  end if;

  new_has_media :=
    nullif(btrim(coalesce(new.cover_image_url, '')), '') is not null
    or exists (
      select 1 from unnest(coalesce(new.gallery_image_urls, array[]::text[])) as new_image(url)
      where nullif(btrim(new_image.url), '') is not null
    );

  if guard_required and not new_has_media then
    raise exception 'Published current/future event must retain at least one image.';
  end if;
  return new;
end;
$guard$;

drop trigger if exists guard_live_published_event_media_trigger on public.events;
create trigger guard_live_published_event_media_trigger
before insert or update of status, cover_image_url, gallery_image_urls on public.events
for each row execute function public.guard_live_published_event_media();
revoke all on function public.guard_live_published_event_media() from public, anon, authenticated;
