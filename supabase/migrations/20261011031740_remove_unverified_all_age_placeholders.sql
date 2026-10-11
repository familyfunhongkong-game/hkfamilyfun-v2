update public.events
set age_min = null,
    age_max = null,
    age_groups = array['主辦方未註明']::text[],
    updated_at = now(),
    admin_review_note = case
      when coalesce(admin_review_note, '') like '%Launch QA age placeholder correction 2026-10-10:%'
        then admin_review_note
      else trim(both from concat_ws(
        E'\n',
        nullif(admin_review_note, ''),
        'Launch QA age placeholder correction 2026-10-10: removed unsupported 0–99 numeric placeholder. Current source does not provide a verified numeric age range; display as 主辦方未註明 instead of inferring All ages.'
      ))
    end
where status = 'published'
  and age_min = 0
  and age_max = 99
  and (
    (title_tc = '香港公園｜藝趣坊' and coalesce(official_url, source_url, '') ilike '%hkp.lcsd.gov.hk%')
    or
    (title_tc = '香港公園｜清晨觀鳥匯敘' and coalesce(official_url, source_url, '') ilike '%hkp.lcsd.gov.hk%')
    or
    (title_tc = 'PMQ 繪本館「START FROM HERE」' and coalesce(official_url, source_url, '') ilike '%pmq.org.hk%')
    or
    (title_tc = '第十三屆「大樹菠蘿文化節」｜荃灣光板田村' and (
      coalesce(official_url, '') ilike '%facebook.com/jackfruitfestival%'
      or coalesce(source_url, '') ilike '%facebook.com/jackfruitfestival%'
    ))
  );
