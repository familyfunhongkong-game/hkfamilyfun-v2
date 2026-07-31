"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type PriceMode =
  | "unknown"
  | "free_hidden"
  | "free_show"
  | "fixed"
  | "from"
  | "range"
  | "offer"
  | "multi_ticket"
  | "quota_only";

type BookingType =
  | "official_page"
  | "external_ticketing"
  | "google_form"
  | "merchant_website"
  | "whatsapp"
  | "phone"
  | "email"
  | "walk_in"
  | "enquiry_only";

type EventForm = {
  id: string;
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

  cover_image_url: string;
  source_url: string;

  price_type: string;
  price_display_mode: PriceMode;
  price_summary: string;
  price_min: string;
  price_max: string;
  original_price: string;
  discount_price: string;
  show_price_on_public: boolean;

  quota_summary: string;
  quota_total: string;
  quota_remaining: string;
  show_quota_on_public: boolean;

  ticketing_notes: string;
  pricing_items_text: string;
  add_on_items_text: string;

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
  registration_deadline: string;
  is_full: boolean;
  is_walk_in: boolean;

  platform_takes_booking: boolean;
  platform_takes_payment: boolean;
  future_partner_ref: string;
};

const defaultForm: EventForm = {
  id: "",
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

  cover_image_url: "",
  source_url: "",

  price_type: "unknown",
  price_display_mode: "unknown",
  price_summary: "",
  price_min: "",
  price_max: "",
  original_price: "",
  discount_price: "",
  show_price_on_public: true,

  quota_summary: "",
  quota_total: "",
  quota_remaining: "",
  show_quota_on_public: false,

  ticketing_notes: "",
  pricing_items_text: "",
  add_on_items_text: "",

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
  registration_deadline: "",
  is_full: false,
  is_walk_in: false,

  platform_takes_booking: false,
  platform_takes_payment: false,
  future_partner_ref: "",
};

const steps = [
  { id: 1, label: "基本資料" },
  { id: 2, label: "時間地點" },
  { id: 3, label: "收費名額" },
  { id: 4, label: "報名 CTA" },
  { id: 5, label: "內容細節" },
  { id: 6, label: "預覽提交" },
];

