"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import ResilientEventImage from "@/components/resilient-event-image";
import { getClientLocale } from "@/lib/i18n/client";
import { localizedText, uiText, type AppLocale } from "@/lib/i18n/config";
import { getEventDetailMessages } from "@/lib/i18n/event-page-messages";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type EventRecord = {
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
  organizer_phone?: string | null;
  organizer_email?: string | null;
  organizer_website?: string | null;

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
  price_note?: string | null;
  min_price?: number | string | null;
  max_price?: number | string | null;
  original_price?: number | string | null;
  offer_price?: number | string | null;
  quota_label?: string | null;

  age_group?: string | null;
  activity_type?: string | null;
  activity_category?: string | null;
  category?: string | JsonValue | null;

  registration_required?: boolean | null;
  registration_url?: string | null;
  booking_url?: string | null;
  official_url?: string | null;
  source_url?: string | null;
  booking_method?: string | null;
  cta_type?: string | null;
  cta_text?: string | null;
  cta_label?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  whatsapp?: string | null;

  google_map_url?: string | null;
  google_map_embed_url?: string | null;

  parent_note_tc?: string | null;
  safety_note_tc?: string | null;
  cancellation_policy_tc?: string | null;

  source_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
};

type GalleryImage = {
  url: string;
  label: string;
  isCover: boolean;
};

const FALLBACK_IMAGE =
  "https://placehold.co/1200x675/f5f3ff/7c3aed?text=HK+Family+Fun";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FAVORITES_STORAGE_KEY = "hkff_favorite_event_ids";

function safeText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;

  if (Array.isArray(value)) {
    const joined = value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join(", ");

    return joined || fallback;
  }

  if (typeof value === "object") return fallback;

  const text = String(value).trim();
  return text.length ? text : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^https?:\/\//i.test(value.trim());
}

function normalizeImageArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;

        if (
          item &&
          typeof item === "object" &&
          "url" in item &&
          typeof (item as { url?: unknown }).url === "string"
        ) {
          return String((item as { url: string }).url);
        }

        if (
          item &&
          typeof item === "object" &&
          "src" in item &&
          typeof (item as { src?: unknown }).src === "string"
        ) {
          return String((item as { src: string }).src);
        }

        return "";
      })
      .map((item) => item.trim())
      .filter((item) => /^https?:\/\//i.test(item));
  }

  if (typeof value === "string") {
    const trimmed: string = value.trim();

    if (!trimmed) return [];

    if (/^https?:\/\//i.test(trimmed)) {
      return [trimmed];
    }

    try {
      const parsed: unknown = JSON.parse(trimmed);
      return normalizeImageArray(parsed);
    } catch {
      return trimmed
        .split(/[,\n，、]/)
        .map((item) => item.trim())
        .filter((item) => /^https?:\/\//i.test(item));
    }
  }

  return [];
}

function uniqueImages(input: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of input) {
    const url = raw.trim();
    if (!/^https?:\/\//i.test(url)) continue;

    const key = url.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    output.push(url);
  }

  return output;
}

function getBaseGalleryImages(event: EventRecord): GalleryImage[] {
  const cover =
    typeof event.cover_image_url === "string" &&
    /^https?:\/\//i.test(event.cover_image_url.trim())
      ? event.cover_image_url.trim()
      : "";

  const galleryFromMain = normalizeImageArray(event.gallery_image_urls);
  const galleryFromImages = normalizeImageArray(event.images);

  const ordered = uniqueImages([
    cover,
    ...galleryFromMain,
    ...galleryFromImages,
  ]).slice(0, 6);

  if (ordered.length === 0) {
    return [
      {
        url: FALLBACK_IMAGE,
        label: "HK Family Fun 預設圖片",
        isCover: true,
      },
    ];
  }

  return ordered.map((url, index) => ({
    url,
    label: index === 0 ? "封面圖片" : `Gallery 圖片 ${index}`,
    isCover: index === 0,
  }));
}

