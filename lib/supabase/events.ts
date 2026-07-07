import type { Event, PriceType } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";

type DatabaseEvent = {
  id: string;
  title_tc: string;
  short_description_tc: string | null;
  description_tc: string | null;
  organizer_name: string | null;
  event_url: string | null;
  ticket_url: string | null;
  venue_name: string | null;
  address: string | null;
  district: string | null;
  mtr_station: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  price_type: "free" | "paid" | "mixed" | null;
  price_min: number | null;
  price_max: number | null;
  age_min: number | null;
  age_max: number | null;
  category: string | null;
  tags: string[] | null;
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

function formatPrice(event: DatabaseEvent) {
  if (event.is_free || event.price_type === "free") return "免費";

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
    title: event.title_tc,
    shortDescription: event.short_description_tc || "",
    description: event.description_tc || event.short_description_tc || "",
    date: formatDate(event.start_date),
    endDate: event.end_date || undefined,
    time: formatTime(event.start_time, event.end_time),
    district: event.district || "香港",
    mtrStation: event.mtr_station || "待定",
    ageRange: formatAgeRange(event.age_min, event.age_max),
    organizer: event.organizer_name || "主辦單位待定",
    tags: event.tags || [],
    category: event.category || "親子活動",
    priceType: (event.price_type || "free") as PriceType,
    price: formatPrice(event),
    senFriendly: Boolean(event.is_sen_friendly),
    image:
      event.cover_image_url ||
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1200&q=80",
    officialLink: event.ticket_url || event.event_url || undefined,
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
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("start_date", { ascending: true });

  if (error) {
    console.error("讀取 Supabase 活動資料失敗：", error.message);
    return [];
  }

  return ((data || []) as DatabaseEvent[]).map(mapDatabaseEvent);
}

export async function getPublishedEventById(
  id: string
): Promise<Event | null> {
  if (!supabase) {
    console.warn("Supabase 未設定，無法讀取活動資料。");
    return null;
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (error || !data) {
    console.error("讀取活動詳情失敗：", error?.message);
    return null;
  }

  return mapDatabaseEvent(data as DatabaseEvent);
}
