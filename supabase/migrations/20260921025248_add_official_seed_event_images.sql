update public.events
set cover_image_url = case
  when title_tc = '國際中秋綵燈匯'
    then 'https://www.discoverhongkong.com/tc/events/international-lantern-spectacular.thumb.800.480.png?ck=1789716048'
  when title_tc = '大坑舞火龍 2026'
    then 'https://www.discoverhongkong.com/tc/events/tai-hang-s-fire-dragon-dance.thumb.800.480.png?ck=1789618547'
  when title_tc = '薄扶林村中秋舞火龍 2026'
    then 'https://www.discoverhongkong.com/content/dam/dhk/events/images/en/898/89862/pfl-fire-dragon_1_1024-0911160942.jpg'
  when title_tc = '「嶼月高昇‧處處是景」東涌海濱花燈節2026'
    then 'https://www.discoverhongkong.com/content/dam/dhk/events/images/tc/890/89022/iconic-feature_1024-0918142101.jpg'
  when title_tc like '親子隨玩現場：畫畫不尋常｜%'
    then 'https://www.mplus.org.hk/api/images/14296/width-1200|format-jpeg/'
  when title_tc like '親子隨玩現場：日常的奇妙時刻｜%'
    then 'https://www.mplus.org.hk/api/images/14336/width-1200|format-jpeg/'
  when title_tc = '專題故事劇場2026：愛因斯坦成長之旅｜屯門'
    then 'https://www.hkpl.gov.hk/en/common/images/extension-activities/Thematic%20Storytelling%202026/Thematic-Storytelling-Workshop2026_recycle-background.jpg'
  when title_tc = '「做個小小規劃師」工作坊｜屯門'
    then 'https://www.hkpl.gov.hk/tc/common/images/extension-activities/event/PlanD%20workshop_2026.jpg'
  when title_tc = '兒童故事時間：歡樂萬聖節｜深水埗'
    then 'https://www.hkpl.gov.hk/tc/common/images/extension-activities/event/story_a.jpg'
  when title_tc = '「李小龍迷影相館」家庭活動｜9月27日'
    then 'https://www.heritagemuseum.gov.hk/images/activities/Activities_BruceLeeFansPhotoStudio.png'
  else cover_image_url
end,
updated_at = now()
where admin_review_note like 'Pre-launch seed:%'
  and (
    title_tc in (
      '國際中秋綵燈匯',
      '大坑舞火龍 2026',
      '薄扶林村中秋舞火龍 2026',
      '「嶼月高昇‧處處是景」東涌海濱花燈節2026',
      '專題故事劇場2026：愛因斯坦成長之旅｜屯門',
      '「做個小小規劃師」工作坊｜屯門',
      '兒童故事時間：歡樂萬聖節｜深水埗',
      '「李小龍迷影相館」家庭活動｜9月27日'
    )
    or title_tc like '親子隨玩現場：畫畫不尋常｜%'
    or title_tc like '親子隨玩現場：日常的奇妙時刻｜%'
  );
