create or replace function public.enforce_event_submission_requirements()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  has_image boolean;
  has_location boolean;
  has_action boolean;
  has_price boolean;
begin
  if new.status in ('submitted', 'published')
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then

    if coalesce(trim(new.title_tc), trim(new.title), '') = '' then
      raise exception 'Event title is required before submitting or publishing an event.';
    end if;

    if new.start_date is null then
      raise exception 'Event start date is required before submitting or publishing an event.';
    end if;

    if new.end_date is not null and new.end_date < new.start_date then
      raise exception 'Event end date cannot be earlier than the start date.';
    end if;

    has_location :=
      coalesce(trim(new.venue_name), '') <> ''
      or coalesce(trim(new.address), '') <> ''
      or coalesce(trim(new.district), '') <> '';

    if not has_location then
      raise exception 'Event venue, address or district is required before submitting or publishing an event.';
    end if;

    has_image :=
      coalesce(trim(new.cover_image_url), '') <> ''
      or coalesce(cardinality(new.gallery_image_urls), 0) > 0;

    if not has_image then
      raise exception 'At least one event image is required before submitting or publishing an event.';
    end if;

    has_action :=
      lower(coalesce(trim(new.cta_type), '')) in ('none', 'contact')
      or new.registration_required = false
      or coalesce(
        nullif(trim(new.registration_url), ''),
        nullif(trim(new.booking_url), ''),
        nullif(trim(new.official_url), ''),
        nullif(trim(new.official_website_url), ''),
        nullif(trim(new.source_url), ''),
        nullif(trim(new.event_url), ''),
        nullif(trim(new.ticket_url), ''),
        nullif(trim(new.contact_phone), ''),
        nullif(trim(new.contact_email), ''),
        nullif(trim(new.contact_whatsapp), ''),
        nullif(trim(new.whatsapp), ''),
        ''
      ) <> '';

    if not has_action then
      raise exception 'A CTA, registration method, official/source URL or contact method is required before submitting or publishing an event.';
    end if;

    if new.status = 'submitted' then
      if new.merchant_id is null then
        raise exception 'Merchant ID is required before submitting an event.';
      end if;

      has_price :=
        new.is_free = true
        or lower(coalesce(trim(new.price_display_mode), '')) not in ('', 'unknown')
        or coalesce(trim(new.price_label), '') <> ''
        or new.price_min is not null
        or new.price_max is not null
        or coalesce(trim(new.min_price), '') <> ''
        or coalesce(trim(new.max_price), '') <> '';

      if not has_price then
        raise exception 'Price information must be confirmed before submitting an event.';
      end if;
    end if;
  end if;

  return new;
end;
$function$;
