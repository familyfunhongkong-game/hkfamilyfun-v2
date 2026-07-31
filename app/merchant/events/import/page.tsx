"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type ImportMode = "url" | "image" | "pdf" | "csv";
type DraftStatus = "idle" | "analyzing" | "ready" | "saving" | "saved" | "error";
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

type MerchantRecord = {
  id: string;
  business_name?: string | null;
  status?: string | null;
};

type PricingItem = {
  label: string;
  price: string;
  originalPriceOverride: string;
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
  category: string;

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

  source_url: string;
  source_type: ImportMode;
  cover_image_url: string;
  ai_image_prompt: string;
  confidence_notes: string[];
};

const emptyPricingItem: PricingItem = {
  label: "",
  price: "",
  originalPriceOverride: "",
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
  category: "親子活動",

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
}> = [
  { value: "unknown", label: "收費未能確認" },
  { value: "free_no_price", label: "免費，不顯示價錢" },
  { value: "free_show", label: "免費，顯示免費" },
  { value: "single", label: "單一收費" },
  { value: "range", label: "收費範圍" },
  { value: "offer", label: "優惠價 / 早鳥價" },
  { value: "multi_ticket", label: "多票種 / 多方案" },
  { value: "quota_only", label: "只顯示名額" },
];

const bookingTypeOptions: Array<{
  value: BookingType;
  label: string;
}> = [
  { value: "whatsapp", label: "WhatsApp 報名" },
  { value: "google_form", label: "Google Form 報名" },
  { value: "merchant_website", label: "商戶網站報名" },
  { value: "ticketing", label: "第三方購票平台" },
  { value: "official_page", label: "查看官方活動頁" },
  { value: "phone", label: "電話報名 / 查詢" },
  { value: "email", label: "電郵查詢 / 報名" },
  { value: "walk_in", label: "無需報名" },
  { value: "enquiry_only", label: "請向主辦查詢" },
];

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function nullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitList(value: string) {
  return value
    .split(/[,\n，、|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDefaultCta(type: BookingType) {
  const labels: Record<BookingType, string> = {
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

  return labels[type];
}

function googleMapLinkFromDraft(draft: SmartDraft) {
  if (draft.google_map_url.trim()) return normalizeUrl(draft.google_map_url);

  const query = [
    draft.venue_name,
    draft.address,
    draft.district,
    draft.mtr_station,
    "Hong Kong",
  ]
    .filter(Boolean)
    .join(" ");

  if (!query.trim()) return "";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query,
  )}`;
}

function mapEmbedFromDraft(draft: SmartDraft) {
  if (draft.map_embed_url.trim()) return normalizeUrl(draft.map_embed_url);

  const query = [
    draft.venue_name,
    draft.address,
    draft.district,
    draft.mtr_station,
    "Hong Kong",
  ]
    .filter(Boolean)
    .join(" ");

  if (!query.trim()) return "";

  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function cleanPricingItems(items: PricingItem[], sharedOriginalPrice: string) {
  return items
    .map((item) => ({
      label: item.label.trim(),
      price: nullableNumber(item.price),
      original_price: nullableNumber(
        item.originalPriceOverride || sharedOriginalPrice,
      ),
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
      price: nullableNumber(item.price),
      currency: "HKD",
      note: item.note.trim(),
    }))
    .filter((item) => item.label || item.price !== null || item.note);
}

function getCtaPreview(draft: SmartDraft) {
  if (draft.is_full) {
    return {
      label: "名額已滿",
      url: "",
      enabled: false,
      note: "公開頁會顯示名額已滿，不可點擊報名。",
    };
  }

  if (draft.booking_type === "walk_in" || draft.is_walk_in) {
    return {
      label: draft.cta_label || "無需報名",
      url: "",
      enabled: false,
      note: "公開頁顯示無需報名。",
    };
  }

  if (draft.booking_type === "enquiry_only") {
    return {
      label: draft.cta_label || "請向主辦查詢",
      url: "",
      enabled: false,
      note: "公開頁顯示查詢提示。",
    };
  }

  if (draft.booking_type === "whatsapp") {
    const phone = draft.booking_whatsapp || draft.contact_whatsapp;
    return {
      label: draft.cta_label || "WhatsApp 報名",
      url: phone ? `https://wa.me/${phone.replace(/[^\d]/g, "")}` : "",
      enabled: Boolean(phone),
      note: phone ? "公開頁會開啟 WhatsApp。" : "請填 WhatsApp 電話。",
    };
  }

  if (draft.booking_type === "phone") {
    return {
      label: draft.cta_label || "致電報名",
      url: draft.booking_phone ? `tel:${draft.booking_phone}` : "",
      enabled: Boolean(draft.booking_phone),
      note: draft.booking_phone ? "公開頁會開啟電話。" : "請填電話號碼。",
    };
  }

  if (draft.booking_type === "email") {
    return {
      label: draft.cta_label || "電郵查詢",
      url: draft.booking_email ? `mailto:${draft.booking_email}` : "",
      enabled: Boolean(draft.booking_email),
      note: draft.booking_email ? "公開頁會開啟電郵。" : "請填電郵地址。",
    };
  }

  return {
    label: draft.cta_label || getDefaultCta(draft.booking_type),
    url: draft.booking_url,
    enabled: Boolean(draft.booking_url),
    note: draft.booking_url ? "公開頁會導流到指定連結。" : "請填官方或報名連結。",
  };
}

