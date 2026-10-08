update public.events
set age_max = 12,
    updated_at = now(),
    admin_review_note = trim(both from concat_ws(
      E'\n',
      nullif(admin_review_note, ''),
      'Launch QA 2026-10-08: official HKPL listing confirms the activity is for children aged 12 or below.'
    ))
where id = '4099ab98-f832-4300-aa8b-dd29f598cbb2'
  and title_tc = '專題故事劇場2026：愛因斯坦成長之旅｜屯門';

update public.events
set age_min = 8,
    age_max = 12,
    updated_at = now(),
    admin_review_note = trim(both from concat_ws(
      E'\n',
      nullif(admin_review_note, ''),
      'Launch QA 2026-10-08: official HKPL listing confirms target age 8–12 with parent/guardian.'
    ))
where id = '467942bf-034e-4365-a0b8-2a604eca52f8'
  and title_tc = '「做個小小規劃師」工作坊｜屯門';

update public.events
set age_min = 4,
    age_max = 10,
    updated_at = now(),
    admin_review_note = trim(both from concat_ws(
      E'\n',
      nullif(admin_review_note, ''),
      'Launch QA 2026-10-08: official HKPL listing confirms target age 4–10.'
    ))
where id = '6967d0e1-33f0-4ec1-9f4b-dd6f80225b72'
  and title_tc = '兒童故事時間：歡樂萬聖節｜深水埗';

update public.events
set age_groups = array['所有年齡']::text[],
    updated_at = now(),
    admin_review_note = trim(both from concat_ws(
      E'\n',
      nullif(admin_review_note, ''),
      'Launch QA 2026-10-08 editorial classification: official CPO page presents this free public lighting installation to citizens and visitors and does not state an age restriction; platform classified as 所有年齡 without inventing numeric ages.'
    ))
where id = '9dbf384e-fa0f-454f-bf1e-105bd093fb8f'
  and title_tc = '丙午年中秋光影裝置｜香港文化中心露天廣場';

update public.events
set status = 'archived',
    updated_at = now(),
    admin_review_note = trim(both from concat_ws(
      E'\n',
      nullif(admin_review_note, ''),
      'Launch QA 2026-10-08: archived E2E-only merchant event; test data must not remain public.'
    ))
where id = 'b9cd5aac-4bbb-4a8b-8446-ca221a8cac77'
  and title_tc = 'HKFF E2E Merchant Event'
  and venue_name = 'HKFF E2E Test Venue'
  and status = 'published';
