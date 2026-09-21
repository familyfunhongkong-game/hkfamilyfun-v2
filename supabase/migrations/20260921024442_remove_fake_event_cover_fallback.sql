drop trigger if exists aaa_auto_fill_event_cover_before_submit_trigger on public.events;
drop function if exists public.auto_fill_event_cover_before_submit();

create or replace function public.enforce_event_submission_requirements()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.status = 'submitted' then
    if new.title_tc is null or trim(new.title_tc) = '' then
      raise exception 'Event title is required before submitting an event.';
    end if;

    if new.merchant_id is null then
      raise exception 'Merchant ID is required before submitting an event.';
    end if;
  end if;

  return new;
end;
$function$;

update public.events
set cover_image_url = null,
    updated_at = now(),
    admin_review_note = trim(
      both from concat_ws(
        E'\n',
        nullif(admin_review_note, ''),
        'Removed generic Unsplash fallback image during pre-launch QA; use an official event image or the platform placeholder.'
      )
    )
where cover_image_url like 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b%';
