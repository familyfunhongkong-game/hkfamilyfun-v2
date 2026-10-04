import type { Event, PriceType } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import { localizedText, type AppLocale } from "@/lib/i18n/config";

type DatabaseEvent = {
  id: string;
  title_tc: string | null;
  title_sc?: string | null;
  title_en?: string | null;
  short_description_tc: string | null;
  short_description_sc?: string | null;
  short_description_en?: string | null;
  description_tc: string | null;
  description_sc?: string | null;
  description_en?: string | null;
  organizer_name: string | null;
  merchant_name?: string | null;
  event_url: string | null;
  ticket_url: string | null;
  source_url?: string | null;
  registration_url?: string | null;
  booking_url?: string | null;
  official_url?: string | null;
  venue_name: string | null;
  venue_name_sc?: string | null;
  venue_name_en?: string | null;
  address: string | null;
  address_sc?: string | null;
  address_en?: string | null;
  district: string | null;
  mtr_station: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  recurrence_type?: "none" | "weekly" | null;
  recurrence_weekdays?: number[] | null;
  recurrence_include_dates?: string[] | null;
  recurrence_exclude_dates?: string[] | null;
  recurrence_note?: string | null;
  price_type: "free" | "paid" | "mixed" | null;
  price_display_mode?: string | null;
  price_label?: string | null;
  price_min: number | null;
  price_max: number | null;
  min_price?: string | null;
  max_price?: string | null;
  age_min: number | null;
  age_max: number | null;
  category: string | null;
  activity_category?: string | null;
  tags: unknown;
  is_free: boolean | null;
  is_sen_friendly: boolean | null;
  is_featured: boolean | null;
  status: string;
  cover_image_url: string | null;
};

function formatDate(date: string | null, locale: AppLocale) {
  if (date) return date;
  if (locale === "en") return "Date TBC";
  if (locale === "zh-Hans") return "日期待定";
  return "日期待定";
}

function parseCalendarDate(value: string | null) {
  if (!value) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isInternalTestEvent(event: DatabaseEvent) {
  const title = String(event.title_tc || "").trim().toUpperCase();
  const venue = String(event.venue_name || "").trim().toUpperCase();
  return title.startsWith("HKFF E2E") || venue.includes("HKFF E2E TEST");
}

function isExpiredEvent(event: DatabaseEvent) {
  const end = parseCalendarDate(event.end_date || event.start_date);
  if (!end) return false;

  const todayText = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const today = parseCalendarDate(todayText);
  return Boolean(today && end.getTime() < today.getTime());
}

function formatTime(
  startTime: string | null,
  endTime: string | null,
  locale: AppLocale,
) {
  if (!startTime) {
    if (locale === "en") return "Time TBC";
    if (locale === "zh-Hans") return "时间待定";
    return "時間待定";
  }

  const start = startTime.slice(0, 5);
  const end = endTime ? endTime.slice(0, 5) : "";

  return end ? `${start} - ${end}` : start;
}

function formatAgeRange(
  min: number | null,
  max: number | null,
  locale: AppLocale,
) {
  if (locale === "en") {
    if (min === null && max === null) return "All ages";
    if (min !== null && max !== null) return `Ages ${min}–${max}`;
    if (min !== null) return `Ages ${min}+`;
    return `Up to age ${max}`;
  }

  const suffix = locale === "zh-Hans" ? "岁" : "歲";
  if (min === null && max === null) {
    return locale === "zh-Hans" ? "适合所有年龄" : "適合所有年齡";
  }
  if (min !== null && max !== null) return `${min}-${max}${suffix}`;
  if (min !== null) return `${min}${suffix}${locale === "zh-Hans" ? "以上" : "以上"}`;
  return `${max}${suffix}${locale === "zh-Hans" ? "或以下" : "或以下"}`;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 8);
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean).slice(0, 8);
      }
    } catch {
      // Plain comma/newline-separated tags are expected in the current schema.
    }

    return text
      .split(/[,\n，、]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  return [];
}

function formatPrice(event: DatabaseEvent, locale: AppLocale) {
  const isFree =
    event.is_free ||
    event.price_type === "free" ||
    event.price_display_mode === "free";

  if (isFree) {
    if (locale === "en") return "Free";
    if (locale === "zh-Hans") return "免费";
    return "免費";
  }

  const modernMin = Number(event.min_price);
  const modernMax = Number(event.max_price);

  if (Number.isFinite(modernMin) && modernMin >= 0) {
    if (
      Number.isFinite(modernMax) &&
      modernMax >= 0 &&
      modernMax !== modernMin
    ) {
      return `HK${modernMin} - HK${modernMax}`;
    }
    if (modernMin > 0) return `HK${modernMin}`;
  }

  if (event.price_min !== null && event.price_max !== null) {
    if (event.price_min === event.price_max) {
      return `HK${event.price_min}`;
    }
    return `HK${event.price_min} - HK${event.price_max}`;
  }

  if (event.price_min !== null) {
    return locale === "en"
      ? `From HK${event.price_min}`
      : `HK${event.price_min}${locale === "zh-Hans" ? "起" : "起"}`;
  }

  if (event.price_label?.trim()) return event.price_label.trim();

  if (locale === "en") return "See official website for details";
  if (locale === "zh-Hans") return "详情请见官方网站";
  return "詳情請見官方網站";
}

