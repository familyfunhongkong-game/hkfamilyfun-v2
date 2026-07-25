export type LocationOption = {
  zh: string;
  en: string;
};

export type AreaOption = {
  zh: string;
  en: string;
  districtZh: string;
  districtEn: string;
  regionZh: string;
  regionEn: string;
};

export const SPECIAL_LOCATION_OPTIONS: LocationOption[] = [
  { zh: "待確認", en: "To be confirmed" },
  { zh: "全港", en: "Hong Kong-wide" },
  { zh: "多區", en: "Multiple districts" },
  { zh: "網上", en: "Online" },
];

export const DISTRICT_SELECT_OPTIONS: LocationOption[] = [
  ...SPECIAL_LOCATION_OPTIONS,
  { zh: "中西區", en: "Central and Western District" },
  { zh: "灣仔區", en: "Wan Chai District" },
  { zh: "東區", en: "Eastern District" },
  { zh: "南區", en: "Southern District" },
  { zh: "油尖旺區", en: "Yau Tsim Mong District" },
  { zh: "深水埗區", en: "Sham Shui Po District" },
  { zh: "九龍城區", en: "Kowloon City District" },
  { zh: "黃大仙區", en: "Wong Tai Sin District" },
  { zh: "觀塘區", en: "Kwun Tong District" },
  { zh: "荃灣區", en: "Tsuen Wan District" },
  { zh: "屯門區", en: "Tuen Mun District" },
  { zh: "元朗區", en: "Yuen Long District" },
  { zh: "北區", en: "North District" },
  { zh: "大埔區", en: "Tai Po District" },
  { zh: "沙田區", en: "Sha Tin District" },
  { zh: "西貢區", en: "Sai Kung District" },
  { zh: "葵青區", en: "Kwai Tsing District" },
  { zh: "離島區", en: "Islands District" },
];

