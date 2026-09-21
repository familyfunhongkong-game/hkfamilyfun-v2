update public.events
set source_url = 'https://www.mplus.org.hk/tc/events/family-drop-in-story-time-with-everyday-wonders/',
    official_url = 'https://www.mplus.org.hk/tc/events/family-drop-in-story-time-with-everyday-wonders/',
    updated_at = now()
where title_tc = '親子隨玩現場：日常的奇妙時刻｜10月25日'
  and start_date = date '2026-10-25';