function localizeDistrict(value: string | null, locale: AppLocale) {
  const raw = String(value || "").trim();
  if (!raw) return locale === "en" ? "Hong Kong" : "香港";

  const districts: Record<string, [string, string]> = {
    "中西區": ["中西区", "Central and Western"],
    "灣仔區": ["湾仔区", "Wan Chai"],
    "東區": ["东区", "Eastern"],
    "南區": ["南区", "Southern"],
    "油尖旺區": ["油尖旺区", "Yau Tsim Mong"],
    "深水埗區": ["深水埗区", "Sham Shui Po"],
    "九龍城區": ["九龙城区", "Kowloon City"],
    "黃大仙區": ["黄大仙区", "Wong Tai Sin"],
    "觀塘區": ["观塘区", "Kwun Tong"],
    "葵青區": ["葵青区", "Kwai Tsing"],
    "荃灣區": ["荃湾区", "Tsuen Wan"],
    "屯門區": ["屯门区", "Tuen Mun"],
    "元朗區": ["元朗区", "Yuen Long"],
    "北區": ["北区", "North"],
    "大埔區": ["大埔区", "Tai Po"],
    "沙田區": ["沙田区", "Sha Tin"],
    "西貢區": ["西贡区", "Sai Kung"],
    "離島區": ["离岛区", "Islands"],
  };

  const mapped = districts[raw];
  if (!mapped) return raw;
  if (locale === "zh-Hans") return mapped[0];
  if (locale === "en") return mapped[1];
  return raw;
}

function mapDatabaseEvent(event: DatabaseEvent, locale: AppLocale): Event {
  return {
    id: event.id,
    title: localizedText(locale, {
      tc: event.title_tc,
      sc: event.title_sc,
      en: event.title_en,
      fallback: locale === "en" ? "Untitled event" : "未命名活動",
    }),
    shortDescription: localizedText(locale, {
      tc: event.short_description_tc,
      sc: event.short_description_sc,
      en: event.short_description_en,
    }),
    description: localizedText(locale, {
      tc: event.description_tc || event.short_description_tc,
      sc: event.description_sc || event.short_description_sc,
      en: event.description_en || event.short_description_en,
    }),
    date: formatDate(event.start_date, locale),
    endDate: event.end_date || undefined,
    recurrenceType:
      event.recurrence_type === "weekly" ? "weekly" : "none",
    recurrenceWeekdays: Array.isArray(event.recurrence_weekdays)
      ? event.recurrence_weekdays.map(Number)
      : [],
    recurrenceIncludeDates: Array.isArray(event.recurrence_include_dates)
      ? event.recurrence_include_dates.map(String)
      : [],
    recurrenceExcludeDates: Array.isArray(event.recurrence_exclude_dates)
      ? event.recurrence_exclude_dates.map(String)
      : [],
    recurrenceNote: event.recurrence_note || undefined,
    time: formatTime(event.start_time, event.end_time, locale),
    district: localizeDistrict(event.district, locale),
    mtrStation: event.mtr_station || (locale === "en" ? "MTR TBC" : locale === "zh-Hans" ? "港铁站待定" : "港鐵站待定"),
    ageRange: formatAgeRange(event.age_min, event.age_max, locale),
    organizer: event.organizer_name || event.merchant_name || (locale === "en" ? "Organizer TBC" : "主辦單位待定"),
    tags: normalizeTags(event.tags),
    category: event.activity_category || event.category || "親子活動",
    priceType: (
      event.is_free || event.price_type === "free" || event.price_display_mode === "free"
        ? "free"
        : event.price_type || "paid"
    ) as PriceType,
    price: formatPrice(event, locale),
    senFriendly: Boolean(event.is_sen_friendly),
    image:
      event.cover_image_url ||
      "https://placehold.co/1200x675/f5f3ff/7c3aed?text=HK+Family+Fun",
    officialLink:
      event.registration_url ||
      event.booking_url ||
      event.official_url ||
      event.ticket_url ||
      event.event_url ||
      event.source_url ||
      undefined,
    featured: Boolean(event.is_featured),
    address:
      localizedText(locale, {
        tc: event.address,
        sc: event.address_sc,
        en: event.address_en,
      }) || undefined,
  };
}

export async function getPublishedEvents(locale: AppLocale = "zh-Hant"): Promise<Event[]> {
  if (!supabase) {
    console.warn("Supabase 未設定，無法讀取活動資料。");
    return [];
  }

  const { data, error } = await supabase
    .from("public_events_i18n")
    .select("*")
    .eq("status", "published")
    .order("start_date", { ascending: true });

  if (error) {
    console.error("讀取 Supabase 活動資料失敗：", error.message);
    return [];
  }

  return ((data || []) as DatabaseEvent[])
    .filter((event) => !isInternalTestEvent(event) && !isExpiredEvent(event))
    .map((event) => mapDatabaseEvent(event, locale));
}

export async function getPublishedEventById(
  id: string,
  locale: AppLocale = "zh-Hant",
): Promise<Event | null> {
  if (!supabase) {
    console.warn("Supabase 未設定，無法讀取活動資料。");
    return null;
  }

  const { data, error } = await supabase
    .from("public_events_i18n")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (error || !data) {
    console.error("讀取活動詳情失敗：", error?.message);
    return null;
  }

  const event = data as DatabaseEvent;
  if (isInternalTestEvent(event) || isExpiredEvent(event)) return null;

  return mapDatabaseEvent(event, locale);
}
