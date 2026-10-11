-- HK Family Fun V2
-- Official source https://www.yangiss.org/blissinfinite states the programme
-- supports children and young people aged 5 to 16. Correct the legacy 5–15
-- record without changing the Admin-controlled publication status.

update public.events
set age_max = 16,
    short_description_tc = replace(short_description_tc, '5至15歲', '5至16歲'),
    description_tc = replace(description_tc, '5至15歲', '5至16歲'),
    updated_at = now()
where source_url='https://www.yangiss.org/blissinfinite'
  and title_tc='童樂無限－小家屬支援計劃'
  and age_min=5
  and age_max=15
  and status in ('approved','published');
