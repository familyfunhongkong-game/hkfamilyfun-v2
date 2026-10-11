update public.events
set age_groups = array['主辦方未註明']::text[],
    updated_at = now(),
    admin_review_note = case
      when coalesce(admin_review_note, '') like '%Launch QA correction 2026-10-10:%'
        then admin_review_note
      else trim(both from concat_ws(
        E'\n',
        nullif(admin_review_note, ''),
        'Launch QA correction 2026-10-10: official CPO page does not state an age restriction. Per HK Family Fun age-data policy, unknown/unstated age must be 主辦方未註明 rather than inferred as 所有年齡.'
      ))
    end
where title_tc = '丙午年中秋光影裝置｜香港文化中心露天廣場'
  and (
    official_url ilike '%cpo.gov.hk%'
    or source_url ilike '%cpo.gov.hk%'
  )
  and status = 'published';
