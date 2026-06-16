export const SITE_NAME = "HK Family Fun";
export const WHATSAPP_NUMBER = "85257018297";
export const CONTACT_EMAIL = "info@hkfamilyfun.com";

export const DISTRICTS = [
  "中西區",
  "灣仔",
  "東區",
  "南區",
  "油尖旺",
  "深水埗",
  "九龍城",
  "黃大仙",
  "觀塘",
  "荃灣",
  "屯門",
  "元朗",
  "北區",
  "大埔",
  "沙田",
  "西貢",
  "葵青",
  "離島",
] as const;

export const MTR_STATIONS = [
  "中環",
  "銅鑼灣",
  "尖沙咀",
  "旺角",
  "九龍塘",
  "沙田",
  "荃灣",
  "屯門",
  "元朗",
  "大埔",
  "將軍澳",
  "鑽石山",
  "樂富",
  "黃埔",
  "香港",
  "奧運",
] as const;

export const AGE_GROUPS = [
  "0-2 歲",
  "3-5 歲",
  "6-8 歲",
  "9-12 歲",
  "全齡",
] as const;

export const CATEGORIES = [
  "親子工作坊",
  "戶外活動",
  "藝術文化",
  "運動健身",
  "STEM 科技",
  "節日慶典",
  "音樂表演",
  "博物館",
] as const;

export const TAG_COLORS = [
  "bg-pink-100 text-pink-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
] as const;

export const NAV_LINKS = [
  { href: "/", label: "首頁" },
  { href: "/events", label: "搜尋活動" },
  { href: "/merchant-join", label: "商戶加入" },
] as const;

export const QUICK_FILTERS = [
  { label: "今日活動", param: "today", icon: "📅" },
  { label: "今個週末", param: "weekend", icon: "🎉" },
  { label: "免費活動", param: "free", icon: "🎁" },
  { label: "SEN 友善", param: "sen", icon: "💙" },
] as const;