function inferManulifeDraft(base: SmartDraft, sourceInput: string): SmartDraft {
  const officialUrl = sourceInput.trim()
    ? normalizeUrl(sourceInput)
    : "https://www.airside.com.hk/zh-hk/happenings/manulife-wellbeing-fest";

  return {
    ...base,
    title_tc: "Manulife x AIRSIDE 樂活節奏健康節",
    short_description_tc:
      "AIRSIDE 與宏利打造大型年度身心體驗盛事，一連三天帶來運動、心理健康、情緒健康、健康知識分享及生活體驗活動。",
    description_tc:
      "今年 9 月，AIRSIDE 與宏利攜手打造大型年度身心體驗盛事「Manulife x AIRSIDE 樂活節奏健康節」。活動涵蓋運動、心理健康、情緒健康、健康知識分享及生活體驗等範疇，適合關注健康生活的家庭及公眾參與。",
    start_date: "2026-09-04",
    end_date: "2026-09-06",
    start_time: "",
    end_time: "",
    venue_name: "AIRSIDE",
    address: "啟德 AIRSIDE 2樓中庭",
    district: "九龍城區",
    mtr_station: "啟德",
    category: "健康活動",

    price_type: "paid",
    price_display_mode: "offer",
    price_summary: "早鳥 HK$50，原價 HK$90",
    price_min: "50",
    price_max: "60",
    original_price: "90",
    discount_price: "50",
    ticketing_notes:
      "限時早鳥優惠：「樂動身心」體驗課 NF Touch 會員 HK$50，Klook HK$60，原價 HK$90。指定課堂另設收費，名額有限，額滿即止。",
    pricing_items: [
      {
        label: "NF Touch 早鳥優惠",
        price: "50",
        originalPriceOverride: "",
        currency: "HKD",
        source: "NF Touch",
        note: "使用共用原價 HK$90",
      },
      {
        label: "Klook 早鳥優惠",
        price: "60",
        originalPriceOverride: "",
        currency: "HKD",
        source: "Klook",
        note: "使用共用原價 HK$90",
      },
    ],
    add_on_items: [],
    show_price_on_public: true,

    quota_summary: "名額有限，先到先得，額滿即止",
    quota_total: "",
    quota_remaining: "",
    show_quota_on_public: true,

    age_groups_text: "親子, 成人, 家庭",
    tags_text: "AIRSIDE, 宏利, Manulife, 健康活動, 運動, 心理健康, 室內, 啟德",
    language: "",
    capacity_text: "名額有限，先到先得，額滿即止",
    duration_text: "2026年9月4至6日，一連三天",

    event_highlights_text: [
      "AIRSIDE 與宏利打造年度身心健康活動",
      "涵蓋運動、心理健康、情緒健康及健康知識分享",
      "包括瑜伽、呼吸練習、頌缽療癒、CrossFit 等活動",
      "早鳥優惠及指定活動名額有限",
    ].join("\n"),

    important_notes_text: [
      "限時優惠，名額有限，額滿即止",
      "指定課堂另設收費",
      "活動內容、時間、導師、價錢及條款以主辦方最新公布為準",
      "HK Family Fun 只作活動資訊展示及導流，不代收活動款項，不保證報名或名額",
    ].join("\n"),

    transportation_notes:
      "活動地點為 AIRSIDE 2樓中庭。建議家長出發前以 AIRSIDE 官方交通資訊或 Google Map 確認入口、交通及停車安排。",
    google_map_url:
      "https://www.google.com/maps/search/?api=1&query=AIRSIDE%20Kai%20Tak",
    map_embed_url:
      "https://maps.google.com/maps?q=AIRSIDE%20Kai%20Tak&output=embed",

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

    source_url: officialUrl,
    cover_image_url: "",
    ai_image_prompt:
      "AI 示意圖：香港啟德 AIRSIDE 室內健康節活動，家長與小朋友一起參與瑜伽、呼吸練習及健康生活體驗，明亮、乾淨、現代商場活動風格，不使用真實品牌 logo，不使用版權角色。",
    confidence_notes: [
      "已偵測 AIRSIDE / Manulife 活動。",
      "已填入日期、地點、地區、港鐵、收費、票種、地圖及 CTA。",
      "原價只需填一次；NF Touch 及 Klook 票種會共用原價 HK$90。",
      "Google Map 已產生可預覽地圖。",
    ],
  };
}