function formatDate(value: string | null | undefined, locale: AppLocale): string {
  if (!value) return uiText(locale, "日期待定", "日期待定", "Date TBC");

  // Database event dates are calendar dates, not moments in time.
  // Parse YYYY-MM-DD in local calendar space so UTC/timezone conversion
  // can never move an event to the previous/next day.
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
    : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(
    locale === "en" ? "en-HK" : locale === "zh-Hans" ? "zh-CN" : "zh-HK",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );
}

function formatDateRange(event: EventRecord, locale: AppLocale): string {
  const start = formatDate(event.start_date, locale);
  const end = formatDate(event.end_date, locale);

  if (!event.start_date && !event.end_date) {
    return uiText(locale, "日期待定", "日期待定", "Date TBC");
  }

  if (
    safeText(event.recurrence_type, "none").toLowerCase() === "weekly" &&
    safeText(event.recurrence_note)
  ) {
    return locale === "en"
      ? `${start} – ${end} | ${safeText(event.recurrence_note)}`
      : `${start} 至 ${end}｜${safeText(event.recurrence_note)}`;
  }

  if (!event.end_date || start === end) return start;

  return locale === "en" ? `${start} – ${end}` : `${start} 至 ${end}`;
}

function formatTimeRange(event: EventRecord, locale: AppLocale): string {
  const normalizeTime = (value: unknown) => {
    const text = safeText(value);
    return /^\d{2}:\d{2}/.test(text) ? text.slice(0, 5) : text;
  };

  const start = normalizeTime(event.start_time);
  const end = normalizeTime(event.end_time);

  if (!start && !end) return uiText(locale, "時間待定", "时间待定", "Time TBC");
  if (start && end) return `${start} - ${end}`;

  return start || end || uiText(locale, "時間待定", "时间待定", "Time TBC");
}

function formatPrice(event: EventRecord, locale: AppLocale): string {
  const priceMode = safeText(
    event.price_display_mode || event.price_type,
  ).toLowerCase();
  const priceLabel = safeText(event.price_label || event.price_text);
  const minPrice = safeText(event.min_price);
  const maxPrice = safeText(event.max_price);
  const offerPrice = safeText(event.offer_price);
  const originalPrice = safeText(event.original_price);
  const quotaLabel = safeText(event.quota_label);

  if (priceLabel) return priceLabel;

  if (priceMode === "hidden") return uiText(locale, "不顯示價錢", "不显示价格", "Price hidden");
  if (priceMode === "free") return uiText(locale, "免費", "免费", "Free");
  if (priceMode === "quota") return quotaLabel || uiText(locale, "名額有限", "名额有限", "Limited places");

  if (priceMode === "early_bird") {
    if (offerPrice && originalPrice) {
      return uiText(locale, `早鳥優惠 HK$${offerPrice}（原價 HK$${originalPrice}）`, `早鸟优惠 HK$${offerPrice}（原价 HK$${originalPrice}）`, `Early bird HK$${offerPrice} (regular HK$${originalPrice})`);
    }
    if (offerPrice) return uiText(locale, `早鳥優惠 HK$${offerPrice}`, `早鸟优惠 HK$${offerPrice}`, `Early bird HK$${offerPrice}`);
    return uiText(locale, "早鳥優惠待確認", "早鸟优惠待确认", "Early-bird price TBC");
  }

  if (priceMode === "range") {
    if (minPrice && maxPrice && minPrice !== maxPrice) {
      return `HK$${minPrice}–HK$${maxPrice}`;
    }
    if (minPrice) return locale === "en" ? `From HK$${minPrice}` : `HK$${minPrice} 起`;
    return uiText(locale, "價錢範圍待確認", "价格范围待确认", "Price range TBC");
  }

  if (priceMode === "fixed") {
    if (minPrice) return `HK$${minPrice}`;
    return uiText(locale, "固定收費待確認", "固定收费待确认", "Fixed price TBC");
  }

  if (priceMode === "from" || priceMode === "paid") {
    if (minPrice) return locale === "en" ? `From HK$${minPrice}` : `HK$${minPrice} 起`;
    return uiText(locale, "收費活動", "收费活动", "Paid event");
  }

  return uiText(locale, "收費待確認", "收费待确认", "Price TBC");
}

