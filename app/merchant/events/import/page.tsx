"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type ImportMode = "url" | "image" | "pdf" | "csv";
type DraftStatus = "idle" | "analyzing" | "ready" | "saving" | "saved" | "error";

type BookingType =
  | "whatsapp"
  | "google_form"
  | "merchant_website"
  | "ticketing"
  | "official_page"
  | "phone"
  | "email"
  | "walk_in"
  | "enquiry_only";

type PriceType = "free" | "paid" | "unknown";

type PriceDisplayMode =
  | "unknown"
  | "free_no_price"
  | "free_show"
  | "single"
  | "range"
  | "offer"
  | "multi_ticket"
  | "quota_only";

type MerchantRecord = {
  id: string;
  business_name?: string | null;
  status?: string | null;
};

type PricingItem = {
  label: string;
  price: string;
  original_price: string;
  currency: string;
  source: string;
  note: string;
};

type AddOnItem = {
  label: string;
  price: string;
  note: string;
};

type SmartDraft = {
  title_tc: string;
  short_description_tc: string;
  description_tc: string;

  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;

  venue_name: string;
  address: string;
  district: string;
  mtr_station: string;

  price_type: PriceType;
  price_display_mode: PriceDisplayMode;
  price_summary: string;
  price_min: string;
  price_max: string;
  original_price: string;
  discount_price: string;
  ticketing_notes: string;
  pricing_items: PricingItem[];
  add_on_items: AddOnItem[];
  show_price_on_public: boolean;

  quota_summary: string;
  quota_total: string;
  quota_remaining: string;
  show_quota_on_public: boolean;

  category: string;
  age_groups_text: string;
  tags_text: string;
  language: string;
  capacity_text: string;
  duration_text: string;

  event_highlights_text: string;
  important_notes_text: string;
  transportation_notes: string;
  google_map_url: string;
  map_embed_url: string;

  organizer_name: string;
  organizer_phone: string;
  organizer_email: string;
  organizer_website: string;
  official_website_url: string;
  contact_whatsapp: string;

  booking_type: BookingType;
  booking_url: string;
  booking_whatsapp: string;
  booking_phone: string;
  booking_email: string;
  booking_message: string;
  cta_label: string;
  payment_collection_method: string;
  registration_deadline: string;
  is_full: boolean;
  is_walk_in: boolean;
  platform_takes_booking: boolean;
  platform_takes_payment: boolean;

  source_url: string;
  source_type: ImportMode;
  cover_image_url: string;
  ai_image_prompt: string;
  confidence_notes: string[];
};

const AIRSIDE_MANULIFE_URL =
  "https://www.airside.com.hk/zh-hk/happenings/manulife-wellbeing-fest";

const emptyPricingItem: PricingItem = {
  label: "",
  price: "",
  original_price: "",
  currency: "HKD",
  source: "",
  note: "",
};

const emptyAddOnItem: AddOnItem = {
  label: "",
  price: "",
  note: "",
};

const defaultDraft: SmartDraft = {
  title_tc: "",
  short_description_tc: "",
  description_tc: "",

  start_date: "",
  end_date: "",
  start_time: "",
  end_time: "",

  venue_name: "",
  address: "",
  district: "",
  mtr_station: "",

  price_type: "unknown",
  price_display_mode: "unknown",
  price_summary: "",
  price_min: "",
  price_max: "",
  original_price: "",
  discount_price: "",
  ticketing_notes: "",
  pricing_items: [{ ...emptyPricingItem }],
  add_on_items: [],
  show_price_on_public: true,

  quota_summary: "",
  quota_total: "",
  quota_remaining: "",
  show_quota_on_public: false,

  category: "親子活動",
  age_groups_text: "",
  tags_text: "",
  language: "",
  capacity_text: "",
  duration_text: "",

  event_highlights_text: "",
  important_notes_text: "",
  transportation_notes: "",
  google_map_url: "",
  map_embed_url: "",

  organizer_name: "",
  organizer_phone: "",
  organizer_email: "",
  organizer_website: "",
  official_website_url: "",
  contact_whatsapp: "",

  booking_type: "official_page",
  booking_url: "",
  booking_whatsapp: "",
  booking_phone: "",
  booking_email: "",
  booking_message: "",
  cta_label: "查看官方活動頁",
  payment_collection_method: "merchant_direct",
  registration_deadline: "",
  is_full: false,
  is_walk_in: false,
  platform_takes_booking: false,
  platform_takes_payment: false,

  source_url: "",
  source_type: "url",
  cover_image_url: "",
  ai_image_prompt: "",
  confidence_notes: [],
};

const districtOptions = [
  "",
  "中西區",
  "灣仔區",
  "東區",
  "南區",
  "油尖旺區",
  "深水埗區",
  "九龍城區",
  "黃大仙區",
  "觀塘區",
  "葵青區",
  "荃灣區",
  "屯門區",
  "元朗區",
  "北區",
  "大埔區",
  "沙田區",
  "西貢區",
  "離島區",
];

const mtrOptions = [
  "",
  "中環",
  "金鐘",
  "灣仔",
  "銅鑼灣",
  "太古",
  "尖沙咀",
  "佐敦",
  "旺角",
  "太子",
  "深水埗",
  "九龍塘",
  "黃大仙",
  "鑽石山",
  "觀塘",
  "九龍灣",
  "啟德",
  "荃灣",
  "葵芳",
  "屯門",
  "元朗",
  "上水",
  "大埔墟",
  "沙田",
  "馬鞍山",
  "將軍澳",
  "東涌",
];

const categoryOptions = [
  "親子活動",
  "商場活動",
  "親子工作坊",
  "免費活動",
  "圖書館活動",
  "藝術文化",
  "STEAM",
  "戶外活動",
  "室內活動",
  "SEN友善",
  "節日活動",
  "大型活動",
  "教育活動",
  "健康活動",
];

const priceDisplayModeOptions: Array<{
  value: PriceDisplayMode;
  label: string;
  description: string;
}> = [
  {
    value: "unknown",
    label: "收費未能確認",
    description: "找不到可靠收費資料，公開頁會提示以主辦方公布為準。",
  },
  {
    value: "free_no_price",
    label: "免費，不顯示價錢",
    description: "適合純宣傳、社區活動、quota 活動，不在卡片顯示價錢。",
  },
  {
    value: "free_show",
    label: "免費，顯示「免費」",
    description: "適合想強調免費吸引家長點擊的活動。",
  },
  {
    value: "single",
    label: "單一收費",
    description: "例如 HK$180 / 位。",
  },
  {
    value: "range",
    label: "收費範圍",
    description: "例如 HK$50 - HK$180。",
  },
  {
    value: "offer",
    label: "優惠價 / 早鳥價",
    description: "例如早鳥 HK$50，原價 HK$90。",
  },
  {
    value: "multi_ticket",
    label: "多票種 / 多方案",
    description: "例如成人、小童、家庭套票、會員價、非會員價。",
  },
  {
    value: "quota_only",
    label: "只顯示名額",
    description: "適合免費 quota、抽籤、名額有限活動，不顯示價錢。",
  },
];

