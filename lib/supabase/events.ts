import type { Event, PriceType } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";

type DatabaseEvent = {
  id: string;
  title_tc: string | null;
  short_description_tc: string | null;
  description_tc: string | null;
  organizer_name: string | null;
  merchant_name?: string | null;
  event_url: string | null;
  ticket_url: string | null;
  source_url?: string | null;
  registration_url?: string | null;
  booking_url?: string | null;
  official_url?: string | null;
  venue_name: string | null;
  address: string | null;
  district: string | null;
  mtr_station: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
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

function formatDate(date: string | null) {
  if (!date) return "日期待定";
  return date;
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

function formatTime(startTime: string | null, endTime: string | null) {
  if (!startTime) return "時間待定";

  const start = startTime.slice(0, 5);
  const end = endTime ? endTime.slice(0, 5) : "";

  return end ? `${start} - ${end}` : start;
}

function formatAgeRange(min: number | null, max: number | null) {
  if (min === null && max === null) return "適合所有年齡";
  if (min !== null && max !== null) return `${min}-${max}歲`;
  if (min !== null) return `${min}歲以上`;
  return `${max}歲或以下`;
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

function formatPrice(event: DatabaseEvent) {
  if (event.price_label?.trim()) return event.price_label.trim();

  if (
    event.is_free ||
    event.price_type === "free" ||
    event.price_display_mode === "free"
  ) {
    return "免費";
  }

  const modernMin = Number(event.min_price);
  const modernMax = Number(event.max_price);

  if (Number.isFinite(modernMin) && modernMin > 0) {
    if (Number.isFinite(modernMax) && modernMax > 0 && modernMax !== modernMin) {
      return `HK$${modernMin} - HK$${modernMax}`;
    }
    return `HK$${modernMin}`;
  }

  if (event.price_min !== null && event.price_max !== null) {
    if (event.price_min === event.price_max) {
      return `HK$${event.price_min}`;
    }
    return `HK$${event.price_min} - HK$${event.price_max}`;
  }

  if (event.price_min !== null) return `HK$${event.price_min}起`;

  return "詳情請見官方網站";
}

function mapDatabaseEvent(event: DatabaseEvent): Event {
  return {
    id: event.id,
    title: event.title_tc || "未命名活動",
    shortDescription: event.short_description_tc || "",
    description: event.description_tc || event.short_description_tc || "",
    date: formatDate(event.start_date),
    endDate: event.end_date || undefined,
    time: formatTime(event.start_time, event.end_time),
    district: event.district || "香港",
    mtrStation: event.mtr_station || "待定",
    ageRange: formatAgeRange(event.age_min, event.age_max),
    organizer: event.organizer_name || event.merchant_name || "主辦單位待定",
    tags: normalizeTags(event.tags),
    category: event.activity_category || event.category || "親子活動",
    priceType: (
      event.is_free || event.price_type === "free" || event.price_display_mode === "free"
        ? "free"
        : event.price_type || "paid"
    ) as PriceType,
    price: formatPrice(event),
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
    address: event.address || undefined,
  };
}

export async function getPublishedEvents(): Promise<Event[]> {
  if (!supabase) {
    console.warn("Supabase 未設定，無法讀取活動資料。");
    return [];
  }

  const { data, error } = await supabase
    .from("public_events")
    .select("*")
    .eq("status", "published")
    .order("start_date", { ascending: true });

  if (error) {
    console.error("讀取 Supabase 活動資料失敗：", error.message);
    return [];
  }

  return ((data || []) as DatabaseEvent[])
    .filter((event) => !isExpiredEvent(event))
    .map(mapDatabaseEvent);
}

export async function getPublishedEventById(
  id: string,
): Promise<Event | null> {
  if (!supabase) {
    console.warn("Supabase 未設定，無法讀取活動資料。");
    return null;
  }

  const { data, error } = await supabase
    .from("public_events")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (error || !data) {
    console.error("讀取活動詳情失敗：", error?.message);
    return null;
  }

  const event = data as DatabaseEvent;
  if (isExpiredEvent(event)) return null;

  return mapDatabaseEvent(event);
}