function getCategoryLabel(event: EventRecord, locale: AppLocale): string {
  const raw = safeText(
    event.activity_category ||
      event.category ||
      event.activity_type ||
      event.age_group,
    "親子活動",
  );

  const labels: Record<string, [string, string, string]> = {
    kids: ["親子活動", "亲子活动", "Family Activity"],
    parent_child: ["親子活動", "亲子活动", "Family Activity"],
    family: ["親子活動", "亲子活动", "Family Activity"],
    workshop: ["工作坊", "工作坊", "Workshop"],
    market: ["市集", "市集", "Market"],
    exhibition: ["展覽", "展览", "Exhibition"],
    festival: ["節慶活動", "节庆活动", "Festival"],
    education: ["教育活動", "教育活动", "Educational"],
    arts: ["藝術創作", "艺术创作", "Arts"],
    cooking: ["烹飪", "烹饪", "Cooking"],
    sports: ["運動", "运动", "Sports"],
    music: ["音樂", "音乐", "Music"],
    theatre: ["劇場", "剧场", "Theatre"],
    outdoor: ["戶外活動", "户外活动", "Outdoor"],
    indoor: ["室內活動", "室内活动", "Indoor"],
    sen: ["SEN 友善", "SEN 友善", "SEN Friendly"],
    free: ["免費活動", "免费活动", "Free Event"],
  };

  return labels[raw] ? uiText(locale, ...labels[raw]) : raw;
}

function getTagArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => safeText(item)).filter(Boolean).slice(0, 8);
  }

  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return getTagArray(parsed);
    } catch {
      return value
        .split(/[,\n，、]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8);
    }
  }

  return [];
}

function getRegistrationUrl(event: EventRecord): string | null {
  if (isHttpUrl(event.registration_url)) return String(event.registration_url).trim();
  if (isHttpUrl(event.booking_url)) return String(event.booking_url).trim();

  return null;
}

function getOfficialWebsiteUrl(event: EventRecord): string | null {
  if (isHttpUrl(event.official_url)) return String(event.official_url).trim();
  if (isHttpUrl(event.source_url)) return String(event.source_url).trim();
  if (isHttpUrl(event.organizer_website)) {
    return String(event.organizer_website).trim();
  }

  return null;
}

function getPrimaryActionUrl(event: EventRecord): string | null {
  return getRegistrationUrl(event) || getOfficialWebsiteUrl(event);
}

function getPrimaryActionLabel(event: EventRecord, locale: AppLocale): string {
  const custom = safeText(event.cta_label || event.cta_text);
  const registrationUrl = getRegistrationUrl(event);
  const officialUrl = getOfficialWebsiteUrl(event);
  const ctaType = safeText(event.cta_type).toLowerCase();

  if (registrationUrl) return custom || uiText(locale, "前往報名", "前往报名", "Register");
  if (ctaType === "whatsapp") return custom || uiText(locale, "WhatsApp 報名", "WhatsApp 报名", "Register via WhatsApp");
  if (ctaType === "google_form") return custom || uiText(locale, "Google Form 報名", "Google Form 报名", "Register via Google Form");
  if (officialUrl) return custom || uiText(locale, "活動官網查看更多", "活动官网查看更多", "View Official Website");
  if (ctaType === "none" || event.registration_required === false) {
    return uiText(locale, "無需報名", "无需报名", "No Registration Required");
  }
  if (ctaType === "contact" || event.registration_required) return uiText(locale, "請向主辦查詢", "请向主办查询", "Contact Organizer");

  return custom || uiText(locale, "活動官網查看更多", "活动官网查看更多", "View Official Website");
}