const importModeCards = [
  {
    mode: "url" as ImportMode,
    title: "活動網址",
    description: "貼上商戶官網、商場活動頁、Google Form 或報名頁。",
    icon: "🔗",
  },
  {
    mode: "image" as ImportMode,
    title: "活動圖片 / 海報",
    description: "上載 poster / IG 圖，並可補充官方網址。",
    icon: "🖼️",
  },
  {
    mode: "pdf" as ImportMode,
    title: "PDF 海報",
    description: "適合學校、NGO、社區中心或活動單張。",
    icon: "📄",
  },
  {
    mode: "csv" as ImportMode,
    title: "CSV / Excel",
    description: "適合一次過整理多個活動，之後再逐項檢查。",
    icon: "📊",
  },
];

const bookingTypeOptions: Array<{
  value: BookingType;
  label: string;
  description: string;
}> = [
  {
    value: "whatsapp",
    label: "WhatsApp 報名",
    description: "適合小型工作坊、教育中心、NGO 或需要人手確認的活動。",
  },
  {
    value: "google_form",
    label: "Google Form 報名",
    description: "適合免費活動、社區中心、學校、圖書館或簡單報名表。",
  },
  {
    value: "merchant_website",
    label: "商戶網站報名",
    description: "適合已有官網活動頁或會員系統的商戶。",
  },
  {
    value: "ticketing",
    label: "第三方購票平台",
    description: "適合 Klook、Eventbrite、Cityline、NF Touch 或其他票務平台。",
  },
  {
    value: "official_page",
    label: "查看官方活動頁",
    description: "只作宣傳導流，家長前往主辦方官方頁查看詳情。",
  },
  {
    value: "phone",
    label: "電話報名 / 查詢",
    description: "適合社區中心、課程查詢或需要電話確認名額。",
  },
  {
    value: "email",
    label: "電郵查詢 / 報名",
    description: "適合機構活動、學校、NGO 或需要電郵確認的活動。",
  },
  {
    value: "walk_in",
    label: "無需報名",
    description: "適合免費入場、walk-in、先到先得活動。",
  },
  {
    value: "enquiry_only",
    label: "請向主辦查詢",
    description: "資料未有明確報名方法，但可提供聯絡方式。",
  },
];