const categories = [
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

const districts = [
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

const mtrStations = [
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

const priceModeCards: Array<{
  value: PriceMode;
  title: string;
  desc: string;
}> = [
  {
    value: "free_hidden",
    title: "免費，不顯示價錢",
    desc: "活動免費，但不在 card 突出收費。",
  },
  {
    value: "free_show",
    title: "免費",
    desc: "活動卡及詳情頁會顯示免費。",
  },
  {
    value: "fixed",
    title: "固定價",
    desc: "例如 HK$50，不會顯示「起」。",
  },
  {
    value: "from",
    title: "HK$XX 起",
    desc: "適合多票種、兒童成人不同價。",
  },
  {
    value: "range",
    title: "價錢範圍",
    desc: "例如 HK$50–HK$180。",
  },
  {
    value: "offer",
    title: "優惠 / 早鳥",
    desc: "例如早鳥優惠價 HK$50 (原價 HK$90)。",
  },
  {
    value: "multi_ticket",
    title: "多票種",
    desc: "適合 Klook、Eventbrite、NF Touch 等渠道。",
  },
  {
    value: "quota_only",
    title: "只顯示名額",
    desc: "只顯示名額狀態，不顯示價錢。",
  },
];

const bookingCards: Array<{
  value: BookingType;
  title: string;
  desc: string;
}> = [
  {
    value: "official_page",
    title: "查看官方活動頁",
    desc: "只導流去商戶或場地官方頁。",
  },
  {
    value: "external_ticketing",
    title: "外部連結報名",
    desc: "Klook / Eventbrite / Google Form / 其他購票平台。",
  },
  {
    value: "google_form",
    title: "Google Form",
    desc: "直接開報名表。",
  },
  {
    value: "merchant_website",
    title: "商戶網站",
    desc: "前往商戶網站報名。",
  },
  {
    value: "whatsapp",
    title: "WhatsApp",
    desc: "家長一按即可 WhatsApp 查詢。",
  },
  {
    value: "phone",
    title: "電話",
    desc: "適合電話查詢或電話報名。",
  },
  {
    value: "email",
    title: "電郵",
    desc: "適合學校、NGO、機構報名。",
  },
  {
    value: "walk_in",
    title: "無需報名",
    desc: "活動可以直接到場。",
  },
  {
    value: "enquiry_only",
    title: "只作宣傳 / 查詢",
    desc: "不提供直接報名。",
  },
];

function asText(value: unknown) {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (value.every((item) => typeof item === "string")) {
      return value.join("\n");
    }

    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          const label = record.label ? String(record.label) : "";
          const price = record.price ? `HK$${String(record.price)}` : "";
          const source = record.source ? String(record.source) : "";
          const note = record.note ? String(record.note) : "";
          return [label, price, source, note].filter(Boolean).join("｜");
        }
        return String(item);
      })
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function toNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInteger(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitList(value: string) {
  return value
    .split(/[,\n，、|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function getMapEmbedUrl(form: EventForm) {
  if (form.map_embed_url.trim()) return normalizeUrl(form.map_embed_url);

  const query = [
    form.venue_name,
    form.address,
    form.district,
    form.mtr_station,
    "Hong Kong",
  ]
    .filter(Boolean)
    .join(" ");

  if (!query.trim()) return "";

  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function getGoogleMapUrl(form: EventForm) {
  if (form.google_map_url.trim()) return normalizeUrl(form.google_map_url);

  const query = [
    form.venue_name,
    form.address,
    form.district,
    form.mtr_station,
    "Hong Kong",
  ]
    .filter(Boolean)
    .join(" ");

  if (!query.trim()) return "";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query,
  )}`;
}

function getPriceDisplay(form: EventForm) {
  if (form.is_full) return "名額已滿";

  if (!form.show_price_on_public) return "";
  if (form.price_display_mode === "free_hidden") return "";
  if (form.price_display_mode === "quota_only") return "";

  if (form.price_display_mode === "free_show" || form.price_type === "free") {
    return "免費";
  }

  const min = toNumber(form.price_min);
  const max = toNumber(form.price_max);
  const original = toNumber(form.original_price);
  const discount = toNumber(form.discount_price);

  if (form.price_display_mode === "fixed") {
    if (min !== null) return `HK$${min}`;
    if (discount !== null) return `HK$${discount}`;
    return "收費待確認";
  }

  if (form.price_display_mode === "offer") {
    if (discount !== null && original !== null) {
      return `早鳥優惠價 HK$${discount} (原價 HK$${original})`;
    }
    if (min !== null && original !== null) {
      return `早鳥優惠價 HK$${min} (原價 HK$${original})`;
    }
    if (discount !== null) return `優惠價 HK$${discount}`;
    if (min !== null) return `優惠價 HK$${min}`;
    return "優惠詳情待確認";
  }

  if (form.price_display_mode === "range") {
    if (min !== null && max !== null && min !== max) return `HK$${min}–HK$${max}`;
    if (min !== null) return `HK$${min}`;
    return "收費待確認";
  }

  if (form.price_display_mode === "from" || form.price_display_mode === "multi_ticket") {
    if (min !== null) return `HK$${min} 起`;
    return "多票種";
  }

  const summary = form.price_summary.trim();
  if (summary) return summary;

  if (form.price_type === "paid") {
    if (min !== null && max !== null && min !== max) return `HK$${min}–HK$${max}`;
    if (min !== null) return `HK$${min}`;
    return "收費待確認";
  }

  return "收費待確認";
}

function getQuotaDisplay(form: EventForm) {
  if (!form.show_quota_on_public && !form.quota_summary.trim()) return "";

  if (form.is_full) return "名額已滿";

  const summary = form.quota_summary.trim();
  const remaining = toInteger(form.quota_remaining);
  const total = toInteger(form.quota_total);

  if (summary) return summary;
  if (remaining !== null && total !== null) return `尚餘 ${remaining} / ${total} 個名額`;
  if (remaining !== null) return `尚餘 ${remaining} 個名額`;
  if (total !== null) return `名額共 ${total} 個`;

  return form.show_quota_on_public ? "名額有限" : "";
}

function getCta(form: EventForm) {
  if (form.is_full) {
    return { label: "名額已滿", href: "", clickable: false };
  }

  if (form.is_walk_in || form.booking_type === "walk_in") {
    return { label: form.cta_label || "無需報名", href: "", clickable: false };
  }

  if (form.booking_type === "enquiry_only") {
    return { label: form.cta_label || "請向主辦查詢", href: "", clickable: false };
  }

  if (form.booking_type === "whatsapp") {
    const phone = form.booking_whatsapp || form.contact_whatsapp;
    const message = encodeURIComponent(form.booking_message || "你好，我想查詢活動。");
    return {
      label: form.cta_label || "WhatsApp 報名",
      href: phone ? `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${message}` : "",
      clickable: Boolean(phone),
    };
  }

  if (form.booking_type === "phone") {
    return {
      label: form.cta_label || "致電查詢",
      href: form.booking_phone ? `tel:${form.booking_phone}` : "",
      clickable: Boolean(form.booking_phone),
    };
  }

  if (form.booking_type === "email") {
    return {
      label: form.cta_label || "電郵查詢",
      href: form.booking_email ? `mailto:${form.booking_email}` : "",
      clickable: Boolean(form.booking_email),
    };
  }

  const fallbackUrl =
    form.booking_url ||
    form.official_website_url ||
    form.organizer_website ||
    form.source_url;

  const labelMap: Record<BookingType, string> = {
    official_page: "查看官方活動頁",
    external_ticketing: "前往報名 / 購票",
    google_form: "填寫報名表",
    merchant_website: "前往商戶網站",
    whatsapp: "WhatsApp 報名",
    phone: "致電查詢",
    email: "電郵查詢",
    walk_in: "無需報名",
    enquiry_only: "請向主辦查詢",
  };

  return {
    label: form.cta_label || labelMap[form.booking_type],
    href: normalizeUrl(fallbackUrl),
    clickable: Boolean(fallbackUrl.trim()),
  };
}

function getDefaultCtaLabel(type: BookingType) {
  const labels: Record<BookingType, string> = {
    official_page: "查看官方活動頁",
    external_ticketing: "前往報名 / 購票",
    google_form: "填寫報名表",
    merchant_website: "前往商戶網站",
    whatsapp: "WhatsApp 報名",
    phone: "致電查詢",
    email: "電郵查詢",
    walk_in: "無需報名",
    enquiry_only: "請向主辦查詢",
  };

  return labels[type];
}

function parseJsonText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return splitList(trimmed).map((item) => ({ label: item }));
  }
}

function isFieldEnabled(mode: PriceMode, field: "summary" | "min" | "max" | "original" | "discount" | "quota" | "tickets" | "addons") {
  if (field === "quota") return true;
  if (field === "addons") return true;

  if (mode === "free_hidden" || mode === "free_show" || mode === "quota_only") {
    return false;
  }

  if (mode === "fixed") {
    return field === "min" || field === "summary";
  }

  if (mode === "from") {
    return field === "min" || field === "summary" || field === "tickets";
  }

  if (mode === "range") {
    return field === "min" || field === "max" || field === "summary";
  }

  if (mode === "offer") {
    return field === "min" || field === "original" || field === "discount" || field === "summary" || field === "tickets";
  }

  if (mode === "multi_ticket") {
    return field === "min" || field === "max" || field === "original" || field === "discount" || field === "summary" || field === "tickets";
  }

  return true;
}

function getPriceModeGuide(mode: PriceMode) {
  if (mode === "free_hidden") {
    return {
      need: "不用填任何價錢欄。活動免費，但公開頁不突出價錢。",
      skip: "固定收費、最高收費、原價、優惠價、票種欄已不需要填。",
    };
  }

  if (mode === "free_show") {
    return {
      need: "不用填價錢，系統會顯示「免費」。",
      skip: "固定收費、最高收費、原價、優惠價、票種欄已不需要填。",
    };
  }

  if (mode === "fixed") {
    return {
      need: "只需要填「最低 / 固定收費 HK$」。例如填 50，公開頁會顯示 HK$50。",
      skip: "最高收費、原價、優惠價通常不需要填；如有舊數字，系統也不會用它顯示範圍。",
    };
  }

  if (mode === "from") {
    return {
      need: "填「最低 / 固定收費 HK$」。例如填 50，公開頁會顯示 HK$50 起。",
      skip: "最高收費可留空；票種資料可選填。",
    };
  }

  if (mode === "range") {
    return {
      need: "填最低及最高收費。例如最低 50、最高 90，公開頁會顯示 HK$50–HK$90。",
      skip: "原價及優惠價不需要填，除非你改選優惠模式。",
    };
  }

  if (mode === "offer") {
    return {
      need: "填「優惠價 HK$」及「共用原價 HK$」。例如優惠 50、原價 90，公開頁會顯示早鳥優惠價 HK$50 (原價 HK$90)。",
      skip: "最高收費通常不需要填；如有多渠道票價，可在票種資料補充。",
    };
  }

  if (mode === "multi_ticket") {
    return {
      need: "填最低收費，並在票種資料加入不同平台或不同票種。",
      skip: "最高收費、原價、優惠價可按需要填，不是必填。",
    };
  }

  if (mode === "quota_only") {
    return {
      need: "只需要填名額摘要，例如「名額有限，先到先得」。公開頁不顯示價錢。",
      skip: "所有價錢欄可以不用填。",
    };
  }

  return {
    need: "請先選擇收費顯示類型，系統會自動提示需要填哪些欄位。",
    skip: "未選類型前，請不要填太多價錢資料，避免顯示混亂。",
  };
}

function convertDbToForm(row: Record<string, unknown>): EventForm {
  const modeFromDb = asText(row.price_display_mode);
  let priceMode: PriceMode = "unknown";

  if (
    [
      "unknown",
      "free_hidden",
      "free_show",
      "fixed",
      "from",
      "range",
      "offer",
      "multi_ticket",
      "quota_only",
    ].includes(modeFromDb)
  ) {
    priceMode = modeFromDb as PriceMode;
  } else if (modeFromDb === "single") {
    priceMode = "fixed";
  } else if (asText(row.price_type) === "free") {
    priceMode = "free_show";
  } else if (row.price_min !== null && row.price_min !== undefined) {
    priceMode = "fixed";
  }

  const bookingFromDb = asText(row.booking_type);
  const bookingType: BookingType = bookingCards.some((item) => item.value === bookingFromDb)
    ? (bookingFromDb as BookingType)
    : "official_page";

  return {
    ...defaultForm,
    id: asText(row.id),
    title_tc: asText(row.title_tc),
    short_description_tc: asText(row.short_description_tc),
    description_tc: asText(row.description_tc),

    start_date: asText(row.start_date),
    end_date: asText(row.end_date),
    start_time: asText(row.start_time),
    end_time: asText(row.end_time),

    venue_name: asText(row.venue_name),
    address: asText(row.address),
    district: asText(row.district),
    mtr_station: asText(row.mtr_station),
    category: asText(row.category) || "親子活動",

    cover_image_url: asText(row.cover_image_url),
    source_url: asText(row.source_url),

    price_type: asText(row.price_type) || "unknown",
    price_display_mode: priceMode,
    price_summary: asText(row.price_summary),
    price_min: asText(row.price_min),
    price_max: asText(row.price_max),
    original_price: asText(row.original_price),
    discount_price: asText(row.discount_price),
    show_price_on_public: row.show_price_on_public !== false,

    quota_summary: asText(row.quota_summary),
    quota_total: asText(row.quota_total),
    quota_remaining: asText(row.quota_remaining),
    show_quota_on_public: row.show_quota_on_public === true,

    ticketing_notes: asText(row.ticketing_notes),
    pricing_items_text: asText(row.pricing_items),
    add_on_items_text: asText(row.add_on_items),

    age_groups_text: asText(row.age_groups),
    tags_text: asText(row.tags),
    language: asText(row.language),
    capacity_text: asText(row.capacity_text),
    duration_text: asText(row.duration_text),
    event_highlights_text: asText(row.event_highlights),
    important_notes_text: asText(row.important_notes),

    transportation_notes: asText(row.transportation_notes),
    google_map_url: asText(row.google_map_url),
    map_embed_url: asText(row.map_embed_url),

    organizer_name: asText(row.organizer_name),
    organizer_phone: asText(row.organizer_phone),
    organizer_email: asText(row.organizer_email),
    organizer_website: asText(row.organizer_website),
    official_website_url: asText(row.official_website_url),
    contact_whatsapp: asText(row.contact_whatsapp),

    booking_type: bookingType,
    booking_url: asText(row.booking_url) || asText(row.registration_url),
    booking_whatsapp: asText(row.booking_whatsapp),
    booking_phone: asText(row.booking_phone),
    booking_email: asText(row.booking_email),
    booking_message: asText(row.booking_message),
    cta_label: asText(row.cta_label) || getDefaultCtaLabel(bookingType),
    registration_deadline: asText(row.registration_deadline),
    is_full: row.is_full === true,
    is_walk_in: row.is_walk_in === true,

    platform_takes_booking: row.platform_takes_booking === true,
    platform_takes_payment: row.platform_takes_payment === true,
    future_partner_ref: asText(row.future_partner_ref),
  };
}

export default function MerchantEventEditPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = typeof params?.id === "string" ? params.id : "";

  const [form, setForm] = useState<EventForm>({ ...defaultForm });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const priceDisplay = useMemo(() => getPriceDisplay(form), [form]);
  const quotaDisplay = useMemo(() => getQuotaDisplay(form), [form]);
  const cta = useMemo(() => getCta(form), [form]);
  const mapEmbed = useMemo(() => getMapEmbedUrl(form), [form]);
  const priceGuide = useMemo(() => getPriceModeGuide(form.price_display_mode), [form.price_display_mode]);

  useEffect(() => {
    let active = true;

    async function loadEvent() {
      setLoading(true);
      setErrorMessage("");

      if (!supabase || !eventId) {
        setErrorMessage("Supabase 未連接或活動 ID 不正確。");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setErrorMessage(error?.message || "找不到活動資料。");
        setLoading(false);
        return;
      }

      setForm(convertDbToForm(data as Record<string, unknown>));
      setLoading(false);
    }

    loadEvent();

    return () => {
      active = false;
    };
  }, [eventId]);

  function update<K extends keyof EventForm>(key: K, value: EventForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updatePriceMin(value: string) {
    setForm((current) => ({
      ...current,
      price_min: value,
      price_max: current.price_display_mode === "fixed" ? value : current.price_max,
    }));
  }

  function selectPriceMode(mode: PriceMode) {
    setForm((current) => {
      if (mode === "free_hidden") {
        return {
          ...current,
          price_display_mode: mode,
          price_type: "free",
          price_summary: "",
          price_min: "",
          price_max: "",
          original_price: "",
          discount_price: "",
          show_price_on_public: false,
        };
      }

      if (mode === "free_show") {
        return {
          ...current,
          price_display_mode: mode,
          price_type: "free",
          price_summary: "",
          price_min: "0",
          price_max: "0",
          original_price: "",
          discount_price: "",
          show_price_on_public: true,
        };
      }

      if (mode === "fixed") {
        const fixedPrice = current.price_min || current.discount_price || "";
        return {
          ...current,
          price_display_mode: mode,
          price_type: "paid",
          price_summary: "",
          price_min: fixedPrice,
          price_max: fixedPrice,
          show_price_on_public: true,
        };
      }

      if (mode === "offer") {
        return {
          ...current,
          price_display_mode: mode,
          price_type: "paid",
          price_summary: "",
          show_price_on_public: true,
        };
      }

      if (mode === "quota_only") {
        return {
          ...current,
          price_display_mode: mode,
          price_summary: "",
          show_price_on_public: false,
          show_quota_on_public: true,
        };
      }

      return {
        ...current,
        price_display_mode: mode,
        price_type: mode === "unknown" ? "unknown" : "paid",
        price_summary: "",
        show_price_on_public: true,
      };
    });
  }

  function selectBookingType(type: BookingType) {
    setForm((current) => ({
      ...current,
      booking_type: type,
      cta_label: getDefaultCtaLabel(type),
      is_walk_in: type === "walk_in",
      platform_takes_booking: false,
      platform_takes_payment: false,
    }));
  }

  async function saveEvent(submitForReview: boolean) {
    setSaving(true);
    setMessage("");
    setErrorMessage("");

    if (!supabase) {
      setErrorMessage("Supabase 未連接。");
      setSaving(false);
      return;
    }

    if (!form.title_tc.trim()) {
      setErrorMessage("請先填寫活動名稱。");
      setSaving(false);
      return;
    }

    const mapUrl = getGoogleMapUrl(form);
    const embedUrl = getMapEmbedUrl(form);
    const finalPriceSummary = getPriceDisplay(form);
    const finalQuotaSummary = getQuotaDisplay(form);

    const payload = {
      title_tc: form.title_tc.trim(),
      short_description_tc: form.short_description_tc.trim(),
      description_tc: form.description_tc.trim(),

      start_date: form.start_date || null,
      end_date: form.end_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,

      venue_name: form.venue_name.trim(),
      address: form.address.trim(),
      district: form.district.trim(),
      mtr_station: form.mtr_station.trim(),
      category: form.category.trim(),

      cover_image_url: normalizeUrl(form.cover_image_url),
      source_url: normalizeUrl(form.source_url),

      price_type: form.price_type,
      price_display_mode: form.price_display_mode,
      price_summary: finalPriceSummary,
      price_min: toNumber(form.price_min),
      price_max:
        form.price_display_mode === "fixed"
          ? toNumber(form.price_min)
          : toNumber(form.price_max),
      original_price: toNumber(form.original_price),
      discount_price: toNumber(form.discount_price),
      show_price_on_public: form.show_price_on_public,

      quota_summary: finalQuotaSummary || form.quota_summary.trim(),
      quota_total: toInteger(form.quota_total),
      quota_remaining: toInteger(form.quota_remaining),
      show_quota_on_public: form.show_quota_on_public,

      ticketing_notes: form.ticketing_notes.trim(),
      pricing_items: parseJsonText(form.pricing_items_text),
      add_on_items: parseJsonText(form.add_on_items_text),

      age_groups: splitList(form.age_groups_text),
      tags: splitList(form.tags_text),
      language: form.language.trim(),
      capacity_text: form.capacity_text.trim(),
      duration_text: form.duration_text.trim(),
      event_highlights: splitList(form.event_highlights_text),
      important_notes: splitList(form.important_notes_text),

      transportation_notes: form.transportation_notes.trim(),
      google_map_url: mapUrl,
      map_embed_url: embedUrl,

      organizer_name: form.organizer_name.trim(),
      organizer_phone: form.organizer_phone.trim(),
      organizer_email: form.organizer_email.trim(),
      organizer_website: normalizeUrl(form.organizer_website),
      official_website_url: normalizeUrl(form.official_website_url),
      contact_whatsapp: form.contact_whatsapp.trim(),

      booking_type: form.booking_type,
      booking_url: normalizeUrl(form.booking_url),
      booking_whatsapp: form.booking_whatsapp.trim(),
      booking_phone: form.booking_phone.trim(),
      booking_email: form.booking_email.trim(),
      booking_message: form.booking_message.trim(),
      cta_label: form.cta_label.trim() || getDefaultCtaLabel(form.booking_type),
      registration_url: normalizeUrl(form.booking_url),
      registration_deadline: form.registration_deadline || null,
      registration_required:
        form.booking_type !== "walk_in" && form.booking_type !== "enquiry_only",
      is_full: form.is_full,
      is_walk_in: form.is_walk_in || form.booking_type === "walk_in",

      platform_takes_booking: form.platform_takes_booking,
      platform_takes_payment: form.platform_takes_payment,
      future_partner_ref: form.future_partner_ref.trim(),

      status: submitForReview ? "submitted" : "draft",
    };

    const { error } = await supabase.from("events").update(payload).eq("id", eventId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage(submitForReview ? "已提交 HK Family Fun 審批。" : "活動草稿已儲存。");
    setSaving(false);

    if (submitForReview) {
      router.push("/merchant/dashboard");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-5xl rounded-3xl border bg-white p-8 text-sm font-bold text-slate-600">
          正在載入活動資料...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <Link href="/merchant/dashboard" className="text-sm font-black text-purple-700">
              ← 返回 Merchant Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-black">編輯活動資料</h1>
            <p className="mt-1 text-sm text-slate-500">
              分步填寫，灰色欄位代表這個模式不用填，避免資料混亂。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/merchant/events/${eventId}/preview`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
            >
              預覽頁
            </Link>
            <button
              type="button"
              onClick={() => saveEvent(false)}
              disabled={saving}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
            >
              {saving ? "儲存中..." : "儲存草稿"}
            </button>
            <button
              type="button"
              onClick={() => saveEvent(true)}
              disabled={saving}
              className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
            >
              提交審批
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <div className="space-y-6">
          <StepTabs current={step} setStep={setStep} />

          {message ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              {message}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
              {errorMessage}
            </div>
          ) : null}

          {step === 1 ? (
            <Panel title="Step 1：基本活動資料">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="活動名稱" value={form.title_tc} onChange={(v) => update("title_tc", v)} required />
                <SelectField label="活動分類" value={form.category} onChange={(v) => update("category", v)} options={categories} />
              </div>

              <TextArea label="短簡介" value={form.short_description_tc} onChange={(v) => update("short_description_tc", v)} rows={3} />
              <TextArea label="詳細介紹" value={form.description_tc} onChange={(v) => update("description_tc", v)} rows={6} />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="活動圖片 URL" value={form.cover_image_url} onChange={(v) => update("cover_image_url", v)} />
                <Field label="來源 / 官方頁 URL" value={form.source_url} onChange={(v) => update("source_url", v)} />
              </div>
            </Panel>
          ) : null}

          {step === 2 ? (
            <Panel title="Step 2：日期、時間及地點">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="開始日期" type="date" value={form.start_date} onChange={(v) => update("start_date", v)} />
                <Field label="結束日期" type="date" value={form.end_date} onChange={(v) => update("end_date", v)} />
                <Field label="開始時間" type="time" value={form.start_time} onChange={(v) => update("start_time", v)} />
                <Field label="結束時間" type="time" value={form.end_time} onChange={(v) => update("end_time", v)} />
                <Field label="場地名稱" value={form.venue_name} onChange={(v) => update("venue_name", v)} />
                <Field label="詳細地址" value={form.address} onChange={(v) => update("address", v)} />
                <SelectField label="地區" value={form.district} onChange={(v) => update("district", v)} options={districts} />
                <SelectField label="港鐵站" value={form.mtr_station} onChange={(v) => update("mtr_station", v)} options={mtrStations} />
              </div>

              <TextArea label="交通資料" value={form.transportation_notes} onChange={(v) => update("transportation_notes", v)} rows={4} />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Google Map 連結" value={form.google_map_url} onChange={(v) => update("google_map_url", v)} />
                <Field label="Google Map Embed URL" value={form.map_embed_url} onChange={(v) => update("map_embed_url", v)} />
              </div>

              {mapEmbed ? (
                <div className="overflow-hidden rounded-3xl border bg-slate-100">
                  <iframe title="Google Map Preview" src={mapEmbed} className="h-72 w-full" loading="lazy" />
                </div>
              ) : null}
            </Panel>
          ) : null}

          {step === 3 ? (
            <Panel title="Step 3：收費、優惠、票種及名額">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {priceModeCards.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => selectPriceMode(item.value)}
                    className={`rounded-3xl border p-4 text-left ${
                      form.price_display_mode === item.value
                        ? "border-purple-400 bg-purple-50 ring-2 ring-purple-100"
                        : "border-slate-200 bg-white hover:border-purple-200"
                    }`}
                  >
                    <p className="font-black">{item.title}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{item.desc}</p>
                  </button>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <GuidelineBox title="此模式需要填寫" text={priceGuide.need} tone="green" />
                <GuidelineBox title="此模式可不用填" text={priceGuide.skip} tone="gray" />
              </div>

              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-blue-900">
                <b>收費與名額分開顯示：</b>
                固定價只會顯示 HK$50；優惠會顯示「早鳥優惠價 HK$50 (原價 HK$90)」；
                名額會獨立顯示，不會再塞入收費欄。
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="公開頁價錢摘要，可留空由系統生成"
                  value={form.price_summary}
                  onChange={(v) => update("price_summary", v)}
                  placeholder="建議留空，避免覆蓋系統價錢格式"
                  disabled={!isFieldEnabled(form.price_display_mode, "summary")}
                />

                <Field
                  label={
                    form.price_display_mode === "fixed"
                      ? "固定收費 HK$"
                      : "最低收費 HK$"
                  }
                  type="number"
                  value={form.price_min}
                  onChange={updatePriceMin}
                  disabled={!isFieldEnabled(form.price_display_mode, "min")}
                />

                <Field
                  label="最高收費 HK$"
                  type="number"
                  value={form.price_max}
                  onChange={(v) => update("price_max", v)}
                  disabled={!isFieldEnabled(form.price_display_mode, "max")}
                  helper={
                    form.price_display_mode === "fixed"
                      ? "固定價不需要填最高收費，系統會跟固定收費一致。"
                      : ""
                  }
                />

                <Field
                  label="共用原價 HK$"
                  type="number"
                  value={form.original_price}
                  onChange={(v) => update("original_price", v)}
                  disabled={!isFieldEnabled(form.price_display_mode, "original")}
                />

                <Field
                  label="優惠價 HK$"
                  type="number"
                  value={form.discount_price}
                  onChange={(v) => update("discount_price", v)}
                  disabled={!isFieldEnabled(form.price_display_mode, "discount")}
                />

                <Field
                  label="名額摘要，只放名額資料"
                  value={form.quota_summary}
                  onChange={(v) => update("quota_summary", v)}
                  placeholder="例如：名額有限，先到先得，額滿即止"
                />

                <Field label="總名額" type="number" value={form.quota_total} onChange={(v) => update("quota_total", v)} />
                <Field label="剩餘名額" type="number" value={form.quota_remaining} onChange={(v) => update("quota_remaining", v)} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Checkbox
                  label="公開頁顯示價錢"
                  checked={form.show_price_on_public}
                  onChange={(v) => update("show_price_on_public", v)}
                  disabled={form.price_display_mode === "free_hidden" || form.price_display_mode === "quota_only"}
                />
                <Checkbox
                  label="公開頁顯示名額"
                  checked={form.show_quota_on_public}
                  onChange={(v) => update("show_quota_on_public", v)}
                />
              </div>

              <TextArea
                label="票種 / 渠道資料 JSON 或逐行輸入"
                value={form.pricing_items_text}
                onChange={(v) => update("pricing_items_text", v)}
                rows={7}
                disabled={!isFieldEnabled(form.price_display_mode, "tickets")}
              />

              <TextArea
                label="加購項目 JSON 或逐行輸入"
                value={form.add_on_items_text}
                onChange={(v) => update("add_on_items_text", v)}
                rows={4}
                disabled={!isFieldEnabled(form.price_display_mode, "addons")}
              />

              <TextArea
                label="票務 / 收費備註"
                value={form.ticketing_notes}
                onChange={(v) => update("ticketing_notes", v)}
                rows={4}
              />
            </Panel>
          ) : null}

          {step === 4 ? (
            <Panel title="Step 4：報名、導流及未來 Booking Partner">
              <div className="grid gap-3 md:grid-cols-3">
                {bookingCards.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => selectBookingType(item.value)}
                    className={`rounded-3xl border p-4 text-left ${
                      form.booking_type === item.value
                        ? "border-purple-400 bg-purple-50 ring-2 ring-purple-100"
                        : "border-slate-200 bg-white hover:border-purple-200"
                    }`}
                  >
                    <p className="font-black">{item.title}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{item.desc}</p>
                  </button>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="CTA 顯示文字" value={form.cta_label} onChange={(v) => update("cta_label", v)} />
                <Field
                  label="報名 / 購票 / 官方連結"
                  value={form.booking_url}
                  onChange={(v) => update("booking_url", v)}
                  disabled={["whatsapp", "phone", "email", "walk_in", "enquiry_only"].includes(form.booking_type)}
                  helper={
                    ["whatsapp", "phone", "email", "walk_in", "enquiry_only"].includes(form.booking_type)
                      ? "你選擇的報名方式不需要填網址。"
                      : ""
                  }
                />
                <Field
                  label="WhatsApp 報名電話"
                  value={form.booking_whatsapp}
                  onChange={(v) => update("booking_whatsapp", v)}
                  disabled={form.booking_type !== "whatsapp"}
                />
                <Field
                  label="電話查詢"
                  value={form.booking_phone}
                  onChange={(v) => update("booking_phone", v)}
                  disabled={form.booking_type !== "phone"}
                />
                <Field
                  label="電郵查詢"
                  value={form.booking_email}
                  onChange={(v) => update("booking_email", v)}
                  disabled={form.booking_type !== "email"}
                />
                <Field label="報名截止日期" type="date" value={form.registration_deadline} onChange={(v) => update("registration_deadline", v)} />
              </div>

              <TextArea
                label="WhatsApp 預設訊息"
                value={form.booking_message}
                onChange={(v) => update("booking_message", v)}
                rows={4}
                disabled={form.booking_type !== "whatsapp"}
              />

              <div className="grid gap-3 md:grid-cols-2">
                <Checkbox label="名額已滿" checked={form.is_full} onChange={(v) => update("is_full", v)} />
                <Checkbox label="Walk-in / 無需報名" checked={form.is_walk_in} onChange={(v) => update("is_walk_in", v)} />
              </div>

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
                <b>未來擴充：</b>這裡預留 Klook / Eventbrite / Ticketing Partner ID。現階段 HK Family Fun 只做曝光及導流，不處理付款。
              </div>

              <Field
                label="未來 Partner Reference，可留空"
                value={form.future_partner_ref}
                onChange={(v) => update("future_partner_ref", v)}
                placeholder="例如：KLOOK_PRODUCT_ID / EVENTBRITE_EVENT_ID"
              />
            </Panel>
          ) : null}

          {step === 5 ? (
            <Panel title="Step 5：活動內容、注意事項及主辦資料">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="適合年齡" value={form.age_groups_text} onChange={(v) => update("age_groups_text", v)} />
                <Field label="語言" value={form.language} onChange={(v) => update("language", v)} />
                <Field label="活動時長" value={form.duration_text} onChange={(v) => update("duration_text", v)} />
                <Field label="名額 / 對象" value={form.capacity_text} onChange={(v) => update("capacity_text", v)} />
                <Field label="標籤" value={form.tags_text} onChange={(v) => update("tags_text", v)} />
              </div>

              <TextArea label="活動亮點，一行一項" value={form.event_highlights_text} onChange={(v) => update("event_highlights_text", v)} rows={5} />
              <TextArea label="注意事項，一行一項" value={form.important_notes_text} onChange={(v) => update("important_notes_text", v)} rows={5} />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="主辦機構" value={form.organizer_name} onChange={(v) => update("organizer_name", v)} />
                <Field label="官方網站" value={form.official_website_url} onChange={(v) => update("official_website_url", v)} />
                <Field label="主辦電話" value={form.organizer_phone} onChange={(v) => update("organizer_phone", v)} />
                <Field label="主辦電郵" value={form.organizer_email} onChange={(v) => update("organizer_email", v)} />
                <Field label="主辦網站" value={form.organizer_website} onChange={(v) => update("organizer_website", v)} />
                <Field label="WhatsApp" value={form.contact_whatsapp} onChange={(v) => update("contact_whatsapp", v)} />
              </div>
            </Panel>
          ) : null}

          {step === 6 ? (
            <Panel title="Step 6：確認預覽及提交">
              <div className="grid gap-4 md:grid-cols-3">
                <ReviewBox label="活動名稱" value={form.title_tc || "未填"} />
                <ReviewBox label="價錢顯示" value={priceDisplay || "不顯示"} />
                <ReviewBox label="名額顯示" value={quotaDisplay || "不顯示"} />
                <ReviewBox label="CTA" value={cta.label} />
                <ReviewBox label="日期" value={`${form.start_date || "未填"} 至 ${form.end_date || "未填"}`} />
                <ReviewBox label="地點" value={`${form.venue_name || "未填"}｜${form.district || "未填"}`} />
              </div>

              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm leading-7 text-blue-900">
                Card 只顯示精簡資料；完整票價、名額、交通、注意事項及主辦資料會在活動詳情頁顯示。
              </div>
            </Panel>
          ) : null}

          <div className="flex items-center justify-between rounded-3xl border bg-white p-4">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black"
            >
              上一步
            </button>

            <span className="text-sm font-black text-slate-500">
              Step {step} / {steps.length}
            </span>

            {step < steps.length ? (
              <button
                type="button"
                onClick={() => setStep((current) => Math.min(steps.length, current + 1))}
                className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white"
              >
                下一步
              </button>
            ) : (
              <button
                type="button"
                onClick={() => saveEvent(true)}
                disabled={saving}
                className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
              >
                提交 HK Family Fun 審批
              </button>
            )}
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <LivePreviewCard
            form={form}
            priceDisplay={priceDisplay}
            quotaDisplay={quotaDisplay}
            ctaLabel={cta.label}
          />

          <Panel title="公開頁關鍵資料">
            <PreviewRow label="價錢" value={priceDisplay || "不顯示價錢"} />
            <PreviewRow label="名額" value={quotaDisplay || "不顯示名額"} />
            <PreviewRow label="CTA" value={cta.label} />
            <PreviewRow label="連結狀態" value={cta.clickable ? "可點擊" : "提示狀態"} />
            <PreviewRow label="地圖" value={mapEmbed ? "已準備" : "未填地點"} />
          </Panel>

          <Panel title="SaaS 付費價值">
            <ul className="space-y-2 text-sm leading-6 text-slate-700">
              <li>• 商戶自主更新活動資料</li>
              <li>• 不需要填的欄位會灰色提示</li>
              <li>• 收費與名額分開管理</li>
              <li>• Card 精簡，Detail 完整</li>
              <li>• 未來可接 Klook / Eventbrite Partner ID</li>
            </ul>
          </Panel>
        </aside>
      </section>
    </main>
  );
}

function StepTabs({
  current,
  setStep,
}: {
  current: number;
  setStep: (step: number) => void;
}) {
  return (
    <div className="rounded-3xl border bg-white p-3">
      <div className="grid gap-2 md:grid-cols-6">
        {steps.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStep(item.id)}
            className={`rounded-2xl px-3 py-3 text-xs font-black ${
              current === item.id
                ? "bg-purple-700 text-white"
                : "bg-slate-50 text-slate-600 hover:bg-purple-50 hover:text-purple-700"
            }`}
          >
            {item.id}. {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LivePreviewCard({
  form,
  priceDisplay,
  quotaDisplay,
  ctaLabel,
}: {
  form: EventForm;
  priceDisplay: string;
  quotaDisplay: string;
  ctaLabel: string;
}) {
  const tags = splitList(form.tags_text).slice(0, 3);
  const fallbackImage =
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80";

  return (
    <section className="rounded-[2rem] border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-purple-700">即時預覽</p>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
          家長看到的大約效果
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border">
        <div className="relative h-48 bg-slate-100">
          <img
            src={form.cover_image_url || fallbackImage}
            alt={form.title_tc || "活動圖片"}
            className="h-full w-full object-cover"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black text-purple-700 shadow">
            {form.category || "活動"}
          </span>
        </div>

        <div className="space-y-3 p-4">
          <h3 className="text-lg font-black leading-snug">
            {form.title_tc || "未命名活動"}
          </h3>

          <p className="line-clamp-3 text-sm leading-6 text-slate-600">
            {form.short_description_tc || form.description_tc || "請填寫活動簡介。"}
          </p>

          <div className="space-y-2 text-sm">
            <PreviewLine icon="📅" label="日期" value={`${form.start_date || "未填"} 至 ${form.end_date || "未填"}`} />
            <PreviewLine icon="📍" label="地點" value={`${form.venue_name || "未填"}・${form.district || "未填"}`} />
            {priceDisplay ? <PreviewLine icon="🎟️" label="收費" value={priceDisplay} /> : null}
            {quotaDisplay ? <PreviewLine icon="👥" label="名額" value={quotaDisplay} /> : null}
            <PreviewLine icon="🔗" label="報名方式" value={ctaLabel} />
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.length > 0 ? (
              tags.map((tag) => (
                <span key={tag} className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
                  {tag}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                未有標籤
              </span>
            )}
          </div>

          <button type="button" className="w-full rounded-2xl bg-purple-700 px-4 py-3 text-sm font-black text-white">
            {ctaLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function GuidelineBox({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "green" | "gray";
}) {
  return (
    <div
      className={`rounded-3xl border p-4 text-sm leading-6 ${
        tone === "green"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      <p className="font-black">{title}</p>
      <p className="mt-1">{text}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  disabled,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className={`text-xs font-black ${disabled ? "text-slate-400" : "text-slate-500"}`}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : "border-slate-200 bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
        }`}
      />
      {helper ? <p className="mt-1 text-xs font-bold text-slate-400">{helper}</p> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
      >
        {options.map((option) => (
          <option key={option || "empty"} value={option}>
            {option || "留空 / 未確認"}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className={`text-xs font-black ${disabled ? "text-slate-400" : "text-slate-500"}`}>
        {label}
      </span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm leading-7 outline-none ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : "border-slate-200 bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
        }`}
      />
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="h-4 w-4"
      />
      {label}
    </label>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 p-3 text-sm">
      <span className="font-black text-slate-500">{label}</span>
      <span className="text-right font-black text-slate-900">{value}</span>
    </div>
  );
}

function PreviewLine({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2">
      <span>{icon}</span>
      <div>
        <span className="font-black text-slate-500">{label}</span>
        <span className="ml-2 font-bold text-slate-800">{value}</span>
      </div>
    </div>
  );
}

function ReviewBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}