function getCoverTransform(event: EventRecord): CSSProperties {
  const zoom = Math.min(Math.max(toNumber(event.cover_image_zoom, 1), 0.8), 3);
  const offsetX = Math.min(
    Math.max(toNumber(event.cover_image_offset_x, 0), -100),
    100,
  );
  const offsetY = Math.min(
    Math.max(toNumber(event.cover_image_offset_y, 0), -100),
    100,
  );
  const focusY = Math.min(
    Math.max(toNumber(event.cover_image_focus_y, 50), 0),
    100,
  );
  const rotate = toNumber(event.cover_image_rotate, 0);
  const flipX = event.cover_image_flip_x ? -1 : 1;
  const flipY = event.cover_image_flip_y ? -1 : 1;

  return {
    transform: `translate(${offsetX}%, ${offsetY}%) scale(${zoom}) rotate(${rotate}deg) scaleX(${flipX}) scaleY(${flipY})`,
    transformOrigin: `50% ${focusY}%`,
  };
}

function getCoverFilter(event: EventRecord): CSSProperties {
  const brightness = Math.min(
    Math.max(toNumber(event.cover_image_brightness, 100), 40),
    180,
  );
  const contrast = Math.min(
    Math.max(toNumber(event.cover_image_contrast, 100), 40),
    180,
  );
  const saturation = Math.min(
    Math.max(toNumber(event.cover_image_saturation, 100), 0),
    220,
  );
  const filterName = safeText(event.cover_image_filter, "none");

  let extraFilter = "";
  if (filterName === "warm") extraFilter = "sepia(0.16)";
  if (filterName === "cool") extraFilter = "hue-rotate(8deg) saturate(0.95)";
  if (filterName === "mono") extraFilter = "grayscale(1)";
  if (filterName === "soft") extraFilter = "contrast(0.94) brightness(1.04)";

  return {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${extraFilter}`,
  };
}

function canShowPublic(event: EventRecord): boolean {
  const status = safeText(event.status || event.approval_status, "draft").toLowerCase();
  return status === "published";
}

function buildLocationText(event: EventRecord): string {
  return [
    event.venue_name_tc || event.venue_name,
    event.address_tc || event.address,
    event.district,
    event.mtr_station,
  ]
    .map((item) => safeText(item))
    .filter(Boolean)
    .join("｜");
}

function buildMapQuery(event: EventRecord): string {
  return [
    event.venue_name_tc || event.venue_name,
    event.address_tc || event.address,
    event.district,
    event.mtr_station,
    "香港",
  ]
    .map((item) => safeText(item))
    .filter(Boolean)
    .join(" ");
}

function getGoogleMapSearchUrl(event: EventRecord): string | null {
  if (isHttpUrl(event.google_map_url)) return String(event.google_map_url).trim();

  const query = buildMapQuery(event);
  if (!query) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function getGoogleMapEmbedUrl(event: EventRecord): string | null {
  if (isHttpUrl(event.google_map_embed_url)) {
    return String(event.google_map_embed_url).trim();
  }

  const query = buildMapQuery(event);
  if (!query) return null;

  return `https://maps.google.com/maps?q=${encodeURIComponent(
    query,
  )}&output=embed`;
}

function readFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function writeFavoriteIds(ids: string[]) {
  if (typeof window === "undefined") return;

  const unique = Array.from(new Set(ids.filter(Boolean)));
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(unique));
}

function Badge({
  children,
  tone = "purple",
}: {
  children: ReactNode;
  tone?: "purple" | "green" | "amber" | "slate" | "rose" | "orange";
}) {
  const className =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : tone === "orange"
          ? "bg-orange-50 text-orange-700 ring-orange-100"
          : tone === "rose"
            ? "bg-rose-50 text-rose-700 ring-rose-100"
            : tone === "slate"
              ? "bg-slate-100 text-slate-700 ring-slate-200"
              : "bg-purple-50 text-purple-700 ring-purple-100";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-slate-800">{value}</p>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-2xl bg-purple-50 text-sm">
          {icon}
        </span>
        <h2 className="text-base font-extrabold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function PublicEventDetailPage() {
  const params = useParams();
  const rawEventId = String(params?.id || "");
  const eventId = decodeURIComponent(rawEventId);

  const [locale, setLocale] = useState<AppLocale>("zh-Hant");
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const m = getEventDetailMessages(locale);

  useEffect(() => {
    setLocale(getClientLocale());
    setFavoriteIds(readFavoriteIds());
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadEvent() {
      const activeLocale = getClientLocale();
      setLocale(activeLocale);
      setLoading(true);
      setErrorText("");

      if (!eventId || !UUID_REGEX.test(eventId)) {
        setErrorText(
          activeLocale === "en"
            ? "This event link is invalid. Please return to the event list."
            : activeLocale === "zh-Hans"
              ? "活动链接格式不正确，请由活动列表重新进入。"
              : "活動連結格式不正確，請由活動列表重新進入。",
        );
        setEvent(null);
        setLoading(false);
        return;
      }

      if (!supabase) {
        setErrorText(
          activeLocale === "en"
            ? "The event database is temporarily unavailable. Please try again later."
            : activeLocale === "zh-Hans"
              ? "网站暂时未能连接数据库，请稍后再试。"
              : "網站暫時未能連接資料庫，請稍後再試。",
        );
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("public_events_i18n")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

      if (ignore) return;

      if (error) {
        setErrorText(
          error.message ||
            (activeLocale === "en"
              ? "Failed to load event details."
              : activeLocale === "zh-Hans"
                ? "读取活动资料失败。"
                : "讀取活動資料失敗。"),
        );
        setEvent(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setErrorText(
          activeLocale === "en"
            ? "This event could not be found."
            : activeLocale === "zh-Hans"
              ? "找不到此活动。"
              : "找不到此活動。",
        );
        setEvent(null);
        setLoading(false);
        return;
      }

      const loadedEvent = data as EventRecord;

      setEvent(loadedEvent);
      setSelectedImageIndex(0);
      setLoading(false);
    }

    loadEvent();

    return () => {
      ignore = true;
    };
  }, [eventId]);

  const images = useMemo(() => {
    if (!event) return [];
    return getBaseGalleryImages(event);
  }, [event]);

  const safeSelectedImageIndex =
    selectedImageIndex >= images.length ? 0 : selectedImageIndex;

  const selectedImage = images[safeSelectedImageIndex] || images[0];

  const tags = useMemo(() => {
    if (!event) return [];
    return getTagArray(event.tags);
  }, [event]);

  const isFavorite = favoriteIds.includes(eventId);

  function toggleFavorite() {
    setFavoriteIds((current) => {
      const exists = current.includes(eventId);
      const next = exists
        ? current.filter((id) => id !== eventId)
        : [...current, eventId];

      writeFavoriteIds(next);
      return next;
    });
  }

  async function copyTextToClipboard(text: string, onSuccess: () => void) {
    if (!text) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        onSuccess();
        window.setTimeout(() => {
          setCopiedAddress(false);
          setCopiedShare(false);
        }, 1800);
      }
    } catch {
      setCopiedAddress(false);
      setCopiedShare(false);
    }
  }

  async function shareEvent(title: string, description: string) {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/events/${eventId}`
        : `/events/${eventId}`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        });
        return;
      }

      await copyTextToClipboard(shareUrl, () => setCopiedShare(true));
    } catch {
      setCopiedShare(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-bold text-slate-500">{m.loading}</p>
          </div>
        </div>
      </main>
    );
  }

  if (errorText || !event) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-extrabold text-rose-600">{m.loadFailed}</p>
            <p className="mt-2 text-sm text-slate-600">{errorText}</p>
            <Link
              href="/events"
              className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-extrabold text-white"
            >
              {m.back}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!canShowPublic(event)) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
            <Badge tone="amber">{m.notPublished}</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
              {m.notPublishedTitle}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {m.notPublishedDesc}
            </p>
            <Link
              href="/events"
              className="mt-6 inline-flex rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800"
            >
              {m.back}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const title = localizedText(locale, {
    tc: event.title_tc || event.title,
    sc: event.title_sc,
    en: event.title_en,
    fallback: locale === "en" ? "Untitled event" : "未命名活動",
  });
  const shortDescription = localizedText(locale, {
    tc: event.short_description_tc,
    sc: event.short_description_sc,
    en: event.short_description_en,
    fallback:
      locale === "en"
        ? "HK Family Fun selected family activity. Please confirm the latest arrangements with the organizer before visiting."
        : "HK Family Fun 精選親子活動，出發前請向主辦方確認最新安排。",
  });
  const description = localizedText(locale, {
    tc: event.description_tc,
    sc: event.description_sc,
    en: event.description_en,
    fallback: locale === "en" ? "Detailed event information is not available yet." : "暫未提供詳細活動內容。",
  });

  const venue = localizedText(locale, {
    tc: event.venue_name_tc || event.venue_name || event.address_tc || event.address,
    sc: event.venue_name_sc || event.address_sc,
    en: event.venue_name_en || event.address_en,
    fallback: safeText(event.district, locale === "en" ? "Location TBC" : "地點待定"),
  });
  const address = localizedText(locale, {
    tc: event.address_tc || event.address,
    sc: event.address_sc,
    en: event.address_en,
  });
  const district = safeText(event.district, "");
  const mtr = safeText(event.mtr_station, "");

  const merchantName = safeText(
    event.merchant_name || event.organizer_name,
    "HK Family Fun 商戶",
  );

  const registrationUrl = getRegistrationUrl(event);
  const officialUrl = getOfficialWebsiteUrl(event);
  const actionUrl = getPrimaryActionUrl(event);
  const actionLabel = getPrimaryActionLabel(event, locale);

  const isFallbackCover = images[0]?.url === FALLBACK_IMAGE;

  const coverStyle: CSSProperties = isFallbackCover
    ? {}
    : {
        ...getCoverTransform(event),
        ...getCoverFilter(event),
      };

  const selectedImageStyle: CSSProperties =
    selectedImage?.isCover && selectedImage?.url !== FALLBACK_IMAGE
      ? coverStyle
      : {};

  const mapUrl = getGoogleMapSearchUrl(event);
  const mapEmbedUrl = getGoogleMapEmbedUrl(event);
  const locationText = buildLocationText(event);
  const addressCopyText =
    locationText || [venue, address, district, mtr].filter(Boolean).join("｜");

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <Link
            href="/events"
            className="text-sm font-extrabold text-purple-700 hover:text-purple-900"
          >
            ← {m.back}
          </Link>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-purple-50 via-white to-amber-50">
                <ResilientEventImage
                  src={isFallbackCover ? null : images[0]?.url}
                  alt={title}
                  loading="eager"
                  fetchPriority="high"
                  className="h-full w-full object-cover"
                  style={coverStyle}
                />

                <button
                  type="button"
                  onClick={toggleFavorite}
                  className={[
                    "absolute right-4 top-4 rounded-full px-4 py-2 text-sm font-black shadow-sm backdrop-blur transition",
                    isFavorite
                      ? "bg-rose-500 text-white"
                      : "bg-white/90 text-slate-700 hover:bg-rose-50 hover:text-rose-600",
                  ].join(" ")}
                >
                  {isFavorite ? `❤️ ${m.saved}` : `♡ ${m.save}`}
                </button>
              </div>

              <div className="p-6 lg:p-8">
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge tone="purple">{getCategoryLabel(event, locale)}</Badge>
                  <Badge tone="amber">{formatPrice(event, locale)}</Badge>
                  {mtr ? <Badge tone="slate">{mtr}</Badge> : null}
                </div>

                <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-950 lg:text-4xl">
                  {title}
                </h1>

                <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                  {shortDescription}
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <InfoPill label={m.date} value={formatDateRange(event, locale)} />
                  <InfoPill label={m.time} value={formatTimeRange(event, locale)} />
                  <InfoPill label={m.location} value={venue} />
                  <InfoPill label={m.price} value={formatPrice(event, locale)} />
                </div>

                {tags.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-slate-950">{m.registration}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {m.registrationNote}
                </p>

                {actionUrl ? (
                  <a
                    href={actionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={[
                      "mt-5 inline-flex w-full items-center justify-center rounded-2xl px-5 py-4 text-sm font-black text-white",
                      registrationUrl
                        ? "bg-purple-700 hover:bg-purple-800"
                        : "bg-slate-950 hover:bg-slate-800",
                    ].join(" ")}
                  >
                    {actionLabel}
                  </a>
                ) : (
                  <div className="mt-5 rounded-2xl bg-slate-100 px-5 py-4 text-center text-sm font-black text-slate-500">
                    {actionLabel}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {mapUrl ? (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50"
                    >
                      📍 Google Map
                    </a>
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-400">
                      {m.mapTbc}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => shareEvent(title, shortDescription)}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50"
                  >
                    {copiedShare ? m.linkCopied : `🔗 ${m.share}`}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={toggleFavorite}
                    className={[
                      "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-xs font-black ring-1",
                      isFavorite
                        ? "bg-rose-50 text-rose-700 ring-rose-100"
                        : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {isFavorite ? `❤️ ${m.saved}` : `♡ ${m.save}`}
                  </button>

                  {officialUrl ? (
                    <a
                      href={officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50"
                    >
                      {m.official}
                    </a>
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-400">
                      {m.officialTbc}
                    </span>
                  )}
                </div>

                <div className="mt-5 space-y-2">
                  <InfoPill label={m.organizer} value={merchantName} />
                  <InfoPill
                    label={m.eventImages}
                    value={`${images.length} ${locale === "en" && images.length === 1 ? "image" : m.imageUnit}`}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-purple-100 bg-purple-50 p-5">
                <p className="text-sm font-black text-purple-950">{m.nextSteps}</p>
                <ol className="mt-3 space-y-2 text-xs font-bold leading-6 text-purple-800">
                  <li>{m.step1}</li>
                  <li>{m.step2}</li>
                  <li>{m.step3}</li>
                  <li>{m.step4}</li>
                </ol>
              </div>

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-black text-amber-900">{m.parentNote}</p>
                <p className="mt-2 text-sm font-medium leading-7 text-amber-800">
                  {m.disclaimer}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-6">
          <SectionCard title={m.gallery} icon="🖼️">
            <div className="mb-4 rounded-2xl border border-purple-100 bg-purple-50 p-4">
              <p className="text-sm font-black text-purple-900">
                {m.galleryHint}
              </p>
              <p className="mt-1 text-xs font-bold leading-5 text-purple-700">
                {m.galleryDesc}
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-purple-50 via-white to-amber-50">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <ResilientEventImage
                    src={
                      selectedImage?.url === FALLBACK_IMAGE
                        ? null
                        : selectedImage?.url
                    }
                    alt={selectedImage?.label || title}
                    loading="lazy"
                    compactFallback
                    className="h-full w-full object-cover"
                    style={selectedImageStyle}
                  />

                  <div className="absolute left-4 top-4 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                    {selectedImage?.label || m.image}
                  </div>

                  <div className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-slate-700 shadow-sm backdrop-blur">
                    {safeSelectedImageIndex + 1}/{images.length}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                {images.map((image, index) => (
                  <div
                    key={`${image.url}-${index}`}
                    className={[
                      "rounded-2xl border bg-white p-2 shadow-sm transition",
                      safeSelectedImageIndex === index
                        ? "border-purple-500 ring-2 ring-purple-200"
                        : "border-slate-200",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className="group w-full overflow-hidden rounded-xl bg-white text-left"
                    >
                      <div className="aspect-[16/10] overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 via-white to-amber-50">
                        <ResilientEventImage
                          src={image.url === FALLBACK_IMAGE ? null : image.url}
                          alt={image.label}
                          loading="lazy"
                          compactFallback
                          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                          style={image.isCover ? coverStyle : undefined}
                        />
                      </div>

                      <div className="flex items-center justify-between px-1 py-2">
                        <span className="text-xs font-extrabold text-slate-700">
                          {image.label}
                        </span>
                        {image.isCover ? (
                          <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-black text-purple-700">
                            DB Cover
                          </span>
                        ) : null}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title={m.details} icon="✨">
            <div className="whitespace-pre-wrap text-sm font-medium leading-8 text-slate-700">
              {description}
            </div>
          </SectionCard>

          {safeText(event.highlights) ? (
            <SectionCard title={m.highlights} icon="⭐">
              <div className="whitespace-pre-wrap text-sm font-medium leading-8 text-slate-700">
                {safeText(event.highlights)}
              </div>
            </SectionCard>
          ) : null}

          {safeText(event.terms) ? (
            <SectionCard title={m.important} icon="⚠️">
              <div className="whitespace-pre-wrap text-sm font-medium leading-8 text-slate-700">
                {safeText(event.terms)}
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title={m.transport} icon="📍">
            <div className="grid gap-3 md:grid-cols-2">
              <InfoPill label={m.venue} value={venue} />
              <InfoPill label={m.district} value={district || m.districtTbc} />
              <InfoPill label={m.mtr} value={mtr || m.mtrTbc} />
              <InfoPill label={m.address} value={address || m.addressTbc} />
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-black text-slate-950">{m.gettingThere}</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                {venue}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {address || buildLocationText(event) || m.addressTbc}
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                  >
                    📍 {m.openMap}
                  </a>
                ) : (
                  <span className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-400">
                    {m.mapTbc}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() =>
                    copyTextToClipboard(addressCopyText, () => setCopiedAddress(true))
                  }
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  {copiedAddress ? m.addressCopied : m.copyAddress}
                </button>

                <button
                  type="button"
                  onClick={() => shareEvent(title, shortDescription)}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  {copiedShare ? m.linkCopied : m.shareEvent}
                </button>
              </div>
            </div>

            {mapEmbedUrl ? (
              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-xs font-black text-slate-500">
                    {m.mapPreview}
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-800">
                    {venue}
                  </p>
                </div>

                <iframe
                  title={`${title} Google Map`}
                  src={mapEmbedUrl}
                  className="h-[390px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="text-sm font-black text-slate-600">
                  {m.mapPreviewUnavailable}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  {m.mapCheck}
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard title="家長留意事項" icon="👨‍👩‍👧‍👦">
            <div className="grid gap-4">
              <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                <p className="text-xs font-black text-amber-700">家長提示</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-amber-900">
                  {safeText(
                    event.parent_note_tc,
                    "請出發前再次向主辦方確認活動日期、時間、名額、收費及報名安排。",
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
                <p className="text-xs font-black text-sky-700">安全提示</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-sky-900">
                  {safeText(
                    event.safety_note_tc,
                    "請按小朋友年齡、體力及現場人流情況評估是否適合參加。",
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-700">取消及退款政策</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700">
                  {safeText(
                    event.cancellation_policy_tc,
                    "請以主辦方公布的最新安排為準。",
                  )}
                </p>
              </div>
            </div>
          </SectionCard>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-black text-slate-950">快速資料</h3>

            <div className="mt-4 space-y-2">
              <InfoPill label="活動分類" value={getCategoryLabel(event, locale)} />
              <InfoPill label="日期" value={formatDateRange(event, locale)} />
              <InfoPill label="時間" value={formatTimeRange(event, locale)} />
              <InfoPill label="收費" value={formatPrice(event, locale)} />
              <InfoPill label="主辦單位" value={merchantName} />
            </div>
          </div>

          <div className="rounded-3xl border border-purple-100 bg-purple-50 p-5">
            <h3 className="text-sm font-black text-purple-950">分享提醒</h3>
            <p className="mt-3 text-xs font-bold leading-6 text-purple-800">
              活動資料可能會因天氣、人流、主辦方安排而變更。建議出發前先查看官方頁面或向主辦方確認。
            </p>
          </div>

          <Link
            href="/events"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            查看更多親子活動
          </Link>
        </aside>
      </div>
    </main>
  );
}