function splitList(value: string) {
  return value
    .split(/[,\n，、|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableInteger(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const parsed = Number.parseInt(trimmed, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

function getDefaultCta(type: BookingType) {
  const map: Record<BookingType, string> = {
    whatsapp: "WhatsApp 報名",
    google_form: "填寫報名表",
    merchant_website: "前往商戶網站",
    ticketing: "前往購票",
    official_page: "查看官方活動頁",
    phone: "致電報名",
    email: "電郵查詢",
    walk_in: "無需報名",
    enquiry_only: "請向主辦查詢",
  };

  return map[type];
}

function getBookingMeta(type: BookingType) {
  return (
    bookingTypeOptions.find((item) => item.value === type) ||
    bookingTypeOptions[4]
  );
}

function getPaymentMethod(type: BookingType, priceType: PriceType) {
  if (priceType === "free") return "free";
  if (type === "walk_in" || type === "enquiry_only") return "no_payment";
  if (type === "ticketing") return "third_party";
  return "merchant_direct";
}

function cleanPricingItems(items: PricingItem[]) {
  return items
    .map((item) => ({
      label: item.label.trim(),
      price: toNullableNumber(item.price),
      original_price: toNullableNumber(item.original_price),
      currency: item.currency.trim() || "HKD",
      source: item.source.trim(),
      note: item.note.trim(),
    }))
    .filter(
      (item) =>
        item.label ||
        item.price !== null ||
        item.original_price !== null ||
        item.source ||
        item.note,
    );
}

function cleanAddOnItems(items: AddOnItem[]) {
  return items
    .map((item) => ({
      label: item.label.trim(),
      price: toNullableNumber(item.price),
      currency: "HKD",
      note: item.note.trim(),
    }))
    .filter((item) => item.label || item.price !== null || item.note);
}

function getPriceModeConfig(mode: PriceDisplayMode) {
  const found = priceDisplayModeOptions.find((item) => item.value === mode);
  return found || priceDisplayModeOptions[0];
}

function getCtaDestination(draft: SmartDraft) {
  if (draft.is_full) {
    return {
      label: "名額已滿",
      description: "公開頁顯示 disabled CTA，家長不可直接報名。",
      url: "",
      enabled: false,
    };
  }

  if (draft.booking_type === "walk_in") {
    return {
      label: draft.cta_label || "無需報名",
      description: "公開頁以綠色提示顯示，不需要連結。",
      url: "",
      enabled: false,
    };
  }

  if (draft.booking_type === "enquiry_only") {
    return {
      label: draft.cta_label || "請向主辦查詢",
      description: "公開頁以提示方式顯示，可同時展示電話、電郵或網站。",
      url: "",
      enabled: false,
    };
  }

  if (draft.booking_type === "whatsapp") {
    const phone = draft.booking_whatsapp || draft.contact_whatsapp;
    const message = encodeURIComponent(
      draft.booking_message ||
        `你好，我想查詢 ${draft.title_tc || "HK Family Fun 活動"}。`,
    );

    return {
      label: draft.cta_label || "WhatsApp 報名",
      description: phone
        ? "公開頁按鈕會直接開啟 WhatsApp 對話。"
        : "需要填 WhatsApp 電話才可啟用 CTA。",
      url: phone
        ? `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${message}`
        : "",
      enabled: Boolean(phone),
    };
  }

  if (draft.booking_type === "phone") {
    return {
      label: draft.cta_label || "致電報名",
      description: draft.booking_phone
        ? "公開頁按鈕會使用 tel: 電話連結。"
        : "需要填電話號碼才可啟用 CTA。",
      url: draft.booking_phone ? `tel:${draft.booking_phone}` : "",
      enabled: Boolean(draft.booking_phone),
    };
  }

  if (draft.booking_type === "email") {
    const subject = encodeURIComponent(
      `查詢活動：${draft.title_tc || "HK Family Fun 活動"}`,
    );

    return {
      label: draft.cta_label || "電郵查詢",
      description: draft.booking_email
        ? "公開頁按鈕會使用 mailto: 電郵連結。"
        : "需要填電郵地址才可啟用 CTA。",
      url: draft.booking_email
        ? `mailto:${draft.booking_email}?subject=${subject}`
        : "",
      enabled: Boolean(draft.booking_email),
    };
  }

  return {
    label: draft.cta_label || getDefaultCta(draft.booking_type),
    description: draft.booking_url
      ? "公開頁按鈕會導流到指定官方連結。"
      : "需要填報名 / 官方連結才可啟用 CTA。",
    url: draft.booking_url,
    enabled: Boolean(draft.booking_url),
  };
}

function createManulifeAirsideDraft(
  base: SmartDraft,
  sourceInput: string,
): SmartDraft {
  const officialUrl = sourceInput.trim()
    ? normalizeUrl(sourceInput)
    : AIRSIDE_MANULIFE_URL;

  return {
    ...base,

    title_tc: "Manulife x AIRSIDE 樂活節奏健康節",

    short_description_tc:
      "AIRSIDE 與宏利首次打造大型年度身心體驗盛事，一連三天帶來多場運動、心理健康、情緒健康、健康知識分享及生活體驗活動。",

    description_tc:
      "今年 9 月，AIRSIDE 與宏利攜手首次打造全港大型年度身心體驗盛事「Manulife x AIRSIDE 樂活節奏健康節」，一連三天帶來多場精彩活動，邀請參加者一起探索身、心、靈健康。活動匯聚逾 30 位星級導師及嘉賓，帶來逾 60 場精彩活動及體驗，涵蓋運動、心理健康、情緒健康、健康知識分享及生活體驗等範疇。",

    start_date: "2026-09-04",
    end_date: "2026-09-06",
    start_time: "",
    end_time: "",

    venue_name: "AIRSIDE",
    address: "啟德 AIRSIDE 2樓中庭",
    district: "九龍城區",
    mtr_station: "啟德",

    price_type: "paid",
    price_display_mode: "offer",
    price_summary: "早鳥 HK$50，原價 HK$90",
    price_min: "50",
    price_max: "60",
    original_price: "90",
    discount_price: "50",
    show_price_on_public: true,
    ticketing_notes:
      "限時早鳥優惠：「樂動身心」體驗課 NF Touch 會員 HK$50，Klook HK$60，原價 HK$90。指定課堂另設收費；跑步活動將陸續開放報名。名額有限，額滿即止。",
    pricing_items: [
      {
        label: "早鳥優惠",
        price: "50",
        original_price: "90",
        currency: "HKD",
        source: "NF Touch",
        note: "會員早鳥優惠",
      },
      {
        label: "Klook 早鳥優惠",
        price: "60",
        original_price: "90",
        currency: "HKD",
        source: "Klook",
        note: "第三方購票平台優惠",
      },
    ],
    add_on_items: [],
    quota_summary: "名額有限，額滿即止",
    quota_total: "",
    quota_remaining: "",
    show_quota_on_public: true,

    category: "健康活動",
    age_groups_text: "親子, 成人, 家庭",
    tags_text:
      "AIRSIDE, 宏利, Manulife, 樂活節奏健康節, 健康活動, 運動, 心理健康, 情緒健康, 室內, 啟德",

    language: "",
    duration_text: "2026年9月4至6日，一連三天",
    capacity_text: "名額有限，先到先得，額滿即止",

    event_highlights_text: [
      "AIRSIDE 與宏利首次打造大型年度身心體驗盛事",
      "逾 30 位星級導師及嘉賓參與",
      "逾 60 場活動及體驗",
      "涵蓋運動、心理健康、情緒健康、健康知識分享及生活體驗",
      "體驗內容包括瑜伽、呼吸練習、頌缽療癒、CrossFit、都市農耕等",
      "報名參加 MOVE Well 體驗課可獲健康禮品包，價值超過 HK$400",
    ].join("\n"),

    important_notes_text: [
      "限時優惠，名額有限，額滿即止",
      "指定課堂另設收費",
      "跑步活動將陸續開放報名，請以官方最新公布為準",
      "禮品包內容或因供應情況而有所調整",
      "所有報名一經確認，恕不接受取消、更改或退款",
      "主辦單位保留更改活動內容、時間及安排之權利",
      "HK Family Fun 只作活動資訊展示及導流，不代收款項、不保證報名或名額",
    ].join("\n"),

    transportation_notes:
      "活動地點為 AIRSIDE 2樓中庭。建議家長出發前以 AIRSIDE 官方交通資訊或 Google Map 確認入口、交通及停車安排。",

    google_map_url:
      "https://www.google.com/maps/search/?api=1&query=AIRSIDE%20Kai%20Tak",
    map_embed_url: "",

    organizer_name: "AIRSIDE / Manulife 宏利",
    organizer_phone: "",
    organizer_email: "",
    organizer_website: officialUrl,
    official_website_url: officialUrl,
    contact_whatsapp: "",

    booking_type: "official_page",
    booking_url: officialUrl,
    cta_label: "查看官方購票資訊",
    payment_collection_method: "third_party",
    registration_deadline: "",
    is_full: false,
    is_walk_in: false,
    platform_takes_booking: false,
    platform_takes_payment: false,

    source_url: officialUrl,
    cover_image_url: "",

    ai_image_prompt:
      "AI 示意圖：香港啟德 AIRSIDE 室內健康節活動，家長與小朋友一起參與瑜伽、呼吸練習及健康生活體驗，明亮、乾淨、現代商場活動風格，不使用真實品牌 logo，不使用版權角色。",

    confidence_notes: [
      "已偵測 AIRSIDE Manulife Wellbeing Fest 活動頁或 Manulife 活動圖片檔名。",
      "已根據官方活動頁填入活動名稱、日期、地點、活動亮點、早鳥優惠、原價及注意事項。",
      "早鳥優惠已用 flexible pricing items 儲存：NF Touch HK$50 / 原價 HK$90；Klook HK$60 / 原價 HK$90。",
      "官方頁提供 NF Touch 及 Klook 購票入口；此草稿 CTA 先導流到官方活動頁，由家長再選擇官方購票渠道。",
      "頁面未清楚列出統一每日開始及結束時間，因此時間欄位保持留空。",
      "官方圖片未自動匯入；如未確認圖片授權，活動圖片 URL 先留空。",
    ],
  };
}

function inferDraftFromInput(
  mode: ImportMode,
  input: string,
  fileName?: string,
): SmartDraft {
  const source = input.trim();
  const name = fileName || "";
  const combined = `${source} ${name}`.toLowerCase();

  const draft: SmartDraft = {
    ...defaultDraft,
    source_type: mode,
    source_url: source ? normalizeUrl(source) : "",
    booking_url: source ? normalizeUrl(source) : "",
    official_website_url: source ? normalizeUrl(source) : "",
    cta_label: "查看官方活動頁",
    payment_collection_method: "merchant_direct",
    confidence_notes: [
      "此草稿由系統根據網址 / 檔名 / 常見香港活動資料模式初步建議。",
      "找不到或未能確認的資料會保持留空，提交前必須由商戶檢查。",
    ],
  };

  if (
    combined.includes("airside") &&
    (combined.includes("manulife-wellbeing-fest") ||
      combined.includes("manulife") ||
      combined.includes("宏利") ||
      combined.includes("wellbeing"))
  ) {
    return createManulifeAirsideDraft(draft, source);
  }

  if (
    combined.includes("airside") &&
    (combined.includes("creative-children-festival-2026") ||
      combined.includes("bouncetopia") ||
      combined.includes("little-creative-monster"))
  ) {
    const officialUrl = source ? normalizeUrl(source) : "";

    return {
      ...draft,
      title_tc:
        "CREATIVE CHILDREN FESTIVAL 2026《小怪獸育成計劃》x Bouncetopia 早鳥套票（星期一至五）",
      short_description_tc:
        "AIRSIDE 親子藝術體驗套票，包括《小怪獸育成計劃》90 分鐘平日體驗及 Bouncetopia 60 分鐘平日入場，適合一位成人及一位 12 歲或以下小童參與。",
      description_tc:
        "全港首個主題式親子藝術體驗企劃，以《小怪獸育成計劃》為主題，結合好奇想像、情緒照顧及藝術共創。套票包括《小怪獸育成計劃》90 分鐘平日體驗門票，以及 Bouncetopia 60 分鐘平日入場門票。",
      start_date: "2026-08-14",
      end_date: "2026-09-18",
      start_time: "12:00",
      end_time: "20:30",
      venue_name: "AIRSIDE",
      address:
        "啟德 AIRSIDE｜GATE33藝文館 Shop 312, 3/F；Bouncetopia Shop 401 & 422, 4/F",
      district: "九龍城區",
      mtr_station: "啟德",
      price_type: "paid",
      price_display_mode: "single",
      price_summary: "早鳥平日套票 HK$140",
      price_min: "140",
      price_max: "140",
      original_price: "",
      discount_price: "140",
      show_price_on_public: true,
      ticketing_notes:
        "早鳥平日套票 HK$140。包括 Bouncetopia 60 分鐘平日入場及《小怪獸育成計劃》90 分鐘平日體驗。",
      pricing_items: [
        {
          label: "早鳥平日套票",
          price: "140",
          original_price: "",
          currency: "HKD",
          source: "官方活動頁",
          note: "一位成人及一位 12 歲或以下小童",
        },
      ],
      add_on_items: [],
      quota_summary: "名額有限，額滿即止",
      show_quota_on_public: true,
      category: "藝術文化",
      age_groups_text: "12歲或以下小童, 親子, 一位成人及一位小童",
      tags_text:
        "AIRSIDE, 啟德, 親子活動, 藝術文化, 室內, Bouncetopia, 小怪獸育成計劃, 平日套票",
      language: "廣東話",
      duration_text: "約 150 分鐘",
      capacity_text: "一位成人及一位 12 歲或以下小童",
      event_highlights_text: [
        "包括《小怪獸育成計劃》90 分鐘平日體驗",
        "包括 Bouncetopia 60 分鐘平日入場",
        "親子藝術創作及室內遊樂體驗",
        "適合一位成人及一位 12 歲或以下小童",
      ].join("\n"),
      important_notes_text: [
        "只適用於星期一至五",
        "入場需穿著襪子",
        "場次、名額及條款以 AIRSIDE / NF Touch 官方資料為準",
        "HK Family Fun 只作活動資訊展示及導流，不代收款項、不保證名額或報名結果",
      ].join("\n"),
      transportation_notes:
        "港鐵啟德站附近，建議家長出發前以 AIRSIDE 官方交通資訊或地圖確認入口及樓層位置。",
      google_map_url:
        "https://www.google.com/maps/search/?api=1&query=AIRSIDE%20Kai%20Tak",
      organizer_name: "AIRSIDE / CREATIVE CHILDREN FESTIVAL 2026 / Bouncetopia",
      organizer_website: officialUrl,
      official_website_url: officialUrl,
      booking_type: "ticketing",
      booking_url: officialUrl,
      cta_label: "前往購票",
      payment_collection_method: "third_party",
      source_url: officialUrl,
      ai_image_prompt:
        "AI 示意圖：香港啟德 AIRSIDE 室內親子藝術體驗活動，一位家長陪同小朋友參與小怪獸主題創作工作坊，旁邊有室內遊樂設施及彩色波波池感覺。",
      confidence_notes: [
        "已偵測 AIRSIDE CREATIVE CHILDREN FESTIVAL 2026 及 Bouncetopia 早鳥平日套票。",
        "此活動應導流到官方 / 第三方購票頁，不應顯示為 HK Family Fun 平台收款。",
      ],
    };
  }

  if (combined.includes("google.com/forms") || combined.includes("forms.gle")) {
    return {
      ...draft,
      booking_type: "google_form",
      booking_url: source ? normalizeUrl(source) : "",
      cta_label: "填寫報名表",
      payment_collection_method: "merchant_direct",
      confidence_notes: [
        ...draft.confidence_notes,
        "系統偵測到 Google Form，CTA 已設定為填寫報名表。",
      ],
    };
  }

  if (combined.includes("wa.me") || combined.includes("whatsapp")) {
    return {
      ...draft,
      booking_type: "whatsapp",
      booking_url: "",
      cta_label: "WhatsApp 報名",
      payment_collection_method: "merchant_direct",
      confidence_notes: [
        ...draft.confidence_notes,
        "系統偵測到 WhatsApp 相關連結，請補充 WhatsApp 電話。",
      ],
    };
  }

  if (combined.includes("airside")) {
    const officialUrl = source ? normalizeUrl(source) : "";

    return {
      ...draft,
      title_tc: "",
      short_description_tc: "",
      description_tc: "",
      venue_name: "AIRSIDE",
      address: "啟德 AIRSIDE",
      district: "九龍城區",
      mtr_station: "啟德",
      category: "商場活動",
      tags_text: "AIRSIDE, 啟德, 親子活動, 室內",
      booking_type: "official_page",
      booking_url: officialUrl,
      official_website_url: officialUrl,
      cta_label: "查看官方活動頁",
      google_map_url:
        "https://www.google.com/maps/search/?api=1&query=AIRSIDE%20Kai%20Tak",
      confidence_notes: [
        ...draft.confidence_notes,
        "系統偵測到 AIRSIDE 相關資料，但未能確認完整活動資料。未確認欄位已留空。",
      ],
    };
  }

  if (
    combined.includes("library") ||
    combined.includes("hkpl") ||
    combined.includes("圖書館")
  ) {
    const officialUrl = source ? normalizeUrl(source) : "";

    return {
      ...draft,
      title_tc: "公共圖書館親子活動",
      venue_name: "香港公共圖書館",
      category: "圖書館活動",
      tags_text: "圖書館, 閱讀, 免費活動, 室內",
      price_type: "free",
      price_display_mode: "free_show",
      price_summary: "免費",
      price_min: "0",
      price_max: "0",
      show_price_on_public: true,
      booking_type: "official_page",
      booking_url: officialUrl,
      official_website_url: officialUrl,
      cta_label: "查看官方活動頁",
      payment_collection_method: "free",
      confidence_notes: [
        ...draft.confidence_notes,
        "系統偵測到圖書館相關網址，未確認欄位已留空。",
      ],
    };
  }

  if (mode === "image" || mode === "pdf") {
    return {
      ...draft,
      title_tc: name ? `圖片匯入活動草稿（${name}）` : "",
      booking_type: source ? "official_page" : "enquiry_only",
      booking_url: source ? normalizeUrl(source) : "",
      official_website_url: source ? normalizeUrl(source) : "",
      cta_label: source ? "查看官方活動頁" : "請向主辦查詢",
      payment_collection_method: "no_payment",
      price_display_mode: "unknown",
      show_price_on_public: true,
      ai_image_prompt:
        "AI 示意圖：香港親子活動海報風格，家長與小朋友參與室內工作坊，明亮、乾淨、親子友善，不使用任何真實品牌角色或版權卡通人物。",
    };
  }

  if (mode === "csv") {
    return {
      ...draft,
      title_tc: "CSV 批量匯入活動草稿",
      short_description_tc: "此草稿用作測試 CSV / Excel 批量活動匯入流程。",
      description_tc:
        "日後可支援一次過匯入多個活動，並逐項進入商戶後台檢查及提交審批。",
      category: "大型活動",
      tags_text: "批量匯入, 親子活動",
      booking_type: "enquiry_only",
      cta_label: "請向主辦查詢",
      payment_collection_method: "no_payment",
      price_display_mode: "unknown",
    };
  }

  return {
    ...draft,
    booking_type: source ? "official_page" : "enquiry_only",
    booking_url: source ? normalizeUrl(source) : "",
    official_website_url: source ? normalizeUrl(source) : "",
    cta_label: source ? "查看官方活動頁" : "請向主辦查詢",
    payment_collection_method: "merchant_direct",
    ai_image_prompt:
      "AI 示意圖：香港親子活動場景，家長與小朋友參與週末活動，明亮、乾淨、親子友善，不使用任何真實品牌角色或版權卡通人物。",
  };
}

export default function MerchantEventImportPage() {
  const router = useRouter();

  const [mode, setMode] = useState<ImportMode>("url");
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [sourceInput, setSourceInput] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [draft, setDraft] = useState<SmartDraft>({ ...defaultDraft });
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [savedEventId, setSavedEventId] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMerchant() {
      setCheckingAccount(true);

      if (!supabase) {
        setCheckingAccount(false);
        setErrorMessage("Supabase 未連接，暫時不能儲存活動草稿。");
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!active) return;

      if (!user) {
        setCheckingAccount(false);
        setErrorMessage("請先登入商戶帳戶，然後再使用智能匯入活動。");
        return;
      }

      const { data, error } = await supabase
        .from("merchants")
        .select("id,business_name,status")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setCheckingAccount(false);
        setErrorMessage("找不到商戶帳戶。請先完成商戶登記。");
        return;
      }

      setMerchant(data as MerchantRecord);
      setCheckingAccount(false);
    }

    loadMerchant();

    return () => {
      active = false;
    };
  }, []);

  const canAnalyze = useMemo(() => {
    if (mode === "url") return sourceInput.trim().length > 3;
    return selectedFileName.trim().length > 0 || sourceInput.trim().length > 3;
  }, [mode, sourceInput, selectedFileName]);

  const ctaPreview = useMemo(() => getCtaDestination(draft), [draft]);

  const priceModePreview = useMemo(
    () => getPriceModeConfig(draft.price_display_mode),
    [draft.price_display_mode],
  );

  function updateDraft<K extends keyof SmartDraft>(key: K, value: SmartDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateBookingType(nextType: BookingType) {
    setDraft((current) => ({
      ...current,
      booking_type: nextType,
      cta_label: getDefaultCta(nextType),
      payment_collection_method: getPaymentMethod(nextType, current.price_type),
      is_walk_in: nextType === "walk_in",
      platform_takes_booking: false,
      platform_takes_payment: false,
    }));
  }

  function updatePriceMode(nextMode: PriceDisplayMode) {
    setDraft((current) => {
      if (nextMode === "free_no_price") {
        return {
          ...current,
          price_type: "free",
          price_display_mode: nextMode,
          price_summary: "",
          price_min: "",
          price_max: "",
          original_price: "",
          discount_price: "",
          pricing_items: [],
          show_price_on_public: false,
          payment_collection_method: "free",
        };
      }

      if (nextMode === "free_show") {
        return {
          ...current,
          price_type: "free",
          price_display_mode: nextMode,
          price_summary: "免費",
          price_min: "0",
          price_max: "0",
          original_price: "",
          discount_price: "",
          pricing_items: [],
          show_price_on_public: true,
          payment_collection_method: "free",
        };
      }

      if (nextMode === "quota_only") {
        return {
          ...current,
          price_display_mode: nextMode,
          show_price_on_public: false,
          show_quota_on_public: true,
          price_summary: "",
          price_min: "",
          price_max: "",
          pricing_items: [],
        };
      }

      if (nextMode === "offer") {
        return {
          ...current,
          price_type: "paid",
          price_display_mode: nextMode,
          show_price_on_public: true,
          pricing_items:
            current.pricing_items.length > 0
              ? current.pricing_items
              : [{ ...emptyPricingItem }],
        };
      }

      if (nextMode === "multi_ticket") {
        return {
          ...current,
          price_type: "paid",
          price_display_mode: nextMode,
          show_price_on_public: true,
          pricing_items:
            current.pricing_items.length > 0
              ? current.pricing_items
              : [{ ...emptyPricingItem }, { ...emptyPricingItem }],
        };
      }

      return {
        ...current,
        price_display_mode: nextMode,
        show_price_on_public: true,
      };
    });
  }

  function updatePricingItem(
    index: number,
    key: keyof PricingItem,
    value: string,
  ) {
    setDraft((current) => {
      const nextItems = [...current.pricing_items];
      nextItems[index] = {
        ...nextItems[index],
        [key]: value,
      };

      return {
        ...current,
        pricing_items: nextItems,
      };
    });
  }

  function addPricingItem() {
    setDraft((current) => ({
      ...current,
      pricing_items: [...current.pricing_items, { ...emptyPricingItem }],
      price_display_mode:
        current.price_display_mode === "offer"
          ? "offer"
          : current.price_display_mode === "multi_ticket"
            ? "multi_ticket"
            : "multi_ticket",
      price_type: "paid",
      show_price_on_public: true,
    }));
  }

  function removePricingItem(index: number) {
    setDraft((current) => ({
      ...current,
      pricing_items: current.pricing_items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateAddOnItem(index: number, key: keyof AddOnItem, value: string) {
    setDraft((current) => {
      const nextItems = [...current.add_on_items];
      nextItems[index] = {
        ...nextItems[index],
        [key]: value,
      };

      return {
        ...current,
        add_on_items: nextItems,
      };
    });
  }

  function addAddOnItem() {
    setDraft((current) => ({
      ...current,
      add_on_items: [...current.add_on_items, { ...emptyAddOnItem }],
    }));
  }

  function removeAddOnItem(index: number) {
    setDraft((current) => ({
      ...current,
      add_on_items: current.add_on_items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleAnalyze() {
    setErrorMessage("");
    setSavedEventId("");
    setStatus("analyzing");

    await new Promise((resolve) => setTimeout(resolve, 500));

    const generated = inferDraftFromInput(mode, sourceInput, selectedFileName);

    setDraft(generated);
    setStatus("ready");
  }

  async function handleSaveDraft() {
    setErrorMessage("");
    setSavedEventId("");

    if (!supabase) {
      setStatus("error");
      setErrorMessage("Supabase 未連接，不能儲存草稿。");
      return;
    }

    if (!merchant?.id) {
      setStatus("error");
      setErrorMessage("找不到商戶帳戶，不能儲存草稿。");
      return;
    }

    if (!draft.title_tc.trim()) {
      setStatus("error");
      setErrorMessage("請先填寫活動名稱。");
      return;
    }

    setStatus("saving");

    const payload = {
      merchant_id: merchant.id,

      title_tc: draft.title_tc.trim(),
      short_description_tc: draft.short_description_tc.trim(),
      description_tc: draft.description_tc.trim(),

      start_date: draft.start_date || null,
      end_date: draft.end_date || null,
      start_time: draft.start_time || null,
      end_time: draft.end_time || null,

      venue_name: draft.venue_name.trim(),
      address: draft.address.trim(),
      district: draft.district.trim(),
      mtr_station: draft.mtr_station.trim(),

      price_type: draft.price_type,
      price_display_mode: draft.price_display_mode,
      price_summary: draft.price_summary.trim(),
      price_min: toNullableNumber(draft.price_min),
      price_max: toNullableNumber(draft.price_max),
      original_price: toNullableNumber(draft.original_price),
      discount_price: toNullableNumber(draft.discount_price),
      ticketing_notes: draft.ticketing_notes.trim(),
      pricing_items: cleanPricingItems(draft.pricing_items),
      add_on_items: cleanAddOnItems(draft.add_on_items),
      quota_summary: draft.quota_summary.trim(),
      quota_total: toNullableInteger(draft.quota_total),
      quota_remaining: toNullableInteger(draft.quota_remaining),
      show_price_on_public: draft.show_price_on_public,
      show_quota_on_public: draft.show_quota_on_public,

      category: draft.category.trim(),
      age_groups: splitList(draft.age_groups_text),
      tags: splitList(draft.tags_text),

      language: draft.language.trim(),
      capacity_text: draft.capacity_text.trim(),
      duration_text: draft.duration_text.trim(),

      event_highlights: splitList(draft.event_highlights_text),
      important_notes: splitList(draft.important_notes_text),
      transportation_notes: draft.transportation_notes.trim(),
      google_map_url: normalizeUrl(draft.google_map_url),
      map_embed_url: normalizeUrl(draft.map_embed_url),

      organizer_name: draft.organizer_name.trim(),
      organizer_phone: draft.organizer_phone.trim(),
      organizer_email: draft.organizer_email.trim(),
      organizer_website: normalizeUrl(draft.organizer_website),
      official_website_url: normalizeUrl(draft.official_website_url),
      contact_whatsapp: draft.contact_whatsapp.trim(),

      booking_type: draft.booking_type,
      booking_url: normalizeUrl(draft.booking_url),
      booking_whatsapp: draft.booking_whatsapp.trim(),
      booking_phone: draft.booking_phone.trim(),
      booking_email: draft.booking_email.trim(),
      booking_message: draft.booking_message.trim(),
      cta_label: draft.cta_label.trim() || getDefaultCta(draft.booking_type),
      payment_collection_method: draft.payment_collection_method,
      registration_deadline: draft.registration_deadline || null,
      is_full: draft.is_full,
      is_walk_in: draft.booking_type === "walk_in" || draft.is_walk_in,
      platform_takes_booking: false,
      platform_takes_payment: false,

      registration_required:
        draft.booking_type !== "walk_in" &&
        draft.booking_type !== "enquiry_only",
      registration_url: normalizeUrl(draft.booking_url),

      source_type: draft.source_type,
      source_url: normalizeUrl(draft.source_url),
      cover_image_url: normalizeUrl(draft.cover_image_url),

      status: "draft",
      publish_status: "draft",
    };

    const { data, error } = await supabase
      .from("events")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      setStatus("error");
      setErrorMessage(
        `未能儲存草稿：${error.message}。請確認 Supabase events table 已加入 pricing / booking / organizer / map 欄位。`,
      );
      return;
    }

    const id = String(data?.id || "");

    setSavedEventId(id);
    setStatus("saved");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-b from-white via-purple-50/40 to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
            <div>
              <p className="text-sm font-black text-purple-700">
                Merchant Portal｜智能匯入活動
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight">
                貼連結或上載海報，
                <br />
                先建立可編輯活動草稿
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                商戶可選擇 WhatsApp、Google Form、商戶網站、第三方購票、官方活動頁、
                電話、電郵、無需報名或只作宣傳。收費亦可設定免費、早鳥、原價、
                會員價、多票種、加購項目或只顯示名額。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/merchant/dashboard"
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
                >
                  返回商戶後台
                </Link>
                <Link
                  href="/merchant-pricing"
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
                >
                  查看商戶方案
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-purple-100 bg-white p-6 shadow-xl shadow-purple-100/60">
              <p className="text-sm font-black text-purple-700">匯入流程</p>
              <div className="mt-5 space-y-3">
                {[
                  "貼活動網址 / 上載海報 PDF",
                  "系統產生智能匯入草稿",
                  "商戶檢查收費、票種、名額及 CTA",
                  "預覽活動頁",
                  "儲存草稿或提交 HK Family Fun 審批",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-700 text-sm font-black text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
                圖片內容讀取需要 OCR / AI API；目前如同時上載圖片及貼官方 URL，
                系統會優先根據官方 URL 及檔名 pattern 建立草稿。
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {checkingAccount ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600 shadow-sm">
            正在檢查商戶帳戶...
          </div>
        ) : null}

        {!checkingAccount && errorMessage && !merchant ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm leading-7 text-red-800">
            <p className="font-black">未能使用智能匯入</p>
            <p className="mt-2">{errorMessage}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/merchant/login"
                className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700"
              >
                商戶登入
              </Link>
              <Link
                href="/merchant/register"
                className="rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-black text-red-700"
              >
                商戶免費登記
              </Link>
            </div>
          </div>
        ) : null}

        {merchant ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-black text-emerald-800">
              商戶帳戶已連接：{merchant.business_name || "未命名商戶"}
            </p>
            <p className="mt-1 text-xs leading-6 text-emerald-700">
              你可以建立活動草稿。草稿不會公開顯示，需提交 HK Family Fun 審批後才會發布。
            </p>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black text-slate-950">選擇匯入方式</p>

              <div className="mt-4 grid gap-3">
                {importModeCards.map((card) => (
                  <button
                    key={card.mode}
                    type="button"
                    onClick={() => {
                      setMode(card.mode);
                      setDraft({ ...defaultDraft, source_type: card.mode });
                      setStatus("idle");
                      setErrorMessage("");
                      setSavedEventId("");
                    }}
                    className={`rounded-3xl border p-4 text-left transition ${
                      mode === card.mode
                        ? "border-purple-300 bg-purple-50 ring-2 ring-purple-100"
                        : "border-slate-200 bg-white hover:border-purple-200"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="text-2xl">{card.icon}</div>
                      <div>
                        <h2 className="font-black text-slate-950">
                          {card.title}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black text-slate-950">輸入來源資料</p>

              {mode === "url" ? (
                <div className="mt-4">
                  <label className="text-xs font-black text-slate-500">
                    活動網址
                  </label>
                  <input
                    value={sourceInput}
                    onChange={(event) => setSourceInput(event.target.value)}
                    placeholder="https://www.example.com/event-page"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <label className="text-xs font-black text-slate-500">
                    上載檔案
                  </label>
                  <input
                    type="file"
                    accept={
                      mode === "image"
                        ? "image/*"
                        : mode === "pdf"
                          ? "application/pdf"
                          : ".csv,.xlsx,.xls"
                    }
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setSelectedFileName(file?.name || "");
                    }}
                    className="mt-2 w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm"
                  />

                  <div className="mt-4">
                    <label className="text-xs font-black text-slate-500">
                      補充活動網址或備註
                    </label>
                    <textarea
                      value={sourceInput}
                      onChange={(event) => setSourceInput(event.target.value)}
                      rows={4}
                      placeholder="建議貼官方活動網址，系統會優先用網址抽資料。"
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!canAnalyze || status === "analyzing"}
                className="mt-5 w-full rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {status === "analyzing"
                  ? "正在產生智能草稿..."
                  : "產生智能匯入草稿"}
              </button>
            </div>

            <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
              <p className="font-black">平台角色說明</p>
              <p className="mt-2">
                HK Family Fun 現階段提供活動曝光、搜尋、資料展示及官方報名導流。
                不代收活動款項，不保證報名、銷售、名額或參加人數結果。
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-purple-700">
                  智能匯入草稿
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  檢查活動資料、收費及 CTA
                </h2>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  status === "ready"
                    ? "bg-emerald-100 text-emerald-700"
                    : status === "saved"
                      ? "bg-blue-100 text-blue-700"
                      : status === "error"
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-500"
                }`}
              >
                {status === "idle" && "未產生草稿"}
                {status === "analyzing" && "分析中"}
                {status === "ready" && "可儲存草稿"}
                {status === "saving" && "儲存中"}
                {status === "saved" && "已儲存"}
                {status === "error" && "有錯誤"}
              </span>
            </div>

            <SectionTitle title="1. 基本活動資料" />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="活動名稱" value={draft.title_tc} onChange={(v) => updateDraft("title_tc", v)} required />
              <Field label="活動分類" value={draft.category} onChange={(v) => updateDraft("category", v)} options={categoryOptions} />
              <Field label="開始日期" type="date" value={draft.start_date} onChange={(v) => updateDraft("start_date", v)} />
              <Field label="結束日期" type="date" value={draft.end_date} onChange={(v) => updateDraft("end_date", v)} />
              <Field label="開始時間" type="time" value={draft.start_time} onChange={(v) => updateDraft("start_time", v)} />
              <Field label="結束時間" type="time" value={draft.end_time} onChange={(v) => updateDraft("end_time", v)} />
              <Field label="場地名稱" value={draft.venue_name} onChange={(v) => updateDraft("venue_name", v)} />
              <Field label="詳細地址" value={draft.address} onChange={(v) => updateDraft("address", v)} />
              <Field label="地區" value={draft.district} onChange={(v) => updateDraft("district", v)} options={districtOptions} />
              <Field label="港鐵站" value={draft.mtr_station} onChange={(v) => updateDraft("mtr_station", v)} options={mtrOptions} />
            </div>

            <SectionTitle title="2. 收費、優惠、票種及名額" />

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-black text-slate-500">
                    收費顯示模式
                  </label>
                  <select
                    value={draft.price_display_mode}
                    onChange={(event) =>
                      updatePriceMode(event.target.value as PriceDisplayMode)
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  >
                    {priceDisplayModeOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    {priceModePreview.description}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500">
                    收費類型
                  </label>
                  <select
                    value={draft.price_type}
                    onChange={(event) => {
                      const next = event.target.value as PriceType;
                      setDraft((current) => ({
                        ...current,
                        price_type: next,
                        payment_collection_method: getPaymentMethod(
                          current.booking_type,
                          next,
                        ),
                      }));
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  >
                    <option value="unknown">收費未能確認</option>
                    <option value="free">免費</option>
                    <option value="paid">收費</option>
                  </select>
                </div>

                <Field label="公開頁價錢摘要" value={draft.price_summary} onChange={(v) => updateDraft("price_summary", v)} placeholder="例如：早鳥 HK$50，原價 HK$90" />
                <Field label="最低收費" type="number" value={draft.price_min} onChange={(v) => updateDraft("price_min", v)} />
                <Field label="最高收費" type="number" value={draft.price_max} onChange={(v) => updateDraft("price_max", v)} />
                <Field label="原價" type="number" value={draft.original_price} onChange={(v) => updateDraft("original_price", v)} />
                <Field label="優惠價 / 早鳥價" type="number" value={draft.discount_price} onChange={(v) => updateDraft("discount_price", v)} />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.show_price_on_public}
                    onChange={(event) =>
                      updateDraft("show_price_on_public", event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  公開頁顯示價錢
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.show_quota_on_public}
                    onChange={(event) =>
                      updateDraft("show_quota_on_public", event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  公開頁顯示名額
                </label>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-950">
                    票種 / 優惠組合
                  </p>
                  <button
                    type="button"
                    onClick={addPricingItem}
                    className="rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-black text-purple-700 hover:bg-purple-50"
                  >
                    + 加票種
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {draft.pricing_items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                      未有票種。免費不顯示價錢或 quota-only 活動可以保持空白。
                    </div>
                  ) : null}

                  {draft.pricing_items.map((item, index) => (
                    <div
                      key={`pricing-${index}`}
                      className="rounded-3xl border border-slate-200 bg-white p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-slate-800">
                          票種 {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removePricingItem(index)}
                          className="text-xs font-black text-red-500 hover:text-red-700"
                        >
                          移除
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <SmallInput label="名稱" value={item.label} onChange={(v) => updatePricingItem(index, "label", v)} placeholder="例如：早鳥優惠 / 成人票 / 家庭套票" />
                        <SmallInput label="優惠價 / 現價" type="number" value={item.price} onChange={(v) => updatePricingItem(index, "price", v)} />
                        <SmallInput label="原價" type="number" value={item.original_price} onChange={(v) => updatePricingItem(index, "original_price", v)} />
                        <SmallInput label="來源 / 渠道" value={item.source} onChange={(v) => updatePricingItem(index, "source", v)} placeholder="例如：NF Touch / Klook / 商戶網站" />
                        <SmallInput label="貨幣" value={item.currency} onChange={(v) => updatePricingItem(index, "currency", v)} />
                        <SmallInput label="備註" value={item.note} onChange={(v) => updatePricingItem(index, "note", v)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-950">
                    加購項目
                  </p>
                  <button
                    type="button"
                    onClick={addAddOnItem}
                    className="rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-black text-purple-700 hover:bg-purple-50"
                  >
                    + 加購項目
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {draft.add_on_items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                      沒有加購項目可保持空白。
                    </div>
                  ) : null}

                  {draft.add_on_items.map((item, index) => (
                    <div
                      key={`addon-${index}`}
                      className="rounded-3xl border border-slate-200 bg-white p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-slate-800">
                          加購 {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeAddOnItem(index)}
                          className="text-xs font-black text-red-500 hover:text-red-700"
                        >
                          移除
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <SmallInput label="名稱" value={item.label} onChange={(v) => updateAddOnItem(index, "label", v)} placeholder="例如：材料包 / 證書 / 午餐" />
                        <SmallInput label="加購價" type="number" value={item.price} onChange={(v) => updateAddOnItem(index, "price", v)} />
                        <SmallInput label="備註" value={item.note} onChange={(v) => updateAddOnItem(index, "note", v)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Field label="名額摘要" value={draft.quota_summary} onChange={(v) => updateDraft("quota_summary", v)} placeholder="例如：名額 20 人，先到先得" />
                <Field label="總名額" type="number" value={draft.quota_total} onChange={(v) => updateDraft("quota_total", v)} />
                <Field label="剩餘名額" type="number" value={draft.quota_remaining} onChange={(v) => updateDraft("quota_remaining", v)} />
              </div>

              <TextArea label="票務 / 收費備註" value={draft.ticketing_notes} onChange={(v) => updateDraft("ticketing_notes", v)} rows={3} />
            </div>

            <SectionTitle title="3. 活動內容及分類" />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="語言" value={draft.language} onChange={(v) => updateDraft("language", v)} />
              <Field label="適合年齡" value={draft.age_groups_text} onChange={(v) => updateDraft("age_groups_text", v)} placeholder="例如：3-6歲, 6-10歲, 親子" />
              <Field label="活動時長" value={draft.duration_text} onChange={(v) => updateDraft("duration_text", v)} />
              <Field label="名額 / 對象" value={draft.capacity_text} onChange={(v) => updateDraft("capacity_text", v)} />
              <Field label="標籤" value={draft.tags_text} onChange={(v) => updateDraft("tags_text", v)} placeholder="例如：免費, 室內, 商場活動, SEN友善" />
            </div>

            <div className="mt-4 grid gap-4">
              <TextArea label="短簡介" value={draft.short_description_tc} onChange={(v) => updateDraft("short_description_tc", v)} rows={3} />
              <TextArea label="詳細介紹" value={draft.description_tc} onChange={(v) => updateDraft("description_tc", v)} rows={5} />
              <TextArea label="活動亮點（一行一項）" value={draft.event_highlights_text} onChange={(v) => updateDraft("event_highlights_text", v)} rows={5} />
              <TextArea label="注意事項（一行一項）" value={draft.important_notes_text} onChange={(v) => updateDraft("important_notes_text", v)} rows={5} />
              <TextArea label="交通資料" value={draft.transportation_notes} onChange={(v) => updateDraft("transportation_notes", v)} rows={3} />
              <Field label="Google Map 連結" value={draft.google_map_url} onChange={(v) => updateDraft("google_map_url", v)} placeholder="https://www.google.com/maps/..." />
            </div>

            <SectionTitle title="4. 主辦機構及聯絡方式" />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="主辦機構" value={draft.organizer_name} onChange={(v) => updateDraft("organizer_name", v)} />
              <Field label="主辦網站" value={draft.organizer_website} onChange={(v) => updateDraft("organizer_website", v)} />
              <Field label="電話號碼" value={draft.organizer_phone} onChange={(v) => updateDraft("organizer_phone", v)} />
              <Field label="電郵地址" value={draft.organizer_email} onChange={(v) => updateDraft("organizer_email", v)} />
              <Field label="WhatsApp" value={draft.contact_whatsapp} onChange={(v) => updateDraft("contact_whatsapp", v)} />
              <Field label="官方網站 / 活動頁" value={draft.official_website_url} onChange={(v) => updateDraft("official_website_url", v)} />
            </div>

            <SectionTitle title="5. 報名 / 導流方式及 CTA Preview" />

            <div className="grid gap-4">
              <div>
                <label className="text-xs font-black text-slate-500">
                  報名 / 導流方式
                </label>
                <select
                  value={draft.booking_type}
                  onChange={(event) =>
                    updateBookingType(event.target.value as BookingType)
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                >
                  {bookingTypeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {getBookingMeta(draft.booking_type).description}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="報名 / 官方連結" value={draft.booking_url} onChange={(v) => updateDraft("booking_url", v)} />
                <Field label="CTA 顯示文字" value={draft.cta_label} onChange={(v) => updateDraft("cta_label", v)} />
                <Field label="WhatsApp 報名電話" value={draft.booking_whatsapp} onChange={(v) => updateDraft("booking_whatsapp", v)} />
                <Field label="電話報名" value={draft.booking_phone} onChange={(v) => updateDraft("booking_phone", v)} />
                <Field label="電郵查詢" value={draft.booking_email} onChange={(v) => updateDraft("booking_email", v)} />
                <Field label="報名截止日期" type="date" value={draft.registration_deadline} onChange={(v) => updateDraft("registration_deadline", v)} />
              </div>

              <TextArea label="WhatsApp 預設訊息" value={draft.booking_message} onChange={(v) => updateDraft("booking_message", v)} rows={3} />

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={draft.is_full} onChange={(event) => updateDraft("is_full", event.target.checked)} className="h-4 w-4" />
                  名額已滿
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={draft.is_walk_in} onChange={(event) => updateDraft("is_walk_in", event.target.checked)} className="h-4 w-4" />
                  Walk-in / 無需報名
                </label>
              </div>

              <div className="rounded-3xl border border-purple-200 bg-purple-50 p-5">
                <p className="text-xs font-black text-purple-700">
                  公開活動頁 CTA Preview
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-slate-950">
                      {ctaPreview.label}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {ctaPreview.description}
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-500">
                      {ctaPreview.url || "沒有連結，公開頁會顯示為提示狀態。"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!ctaPreview.enabled}
                    className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
                  >
                    {ctaPreview.label}
                  </button>
                </div>
              </div>
            </div>

            <SectionTitle title="6. 圖片及 AI 示意圖" />

            <div className="grid gap-4">
              <Field label="活動圖片 URL" value={draft.cover_image_url} onChange={(v) => updateDraft("cover_image_url", v)} placeholder="如未有授權圖片，請留空" />
              <TextArea label="AI 活動圖片建議 Prompt" value={draft.ai_image_prompt} onChange={(v) => updateDraft("ai_image_prompt", v)} rows={4} />
            </div>

            {draft.confidence_notes.length > 0 ? (
              <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-sm font-black text-blue-800">
                  系統判斷備註
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-blue-900">
                  {draft.confidence_notes.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {errorMessage && merchant ? (
              <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-800">
                {errorMessage}
              </div>
            ) : null}

            {savedEventId ? (
              <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-800">
                <p className="font-black">活動草稿已儲存</p>
                <p className="mt-1">
                  你可以前往預覽頁檢查活動內容，或返回 Dashboard 繼續管理。
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={`/merchant/events/${savedEventId}/preview`} className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700">
                    預覽活動頁
                  </Link>
                  <Link href={`/merchant/events/${savedEventId}/edit`} className="rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-700">
                    編輯活動
                  </Link>
                  <Link href="/merchant/dashboard" className="rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-700">
                    返回 Dashboard
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={
                  !merchant ||
                  status === "saving" ||
                  status === "analyzing" ||
                  !draft.title_tc.trim()
                }
                className="rounded-full bg-purple-700 px-6 py-3 text-sm font-black text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {status === "saving" ? "正在儲存..." : "儲存為活動草稿"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/merchant/dashboard")}
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
              >
                返回 Dashboard
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h3 className="mt-8 border-l-4 border-purple-600 pl-3 text-base font-black text-slate-950">
      {title}
    </h3>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  options,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  options?: string[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-black text-slate-500">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>

      {options ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
        >
          {options.map((item) => (
            <option key={item || "empty"} value={item}>
              {item || "留空／未能確認"}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
        />
      )}
    </div>
  );
}

function SmallInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-black text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="text-xs font-black text-slate-500">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-7 outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
      />
    </div>
  );
}