export const AREA_SELECT_OPTIONS: AreaOption[] = [
  ...SPECIAL_LOCATION_OPTIONS.map((item) => ({
    ...item,
    districtZh: item.zh,
    districtEn: item.en,
    regionZh: item.zh,
    regionEn: item.en,
  })),

  // 港島 Hong Kong Island
  { zh: "香港大學", en: "HKU", districtZh: "中西區", districtEn: "Central and Western District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "西營盤", en: "Sai Ying Pun", districtZh: "中西區", districtEn: "Central and Western District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "上環", en: "Sheung Wan", districtZh: "中西區", districtEn: "Central and Western District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "中環", en: "Central", districtZh: "中西區", districtEn: "Central and Western District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "金鐘", en: "Admiralty", districtZh: "中西區", districtEn: "Central and Western District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "灣仔", en: "Wan Chai", districtZh: "灣仔區", districtEn: "Wan Chai District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "會展", en: "Exhibition Centre", districtZh: "灣仔區", districtEn: "Wan Chai District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "銅鑼灣", en: "Causeway Bay", districtZh: "灣仔區", districtEn: "Wan Chai District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "天后", en: "Tin Hau", districtZh: "灣仔區", districtEn: "Wan Chai District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "炮台山", en: "Fortress Hill", districtZh: "東區", districtEn: "Eastern District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "北角", en: "North Point", districtZh: "東區", districtEn: "Eastern District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "鰂魚涌", en: "Quarry Bay", districtZh: "東區", districtEn: "Eastern District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "太古", en: "Tai Koo", districtZh: "東區", districtEn: "Eastern District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "西灣河", en: "Sai Wan Ho", districtZh: "東區", districtEn: "Eastern District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "筲箕灣", en: "Shau Kei Wan", districtZh: "東區", districtEn: "Eastern District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "杏花邨", en: "Heng Fa Chuen", districtZh: "東區", districtEn: "Eastern District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "柴灣", en: "Chai Wan", districtZh: "東區", districtEn: "Eastern District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "海洋公園", en: "Ocean Park", districtZh: "南區", districtEn: "Southern District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "黃竹坑", en: "Wong Chuk Hang", districtZh: "南區", districtEn: "Southern District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "利東", en: "Lei Tung", districtZh: "南區", districtEn: "Southern District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "海怡半島", en: "South Horizons", districtZh: "南區", districtEn: "Southern District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "香港仔", en: "Aberdeen", districtZh: "南區", districtEn: "Southern District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "赤柱", en: "Stanley", districtZh: "南區", districtEn: "Southern District", regionZh: "港島", regionEn: "Hong Kong Island" },
  { zh: "淺水灣", en: "Repulse Bay", districtZh: "南區", districtEn: "Southern District", regionZh: "港島", regionEn: "Hong Kong Island" },

  // 九龍 Kowloon
  { zh: "尖沙咀", en: "Tsim Sha Tsui", districtZh: "油尖旺區", districtEn: "Yau Tsim Mong District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "尖東", en: "East Tsim Sha Tsui", districtZh: "油尖旺區", districtEn: "Yau Tsim Mong District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "佐敦", en: "Jordan", districtZh: "油尖旺區", districtEn: "Yau Tsim Mong District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "油麻地", en: "Yau Ma Tei", districtZh: "油尖旺區", districtEn: "Yau Tsim Mong District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "旺角", en: "Mong Kok", districtZh: "油尖旺區", districtEn: "Yau Tsim Mong District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "旺角東", en: "Mong Kok East", districtZh: "油尖旺區", districtEn: "Yau Tsim Mong District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "太子", en: "Prince Edward", districtZh: "油尖旺區", districtEn: "Yau Tsim Mong District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "奧運", en: "Olympic", districtZh: "油尖旺區", districtEn: "Yau Tsim Mong District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "九龍", en: "Kowloon", districtZh: "油尖旺區", districtEn: "Yau Tsim Mong District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "柯士甸", en: "Austin", districtZh: "油尖旺區", districtEn: "Yau Tsim Mong District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "香港西九龍", en: "Hong Kong West Kowloon", districtZh: "油尖旺區", districtEn: "Yau Tsim Mong District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "美孚", en: "Mei Foo", districtZh: "深水埗區", districtEn: "Sham Shui Po District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "荔枝角", en: "Lai Chi Kok", districtZh: "深水埗區", districtEn: "Sham Shui Po District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "長沙灣", en: "Cheung Sha Wan", districtZh: "深水埗區", districtEn: "Sham Shui Po District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "深水埗", en: "Sham Shui Po", districtZh: "深水埗區", districtEn: "Sham Shui Po District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "石硤尾", en: "Shek Kip Mei", districtZh: "深水埗區", districtEn: "Sham Shui Po District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "南昌", en: "Nam Cheong", districtZh: "深水埗區", districtEn: "Sham Shui Po District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "紅磡", en: "Hung Hom", districtZh: "九龍城區", districtEn: "Kowloon City District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "何文田", en: "Ho Man Tin", districtZh: "九龍城區", districtEn: "Kowloon City District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "土瓜灣", en: "To Kwa Wan", districtZh: "九龍城區", districtEn: "Kowloon City District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "宋皇臺", en: "Sung Wong Toi", districtZh: "九龍城區", districtEn: "Kowloon City District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "啟德", en: "Kai Tak", districtZh: "九龍城區", districtEn: "Kowloon City District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "九龍塘", en: "Kowloon Tong", districtZh: "九龍城區", districtEn: "Kowloon City District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "樂富", en: "Lok Fu", districtZh: "黃大仙區", districtEn: "Wong Tai Sin District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "黃大仙", en: "Wong Tai Sin", districtZh: "黃大仙區", districtEn: "Wong Tai Sin District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "鑽石山", en: "Diamond Hill", districtZh: "黃大仙區", districtEn: "Wong Tai Sin District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "彩虹", en: "Choi Hung", districtZh: "黃大仙區", districtEn: "Wong Tai Sin District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "九龍灣", en: "Kowloon Bay", districtZh: "觀塘區", districtEn: "Kwun Tong District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "牛頭角", en: "Ngau Tau Kok", districtZh: "觀塘區", districtEn: "Kwun Tong District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "觀塘", en: "Kwun Tong", districtZh: "觀塘區", districtEn: "Kwun Tong District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "藍田", en: "Lam Tin", districtZh: "觀塘區", districtEn: "Kwun Tong District", regionZh: "九龍", regionEn: "Kowloon" },
  { zh: "油塘", en: "Yau Tong", districtZh: "觀塘區", districtEn: "Kwun Tong District", regionZh: "九龍", regionEn: "Kowloon" },

  // 新界 New Territories
  { zh: "荃灣", en: "Tsuen Wan", districtZh: "荃灣區", districtEn: "Tsuen Wan District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "荃灣西", en: "Tsuen Wan West", districtZh: "荃灣區", districtEn: "Tsuen Wan District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "大窩口", en: "Tai Wo Hau", districtZh: "荃灣區", districtEn: "Tsuen Wan District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "欣澳", en: "Sunny Bay", districtZh: "荃灣區", districtEn: "Tsuen Wan District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "迪士尼", en: "Disneyland Resort", districtZh: "荃灣區", districtEn: "Tsuen Wan District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "葵興", en: "Kwai Hing", districtZh: "葵青區", districtEn: "Kwai Tsing District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "葵芳", en: "Kwai Fong", districtZh: "葵青區", districtEn: "Kwai Tsing District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "荔景", en: "Lai King", districtZh: "葵青區", districtEn: "Kwai Tsing District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "青衣", en: "Tsing Yi", districtZh: "葵青區", districtEn: "Kwai Tsing District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "沙田", en: "Sha Tin", districtZh: "沙田區", districtEn: "Sha Tin District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "大圍", en: "Tai Wai", districtZh: "沙田區", districtEn: "Sha Tin District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "車公廟", en: "Che Kung Temple", districtZh: "沙田區", districtEn: "Sha Tin District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "沙田圍", en: "Sha Tin Wai", districtZh: "沙田區", districtEn: "Sha Tin District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "第一城", en: "City One", districtZh: "沙田區", districtEn: "Sha Tin District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "石門", en: "Shek Mun", districtZh: "沙田區", districtEn: "Sha Tin District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "火炭", en: "Fo Tan", districtZh: "沙田區", districtEn: "Sha Tin District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "馬場", en: "Racecourse", districtZh: "沙田區", districtEn: "Sha Tin District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "大水坑", en: "Tai Shui Hang", districtZh: "沙田區", districtEn: "Sha Tin District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "恆安", en: "Heng On", districtZh: "沙田區", districtEn: "Sha Tin District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "馬鞍山", en: "Ma On Shan", districtZh: "沙田區", districtEn: "Sha Tin District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "烏溪沙", en: "Wu Kai Sha", districtZh: "沙田區", districtEn: "Sha Tin District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "大埔墟", en: "Tai Po Market", districtZh: "大埔區", districtEn: "Tai Po District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "太和", en: "Tai Wo", districtZh: "大埔區", districtEn: "Tai Po District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "粉嶺", en: "Fanling", districtZh: "北區", districtEn: "North District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "上水", en: "Sheung Shui", districtZh: "北區", districtEn: "North District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "落馬洲", en: "Lok Ma Chau", districtZh: "北區", districtEn: "North District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "羅湖", en: "Lo Wu", districtZh: "北區", districtEn: "North District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "兆康", en: "Siu Hong", districtZh: "屯門區", districtEn: "Tuen Mun District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "屯門", en: "Tuen Mun", districtZh: "屯門區", districtEn: "Tuen Mun District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "洪水橋", en: "Hung Shui Kiu", districtZh: "元朗區", districtEn: "Yuen Long District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "天水圍", en: "Tin Shui Wai", districtZh: "元朗區", districtEn: "Yuen Long District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "朗屏", en: "Long Ping", districtZh: "元朗區", districtEn: "Yuen Long District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "元朗", en: "Yuen Long", districtZh: "元朗區", districtEn: "Yuen Long District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "錦上路", en: "Kam Sheung Road", districtZh: "元朗區", districtEn: "Yuen Long District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "康城", en: "LOHAS Park", districtZh: "西貢區", districtEn: "Sai Kung District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "寶琳", en: "Po Lam", districtZh: "西貢區", districtEn: "Sai Kung District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "坑口", en: "Hang Hau", districtZh: "西貢區", districtEn: "Sai Kung District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "將軍澳", en: "Tseung Kwan O", districtZh: "西貢區", districtEn: "Sai Kung District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "調景嶺", en: "Tiu Keng Leng", districtZh: "西貢區", districtEn: "Sai Kung District", regionZh: "新界", regionEn: "New Territories" },
  { zh: "西貢", en: "Sai Kung", districtZh: "西貢區", districtEn: "Sai Kung District", regionZh: "新界", regionEn: "New Territories" },

  // 離島 Islands
  { zh: "東涌", en: "Tung Chung", districtZh: "離島區", districtEn: "Islands District", regionZh: "離島", regionEn: "Islands" },
  { zh: "機場", en: "Airport", districtZh: "離島區", districtEn: "Islands District", regionZh: "離島", regionEn: "Islands" },
  { zh: "博覽館", en: "AsiaWorld-Expo", districtZh: "離島區", districtEn: "Islands District", regionZh: "離島", regionEn: "Islands" },
  { zh: "愉景灣", en: "Discovery Bay", districtZh: "離島區", districtEn: "Islands District", regionZh: "離島", regionEn: "Islands" },
  { zh: "長洲", en: "Cheung Chau", districtZh: "離島區", districtEn: "Islands District", regionZh: "離島", regionEn: "Islands" },
  { zh: "南丫島", en: "Lamma Island", districtZh: "離島區", districtEn: "Islands District", regionZh: "離島", regionEn: "Islands" },
  { zh: "大嶼山", en: "Lantau Island", districtZh: "離島區", districtEn: "Islands District", regionZh: "離島", regionEn: "Islands" },
];

export function getAreaByZh(areaZh: string) {
  return AREA_SELECT_OPTIONS.find((area) => area.zh === areaZh) || null;
}

export function getDistrictByZh(districtZh: string) {
  return DISTRICT_SELECT_OPTIONS.find((district) => district.zh === districtZh) || null;
}