function inferDraft(
  mode: ImportMode,
  sourceInput: string,
  selectedFileNames: string[],
): SmartDraft {
  const source = sourceInput.trim();
  const combined = `${source} ${selectedFileNames.join(" ")}`.toLowerCase();

  const base: SmartDraft = {
    ...defaultDraft,
    source_type: mode,
    source_url: source ? normalizeUrl(source) : "",
    booking_url: source ? normalizeUrl(source) : "",
    official_website_url: source ? normalizeUrl(source) : "",
    confidence_notes: [
      "系統已根據網址、檔名及常見香港活動模式建立草稿。",
      "未能確認的資料會留空，商戶提交前必須自行檢查。",
    ],
  };

  if (
    combined.includes("airside") &&
    (combined.includes("manulife") ||
      combined.includes("wellbeing") ||
      combined.includes("宏利"))
  ) {
    return inferManulifeDraft(base, source);
  }

  return {
    ...base,
    title_tc: selectedFileNames.length
      ? `活動草稿（${selectedFileNames[0]}）`
      : "",
    booking_type: source ? "official_page" : "enquiry_only",
    cta_label: source ? "查看官方活動頁" : "請向主辦查詢",
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
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [draft, setDraft] = useState<SmartDraft>({ ...defaultDraft });
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [savedEventId, setSavedEventId] = useState("");

  const ctaPreview = useMemo(() => getCtaPreview(draft), [draft]);
  const mapPreviewUrl = useMemo(() => mapEmbedFromDraft(draft), [draft]);

  const canAnalyze =
    mode === "url"
      ? sourceInput.trim().length > 3
      : selectedFileNames.length > 0 || sourceInput.trim().length > 3;

  useEffect(() => {
    let active = true;

    async function loadMerchant() {
      setCheckingAccount(true);

      if (!supabase) {
        setErrorMessage("Supabase 未連接。");
        setCheckingAccount(false);
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!active) return;

      if (!user) {
        setErrorMessage("請先登入商戶帳戶。");
        setCheckingAccount(false);
        return;
      }

      const { data, error } = await supabase
        .from("merchants")
        .select("id,business_name,status")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setErrorMessage("找不到商戶帳戶。請先完成商戶登記。");
        setCheckingAccount(false);
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

  function updateDraft<K extends keyof SmartDraft>(key: K, value: SmartDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
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
        };
      }

      if (nextMode === "quota_only") {
        return {
          ...current,
          price_display_mode: nextMode,
          price_summary: "",
          pricing_items: [],
          show_price_on_public: false,
          show_quota_on_public: true,
        };
      }

      return {
        ...current,
        price_type: nextMode === "unknown" ? "unknown" : "paid",
        price_display_mode: nextMode,
        pricing_items:
          current.pricing_items.length > 0
            ? current.pricing_items
            : [{ ...emptyPricingItem }],
        show_price_on_public: true,
      };
    });
  }

  function updateBookingType(nextType: BookingType) {
    setDraft((current) => ({
      ...current,
      booking_type: nextType,
      cta_label: getDefaultCta(nextType),
      is_walk_in: nextType === "walk_in",
      payment_collection_method:
        nextType === "ticketing"
          ? "third_party"
          : nextType === "walk_in" || nextType === "enquiry_only"
            ? "no_payment"
            : current.price_type === "free"
              ? "free"
              : "merchant_direct",
    }));
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
      price_type: "paid",
      price_display_mode:
        current.price_display_mode === "offer" ? "offer" : "multi_ticket",
      pricing_items: [...current.pricing_items, { ...emptyPricingItem }],
      show_price_on_public: true,
    }));
  }

  function removePricingItem(index: number) {
    setDraft((current) => ({
      ...current,
      pricing_items: current.pricing_items.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
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
      add_on_items: current.add_on_items.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  }

  async function handleAnalyze() {
    setErrorMessage("");
    setSavedEventId("");
    setStatus("analyzing");

    await new Promise((resolve) => setTimeout(resolve, 300));

    const generatedDraft = inferDraft(mode, sourceInput, selectedFileNames);
    setDraft(generatedDraft);
    setStatus("ready");
  }

  async function handleSaveDraft() {
    setErrorMessage("");
    setSavedEventId("");

    if (!supabase) {
      setStatus("error");
      setErrorMessage("Supabase 未連接。");
      return;
    }

    if (!merchant?.id) {
      setStatus("error");
      setErrorMessage("找不到商戶帳戶。");
      return;
    }

    if (!draft.title_tc.trim()) {
      setStatus("error");
      setErrorMessage("請先填寫活動名稱。");
      return;
    }

    setStatus("saving");

    const finalMapLink = googleMapLinkFromDraft(draft);
    const finalMapEmbed = mapEmbedFromDraft(draft);

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
      category: draft.category.trim(),

      price_type: draft.price_type,
      price_display_mode: draft.price_display_mode,
      price_summary: draft.price_summary.trim(),
      price_min: nullableNumber(draft.price_min),
      price_max: nullableNumber(draft.price_max),
      original_price: nullableNumber(draft.original_price),
      discount_price: nullableNumber(draft.discount_price),
      ticketing_notes: draft.ticketing_notes.trim(),
      pricing_items: cleanPricingItems(
        draft.pricing_items,
        draft.original_price,
      ),
      add_on_items: cleanAddOnItems(draft.add_on_items),
      quota_summary: draft.quota_summary.trim(),
      quota_total: nullableInteger(draft.quota_total),
      quota_remaining: nullableInteger(draft.quota_remaining),
      show_price_on_public: draft.show_price_on_public,
      show_quota_on_public: draft.show_quota_on_public,

      age_groups: splitList(draft.age_groups_text),
      tags: splitList(draft.tags_text),
      language: draft.language.trim(),
      capacity_text: draft.capacity_text.trim(),
      duration_text: draft.duration_text.trim(),

      event_highlights: splitList(draft.event_highlights_text),
      important_notes: splitList(draft.important_notes_text),
      transportation_notes: draft.transportation_notes.trim(),
      google_map_url: finalMapLink,
      map_embed_url: finalMapEmbed,

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
    };

    const { data, error } = await supabase
      .from("events")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      setStatus("error");
      setErrorMessage(`未能儲存草稿：${error.message}`);
      return;
    }

    setSavedEventId(String(data?.id || ""));
    setStatus("saved");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-950">
      <div className="pointer-events-none absolute left-6 top-32 hidden text-7xl opacity-10 lg:block">
        👨‍👩‍👧‍👦
      </div>
      <div className="pointer-events-none absolute right-10 top-80 hidden rotate-12 text-7xl opacity-10 lg:block">
        🎈
      </div>
      <div className="pointer-events-none absolute bottom-52 left-10 hidden -rotate-12 text-7xl opacity-10 lg:block">
        🧸
      </div>

      <section className="bg-gradient-to-b from-white via-purple-50/40 to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
            <div>
              <p className="text-sm font-black text-purple-700">
                Merchant Portal｜智能匯入活動
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight">
                3 分鐘建立活動草稿，
                <br />
                減少重複填表
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                貼上官方活動網址或上載最多 3 個來源檔案。系統會先建立草稿，
                商戶只需檢查活動資料、收費、地圖、CTA 及注意事項。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/merchant/dashboard"
                  className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800"
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
              <p className="text-sm font-black text-purple-700">清晰流程</p>
              <div className="mt-4 space-y-3">
                {[
                  "貼網址或上載最多 3 個檔案",
                  "系統產生可編輯草稿",
                  "檢查收費、地圖、CTA",
                  "儲存草稿",
                  "之後提交 HK Family Fun 審批",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-2xl bg-slate-50 p-3"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-700 text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
                平台只做曝光、搜尋及官方導流，不代收款項，不保證報名、銷售或名額。
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {checkingAccount ? <Notice>正在檢查商戶帳戶...</Notice> : null}

        {merchant ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-black text-emerald-800">
              商戶帳戶已連接：{merchant.business_name || "未命名商戶"}
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              草稿不會公開顯示，需審批後才會發布。
            </p>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card title="1. 匯入來源">
              <div className="grid gap-3">
                {[
                  ["url", "🔗", "活動網址", "貼上商戶官網、商場頁、Google Form 或報名頁。"],
                  ["image", "🖼️", "活動圖片 / 海報", "最多 3 個檔案，建議同時補充官方網址。"],
                  ["pdf", "📄", "PDF 海報", "適合學校、NGO、社區中心或活動單張。"],
                  ["csv", "📊", "CSV / Excel", "適合批量活動資料，之後逐項檢查。"],
                ].map(([value, icon, title, text]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      const nextMode = value as ImportMode;
                      setMode(nextMode);
                      setDraft({ ...defaultDraft, source_type: nextMode });
                      setSelectedFileNames([]);
                      setSavedEventId("");
                      setStatus("idle");
                      setErrorMessage("");
                    }}
                    className={`rounded-3xl border p-4 text-left ${
                      mode === value
                        ? "border-purple-300 bg-purple-50 ring-2 ring-purple-100"
                        : "border-slate-200 bg-white hover:border-purple-200"
                    }`}
                  >
                    <div className="flex gap-3">
                      <span className="text-2xl">{icon}</span>
                      <div>
                        <p className="font-black">{title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {text}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <Card title="2. 來源資料">
              {mode === "url" ? (
                <Field
                  label="活動網址"
                  value={sourceInput}
                  onChange={setSourceInput}
                  placeholder="https://www.example.com/event"
                />
              ) : (
                <>
                  <label className="text-xs font-black text-slate-500">
                    上載檔案，最多 3 個
                  </label>
                  <input
                    type="file"
                    multiple
                    accept={
                      mode === "image"
                        ? "image/*"
                        : mode === "pdf"
                          ? "application/pdf"
                          : ".csv,.xlsx,.xls"
                    }
                    onChange={(event) => {
                      const files = Array.from(event.target.files || []);
                      const limited = files.slice(0, 3).map((file) => file.name);
                      setSelectedFileNames(limited);

                      if (files.length > 3) {
                        setErrorMessage(
                          "最多只可上載 3 個檔案，系統已保留前 3 個。",
                        );
                      } else {
                        setErrorMessage("");
                      }
                    }}
                    className="mt-2 w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm"
                  />

                  {selectedFileNames.length > 0 ? (
                    <ul className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-700">
                      {selectedFileNames.map((name) => (
                        <li key={name}>• {name}</li>
                      ))}
                    </ul>
                  ) : null}

                  <TextArea
                    label="補充官方網址或備註"
                    value={sourceInput}
                    onChange={setSourceInput}
                    rows={4}
                  />
                </>
              )}

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!canAnalyze || status === "analyzing"}
                className="mt-5 w-full rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800 disabled:bg-slate-300"
              >
                {status === "analyzing" ? "正在產生草稿..." : "產生智能草稿"}
              </button>
            </Card>

            <Card title="公開頁預覽摘要">
              <div className="space-y-3 text-sm">
                <PreviewRow label="活動" value={draft.title_tc || "未命名活動"} />
                <PreviewRow label="收費" value={draft.price_summary || "收費待確認"} />
                <PreviewRow label="CTA" value={ctaPreview.label} />
                <PreviewRow label="地點" value={draft.venue_name || "地點待確認"} />
              </div>
            </Card>
          </aside>

          <div className="space-y-6">
            <Card title="3. 基本活動資料">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="活動名稱" value={draft.title_tc} onChange={(v) => updateDraft("title_tc", v)} required />
                <SelectField label="活動分類" value={draft.category} onChange={(v) => updateDraft("category", v)} options={categoryOptions} />
                <Field label="開始日期" type="date" value={draft.start_date} onChange={(v) => updateDraft("start_date", v)} />
                <Field label="結束日期" type="date" value={draft.end_date} onChange={(v) => updateDraft("end_date", v)} />
                <Field label="開始時間" type="time" value={draft.start_time} onChange={(v) => updateDraft("start_time", v)} />
                <Field label="結束時間" type="time" value={draft.end_time} onChange={(v) => updateDraft("end_time", v)} />
                <Field label="場地名稱" value={draft.venue_name} onChange={(v) => updateDraft("venue_name", v)} />
                <Field label="詳細地址" value={draft.address} onChange={(v) => updateDraft("address", v)} />
                <SelectField label="地區" value={draft.district} onChange={(v) => updateDraft("district", v)} options={districtOptions} />
                <SelectField label="港鐵站" value={draft.mtr_station} onChange={(v) => updateDraft("mtr_station", v)} options={mtrOptions} />
              </div>
            </Card>

            <Card title="4. 收費、優惠、票種及名額">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="收費顯示模式"
                  value={draft.price_display_mode}
                  onChange={(v) => updatePriceMode(v as PriceDisplayMode)}
                  options={priceDisplayModeOptions.map((item) => item.value)}
                  optionLabels={Object.fromEntries(
                    priceDisplayModeOptions.map((item) => [item.value, item.label]),
                  )}
                />
                <SelectField
                  label="收費類型"
                  value={draft.price_type}
                  onChange={(v) => updateDraft("price_type", v as PriceType)}
                  options={["unknown", "free", "paid"]}
                  optionLabels={{
                    unknown: "收費未能確認",
                    free: "免費",
                    paid: "收費",
                  }}
                />
                <Field label="公開頁價錢摘要" value={draft.price_summary} onChange={(v) => updateDraft("price_summary", v)} placeholder="例如：早鳥 HK$50，原價 HK$90" />
                <Field label="共用原價" type="number" value={draft.original_price} onChange={(v) => updateDraft("original_price", v)} placeholder="例如：90" />
                <Field label="最低收費" type="number" value={draft.price_min} onChange={(v) => updateDraft("price_min", v)} />
                <Field label="最高收費" type="number" value={draft.price_max} onChange={(v) => updateDraft("price_max", v)} />
                <Field label="優惠價 / 早鳥價" type="number" value={draft.discount_price} onChange={(v) => updateDraft("discount_price", v)} />
                <Field label="名額摘要" value={draft.quota_summary} onChange={(v) => updateDraft("quota_summary", v)} />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Checkbox label="公開頁顯示價錢" checked={draft.show_price_on_public} onChange={(v) => updateDraft("show_price_on_public", v)} />
                <Checkbox label="公開頁顯示名額" checked={draft.show_quota_on_public} onChange={(v) => updateDraft("show_quota_on_public", v)} />
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">票種 / 渠道</p>
                    <p className="mt-1 text-xs text-slate-500">
                      原價已在「共用原價」填一次。特殊票種才需要填 override 原價。
                    </p>
                  </div>
                  <button type="button" onClick={addPricingItem} className="rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-black text-purple-700">
                    + 加票種
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {draft.pricing_items.map((item, index) => (
                    <div key={`ticket-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="flex justify-between gap-3">
                        <p className="text-sm font-black">票種 {index + 1}</p>
                        <button type="button" onClick={() => removePricingItem(index)} className="text-xs font-black text-red-500">
                          移除
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <SmallInput label="名稱" value={item.label} onChange={(v) => updatePricingItem(index, "label", v)} />
                        <SmallInput label="現價 / 優惠價" type="number" value={item.price} onChange={(v) => updatePricingItem(index, "price", v)} />
                        <SmallInput label="特殊原價，不填即用共用原價" type="number" value={item.originalPriceOverride} onChange={(v) => updatePricingItem(index, "originalPriceOverride", v)} />
                        <SmallInput label="渠道" value={item.source} onChange={(v) => updatePricingItem(index, "source", v)} />
                        <SmallInput label="貨幣" value={item.currency} onChange={(v) => updatePricingItem(index, "currency", v)} />
                        <SmallInput label="備註" value={item.note} onChange={(v) => updatePricingItem(index, "note", v)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black">加購項目</p>
                  <button type="button" onClick={addAddOnItem} className="rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-black text-purple-700">
                    + 加購
                  </button>
                </div>

                {draft.add_on_items.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                    沒有加購項目可留空。
                  </p>
                ) : null}

                <div className="mt-4 space-y-3">
                  {draft.add_on_items.map((item, index) => (
                    <div key={`addon-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="flex justify-between gap-3">
                        <p className="text-sm font-black">加購 {index + 1}</p>
                        <button type="button" onClick={() => removeAddOnItem(index)} className="text-xs font-black text-red-500">
                          移除
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <SmallInput label="名稱" value={item.label} onChange={(v) => updateAddOnItem(index, "label", v)} />
                        <SmallInput label="價錢" type="number" value={item.price} onChange={(v) => updateAddOnItem(index, "price", v)} />
                        <SmallInput label="備註" value={item.note} onChange={(v) => updateAddOnItem(index, "note", v)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <TextArea label="票務 / 收費備註" value={draft.ticketing_notes} onChange={(v) => updateDraft("ticketing_notes", v)} rows={3} />
            </Card>

            <Card title="5. 活動內容">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="語言" value={draft.language} onChange={(v) => updateDraft("language", v)} />
                <Field label="適合年齡" value={draft.age_groups_text} onChange={(v) => updateDraft("age_groups_text", v)} />
                <Field label="活動時長" value={draft.duration_text} onChange={(v) => updateDraft("duration_text", v)} />
                <Field label="名額 / 對象" value={draft.capacity_text} onChange={(v) => updateDraft("capacity_text", v)} />
                <Field label="標籤" value={draft.tags_text} onChange={(v) => updateDraft("tags_text", v)} />
              </div>

              <TextArea label="短簡介" value={draft.short_description_tc} onChange={(v) => updateDraft("short_description_tc", v)} rows={3} />
              <TextArea label="詳細介紹" value={draft.description_tc} onChange={(v) => updateDraft("description_tc", v)} rows={5} />
              <TextArea label="活動亮點，一行一項" value={draft.event_highlights_text} onChange={(v) => updateDraft("event_highlights_text", v)} rows={5} />
              <TextArea label="注意事項，一行一項" value={draft.important_notes_text} onChange={(v) => updateDraft("important_notes_text", v)} rows={5} />
            </Card>

            <Card title="6. 地點、交通及 Google Map">
              <TextArea label="交通資料" value={draft.transportation_notes} onChange={(v) => updateDraft("transportation_notes", v)} rows={3} />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Google Map 連結，可留空自動生成" value={draft.google_map_url} onChange={(v) => updateDraft("google_map_url", v)} />
                <Field label="Google Map Embed URL，可留空自動生成" value={draft.map_embed_url} onChange={(v) => updateDraft("map_embed_url", v)} />
              </div>

              {mapPreviewUrl ? (
                <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                  <iframe
                    title="Google Map Preview"
                    src={mapPreviewUrl}
                    className="h-72 w-full"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  填寫場地或地址後會顯示地圖預覽。
                </div>
              )}
            </Card>

            <Card title="7. 主辦機構及 CTA">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="主辦機構" value={draft.organizer_name} onChange={(v) => updateDraft("organizer_name", v)} />
                <Field label="主辦網站" value={draft.organizer_website} onChange={(v) => updateDraft("organizer_website", v)} />
                <Field label="電話" value={draft.organizer_phone} onChange={(v) => updateDraft("organizer_phone", v)} />
                <Field label="電郵" value={draft.organizer_email} onChange={(v) => updateDraft("organizer_email", v)} />
                <Field label="WhatsApp" value={draft.contact_whatsapp} onChange={(v) => updateDraft("contact_whatsapp", v)} />
                <Field label="官方活動頁" value={draft.official_website_url} onChange={(v) => updateDraft("official_website_url", v)} />

                <SelectField
                  label="報名 / 導流方式"
                  value={draft.booking_type}
                  onChange={(v) => updateBookingType(v as BookingType)}
                  options={bookingTypeOptions.map((item) => item.value)}
                  optionLabels={Object.fromEntries(
                    bookingTypeOptions.map((item) => [item.value, item.label]),
                  )}
                />
                <Field label="CTA 顯示文字" value={draft.cta_label} onChange={(v) => updateDraft("cta_label", v)} />
                <Field label="報名 / 官方連結" value={draft.booking_url} onChange={(v) => updateDraft("booking_url", v)} />
                <Field label="報名截止日期" type="date" value={draft.registration_deadline} onChange={(v) => updateDraft("registration_deadline", v)} />
                <Field label="WhatsApp 報名電話" value={draft.booking_whatsapp} onChange={(v) => updateDraft("booking_whatsapp", v)} />
                <Field label="電話報名" value={draft.booking_phone} onChange={(v) => updateDraft("booking_phone", v)} />
                <Field label="電郵報名" value={draft.booking_email} onChange={(v) => updateDraft("booking_email", v)} />
              </div>

              <TextArea label="WhatsApp 預設訊息" value={draft.booking_message} onChange={(v) => updateDraft("booking_message", v)} rows={3} />

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Checkbox label="名額已滿" checked={draft.is_full} onChange={(v) => updateDraft("is_full", v)} />
                <Checkbox label="Walk-in / 無需報名" checked={draft.is_walk_in} onChange={(v) => updateDraft("is_walk_in", v)} />
              </div>

              <div className="mt-5 rounded-3xl border border-purple-200 bg-purple-50 p-5">
                <p className="text-xs font-black text-purple-700">
                  公開頁 CTA Preview
                </p>
                <p className="mt-2 text-xl font-black">{ctaPreview.label}</p>
                <p className="mt-1 text-sm text-slate-600">{ctaPreview.note}</p>
                <p className="mt-1 break-all text-xs text-slate-500">
                  {ctaPreview.url || "沒有連結，公開頁會顯示為提示狀態。"}
                </p>
              </div>
            </Card>

            <Card title="8. 圖片及 AI 示意圖">
              <Field label="活動圖片 URL" value={draft.cover_image_url} onChange={(v) => updateDraft("cover_image_url", v)} />
              <TextArea label="AI 活動圖片建議 Prompt" value={draft.ai_image_prompt} onChange={(v) => updateDraft("ai_image_prompt", v)} rows={4} />

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
            </Card>

            {errorMessage ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-800">
                {errorMessage}
              </div>
            ) : null}

            {savedEventId ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm font-black text-emerald-800">
                  活動草稿已儲存
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/merchant/events/${savedEventId}/preview`}
                    className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white"
                  >
                    預覽活動頁
                  </Link>
                  <Link
                    href={`/merchant/events/${savedEventId}/edit`}
                    className="rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-700"
                  >
                    編輯活動
                  </Link>
                  <Link
                    href="/merchant/dashboard"
                    className="rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-700"
                  >
                    返回 Dashboard
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black">
                    {draft.title_tc || "未命名活動草稿"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {draft.price_summary || "收費待確認"}｜{ctaPreview.label}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/merchant/dashboard")}
                    className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
                  >
                    返回 Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={!merchant || status === "saving" || !draft.title_tc.trim()}
                    className="rounded-full bg-purple-700 px-6 py-3 text-sm font-black text-white hover:bg-purple-800 disabled:bg-slate-300"
                  >
                    {status === "saving" ? "正在儲存..." : "儲存為活動草稿"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-600">
      {children}
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 p-3">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <span className="text-right text-xs font-black text-slate-900">
        {value}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-black text-slate-500">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  optionLabels,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  optionLabels?: Record<string, string>;
}) {
  return (
    <div>
      <label className="text-xs font-black text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
      >
        {options.map((item) => (
          <option key={item || "empty"} value={item}>
            {item ? optionLabels?.[item] || item : "留空／未確認"}
          </option>
        ))}
      </select>
    </div>
  );
}

function SmallInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-black text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
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

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />
      {label}
    </label>
  );
}