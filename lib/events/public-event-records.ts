import { publicSupabase as supabase } from "@/lib/supabase/public-client";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type EventRecord = {
  id: string;

  title?: string | null;
  title_tc?: string | null;
  title_sc?: string | null;
  title_en?: string | null;
  short_description_tc?: string | null;
  short_description_sc?: string | null;
  short_description_en?: string | null;
  description_tc?: string | null;
  description_sc?: string | null;
  description_en?: string | null;
  highlights?: string | null;
  terms?: string | null;
  remarks?: string | null;
  tags?: string[] | JsonValue | null;

  status?: string | null;
  approval_status?: string | null;

  merchant_id?: string | null;
  merchant_name?: string | null;
  organizer_name?: string | null;

  cover_image_url?: string | null;
  gallery_image_urls?: string[] | JsonValue | null;
  images?: string[] | JsonValue | null;

  cover_image_zoom?: number | string | null;
  cover_image_offset_x?: number | string | null;
  cover_image_offset_y?: number | string | null;
  cover_image_focus_y?: number | string | null;
  cover_image_rotate?: number | string | null;
  cover_image_flip_x?: boolean | null;
  cover_image_flip_y?: boolean | null;
  cover_image_filter?: string | null;
  cover_image_brightness?: number | string | null;
  cover_image_contrast?: number | string | null;
  cover_image_saturation?: number | string | null;

  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;

  recurrence_type?: string | null;
  recurrence_weekdays?: number[] | null;
  recurrence_include_dates?: string[] | null;
  recurrence_exclude_dates?: string[] | null;
  recurrence_note?: string | null;

  venue_name?: string | null;
  venue_name_tc?: string | null;
  venue_name_sc?: string | null;
  venue_name_en?: string | null;
  address?: string | null;
  address_tc?: string | null;
  address_sc?: string | null;
  address_en?: string | null;
  area?: string | null;
  district?: string | null;
  mtr_station?: string | null;

  price_type?: string | null;
  price_display_mode?: string | null;
  price_text?: string | null;
  price_label?: string | null;
  min_price?: number | string | null;
  max_price?: number | string | null;
  original_price?: number | string | null;
  offer_price?: number | string | null;
  quota_label?: string | null;

  age_group?: string | null;
  age_groups?: unknown;
  age_min?: number | string | null;
  age_max?: number | string | null;
  activity_type?: string | null;
  activity_category?: string | null;
  category?: string | JsonValue | null;
  is_indoor?: boolean | null;
  is_sen_friendly?: boolean | null;

  registration_required?: boolean | null;
  registration_url?: string | null;
  booking_url?: string | null;
  official_url?: string | null;
  source_url?: string | null;
  cta_type?: string | null;
  cta_text?: string | null;
  cta_label?: string | null;

  google_map_url?: string | null;
  google_map_embed_url?: string | null;

  source_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
};


export async function getPublicEventRecords(): Promise<EventRecord[]> {
  if (!supabase) {
    console.warn("Supabase 未設定，無法 server preload 公開活動資料。");
    return [];
  }

  const { data, error } = await supabase
    .from("public_events_i18n")
    .select("*")
    .eq("status", "published")
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Server preload 公開活動資料失敗：", error.message);
    return [];
  }

  return (data || []) as EventRecord[];
}
