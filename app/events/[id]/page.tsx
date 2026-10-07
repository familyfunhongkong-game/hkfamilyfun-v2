"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Baby,
  Building2,
  CalendarDays,
  Clock3,
  ExternalLink,
  Heart,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
  Sparkles,
  Ticket,
  TrainFront,
} from "lucide-react";
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
  highlights_sc?: string | null;
  highlights_en?: string | null;
  terms?: string | null;
  terms_sc?: string | null;
  terms_en?: string | null;
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
  parent_note_sc?: string | null;
  parent_note_en?: string | null;
  safety_note_tc?: string | null;
  safety_note_sc?: string | null;
  safety_note_en?: string | null;
  cancellation_policy_tc?: string | null;
  cancellation_policy_sc?: string | null;
  cancellation_policy_en?: string | null;

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

function formatAgeRange(event: EventRecord, locale: AppLocale): string {
  const custom = safeText(event.age_group);
  if (custom) return custom;

  const min = Number(event.age_min);
  const max = Number(event.age_max);
  const hasMin =
    event.age_min !== null &&
    event.age_min !== undefined &&
    Number.isFinite(min);
  const hasMax =
    event.age_max !== null &&
    event.age_max !== undefined &&
    Number.isFinite(max);

  if (hasMin && hasMax) {
    return locale === "en" ? `Ages ${min}–${max}` : `${min}–${max}歲`;
  }
  if (hasMin) {
    return locale === "en" ? `Ages ${min}+` : `${min}歲以上`;
  }
  if (hasMax) {
    return locale === "en" ? `Up to age ${max}` : `${max}歲或以下`;
  }

  return uiText(locale, "適合年齡待定", "适合年龄待定", "Age TBC");
}

function getPhoneUrl(value: unknown): string | null {
  const phone = safeText(value);
  if (!phone) return null;
  const normalized = phone.replace(/[^+\d]/g, "");
  return normalized ? `tel:${normalized}` : null;
}

function getEmailUrl(value: unknown): string | null {
  const email = safeText(value);
  return email && email.includes("@") ? `mailto:${email}` : null;
}

function getWhatsAppUrl(value: unknown): string | null {
  const phone = safeText(value).replace(/\D/g, "");
  if (!phone) return null;
  const withCountryCode = phone.length === 8 ? `852${phone}` : phone;
  return `https://wa.me/${withCountryCode}`;
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

function InfoPill({
  label,
  value,
  icon,
  muted = false,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      {icon ? (
        <span
          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            muted ? "bg-slate-100 text-slate-400" : "bg-purple-50 text-purple-700"
          }`}
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.06em] text-slate-400">
          {label}
        </p>
        <p
          className={`mt-1 line-clamp-2 text-sm font-extrabold ${
            muted ? "text-slate-400" : "text-slate-800"
          }`}
        >
          {value}
        </p>
      </div>
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
  const highlights = localizedText(locale, {
    tc: event.highlights,
    sc: event.highlights_sc,
    en: event.highlights_en,
  });
  const terms = localizedText(locale, {
    tc: event.terms,
    sc: event.terms_sc,
    en: event.terms_en,
  });
  const parentNote = localizedText(locale, {
    tc: event.parent_note_tc,
    sc: event.parent_note_sc,
    en: event.parent_note_en,
    fallback: uiText(
      locale,
      "請出發前再次向主辦方確認活動日期、時間、名額、收費及報名安排。",
      "请出发前再次向主办方确认活动日期、时间、名额、收费及报名安排。",
      "Before visiting, reconfirm the event date, time, availability, fees and registration arrangements with the organizer.",
    ),
  });
  const safetyNote = localizedText(locale, {
    tc: event.safety_note_tc,
    sc: event.safety_note_sc,
    en: event.safety_note_en,
    fallback: uiText(
      locale,
      "請按小朋友年齡、體力及現場人流情況評估是否適合參加。",
      "请按小朋友年龄、体力及现场人流情况评估是否适合参加。",
      "Consider your child’s age, stamina and crowd conditions when deciding whether the activity is suitable.",
    ),
  });
  const cancellationPolicy = localizedText(locale, {
    tc: event.cancellation_policy_tc,
    sc: event.cancellation_policy_sc,
    en: event.cancellation_policy_en,
    fallback: uiText(
      locale,
      "請以主辦方公布的最新安排為準。",
      "请以主办方公布的最新安排为准。",
      "Refer to the organizer’s latest published arrangements.",
    ),
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
  const categoryLabel = getCategoryLabel(event, locale);
  const priceDisplay = formatPrice(event, locale);
  const ageDisplay = formatAgeRange(event, locale);
  const dateDisplay = formatDateRange(event, locale);
  const timeDisplay = formatTimeRange(event, locale);
  const isSenFriendly = Boolean(event.is_sen_friendly);
  const isIndoor = Boolean(event.is_indoor);

  const merchantName = safeText(
    event.organizer_name || event.merchant_name,
    uiText(locale, "主辦方待定", "主办方待定", "Organizer TBC"),
  );

  const registrationUrl = getRegistrationUrl(event);
  const officialUrl = getOfficialWebsiteUrl(event);
  const actionUrl = getPrimaryActionUrl(event);
  const actionLabel = getPrimaryActionLabel(event, locale);
  const phoneUrl = getPhoneUrl(event.organizer_phone || event.contact_phone);
  const emailUrl = getEmailUrl(event.organizer_email || event.contact_email);
  const whatsappUrl = getWhatsAppUrl(event.whatsapp);
  const hasOrganizerContact = Boolean(phoneUrl || emailUrl || whatsappUrl);

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
    <main className="min-h-screen bg-slate-50 pb-28 lg:pb-0">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-2 text-sm font-black text-purple-700 transition hover:bg-purple-100 hover:text-purple-900"
            >
              ← {m.back}
            </Link>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <Sparkles size={14} />
              <span>{uiText(locale, "HK Family Fun 活動資料", "HK Family Fun 活动资料", "HK Family Fun event guide")}</span>
            </div>
          </div>

          <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-purple-50 via-white to-amber-50 sm:aspect-[16/9]">
                <ResilientEventImage
                  src={
                    selectedImage?.url === FALLBACK_IMAGE
                      ? null
                      : selectedImage?.url
                  }
                  alt={selectedImage?.label || title}
                  loading="eager"
                  fetchPriority="high"
                  compactFallback
                  className="h-full w-full object-cover"
                  style={selectedImageStyle}
                />

                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/55 to-transparent" />

                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <Badge tone="purple">{categoryLabel}</Badge>
                  {isSenFriendly ? (
                    <span className="rounded-full bg-fuchsia-100/95 px-3 py-1 text-xs font-black text-fuchsia-800 shadow-sm backdrop-blur">
                      SEN 友善
                    </span>
                  ) : null}
                  {isIndoor ? (
                    <span className="rounded-full bg-sky-100/95 px-3 py-1 text-xs font-black text-sky-800 shadow-sm backdrop-blur">
                      {uiText(locale, "室內", "室内", "Indoor")}
                    </span>
                  ) : null}
                </div>

                <div className="absolute right-4 top-4 flex gap-2">
                  <button
                    type="button"
                    onClick={toggleFavorite}
                    aria-pressed={isFavorite}
                    aria-label={isFavorite ? m.saved : m.save}
                    className={[
                      "grid h-11 w-11 place-items-center rounded-full shadow-md backdrop-blur transition",
                      isFavorite
                        ? "bg-rose-500 text-white"
                        : "bg-white/95 text-slate-700 hover:bg-rose-50 hover:text-rose-600",
                    ].join(" ")}
                  >
                    <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    onClick={() => shareEvent(title, shortDescription)}
                    aria-label={m.share}
                    className="grid h-11 w-11 place-items-center rounded-full bg-white/95 text-slate-700 shadow-md backdrop-blur transition hover:bg-purple-50 hover:text-purple-700"
                  >
                    <Share2 size={18} />
                  </button>
                </div>

                <div className="absolute bottom-4 left-4 rounded-full bg-amber-100/95 px-4 py-2 text-sm font-black text-amber-950 shadow-sm backdrop-blur">
                  {priceDisplay}
                </div>
                <div className="absolute bottom-4 right-4 rounded-full bg-slate-950/75 px-3 py-1.5 text-xs font-black text-white backdrop-blur">
                  {safeSelectedImageIndex + 1}/{images.length}
                </div>
              </div>

              {images.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto border-t border-slate-100 bg-white p-3">
                  {images.map((image, index) => (
                    <button
                      key={`${image.url}-hero-${index}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      aria-label={`${m.image} ${index + 1}`}
                      className={[
                        "relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-50 transition",
                        safeSelectedImageIndex === index
                          ? "border-purple-600 ring-2 ring-purple-100"
                          : "border-white hover:border-purple-200",
                      ].join(" ")}
                    >
                      <ResilientEventImage
                        src={image.url === FALLBACK_IMAGE ? null : image.url}
                        alt={image.label}
                        loading="lazy"
                        compactFallback
                        className="h-full w-full object-cover"
                        style={image.isCover ? coverStyle : undefined}
                      />
                      {image.isCover ? (
                        <span className="absolute bottom-1 left-1 rounded-full bg-slate-950/75 px-2 py-0.5 text-[9px] font-black text-white">
                          {uiText(locale, "封面", "封面", "Cover")}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-5">
              <div className="flex flex-wrap gap-2">
                <Badge tone="purple">{categoryLabel}</Badge>
                {isSenFriendly ? <Badge tone="rose">SEN 友善</Badge> : null}
                {isIndoor ? (
                  <Badge tone="slate">{uiText(locale, "室內", "室内", "Indoor")}</Badge>
                ) : null}
              </div>

              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 lg:text-[2.15rem]">
                {title}
              </h1>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                {shortDescription}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <InfoPill
                  label={m.date}
                  value={dateDisplay}
                  icon={<CalendarDays size={17} />}
                />
                <InfoPill
                  label={m.time}
                  value={timeDisplay}
                  icon={<Clock3 size={17} />}
                />
                <InfoPill
                  label={uiText(locale, "適合年齡", "适合年龄", "Age")}
                  value={ageDisplay}
                  icon={<Baby size={17} />}
                />
                <InfoPill
                  label={m.location}
                  value={venue}
                  icon={<MapPin size={17} />}
                />
                <InfoPill
                  label={uiText(locale, "港鐵", "港铁", "MTR")}
                  value={mtr || m.mtrTbc}
                  icon={<TrainFront size={17} />}
                  muted={!mtr}
                />
                <InfoPill
                  label={m.organizer}
                  value={merchantName}
                  icon={<Building2 size={17} />}
                />
              </div>

              <div className="mt-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 ring-1 ring-amber-100">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-amber-700 shadow-sm">
                    <Ticket size={18} />
                  </span>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-600">
                      {m.price}
                    </p>
                    <p className="mt-1 text-xl font-black text-amber-950">{priceDisplay}</p>
                    {safeText(event.price_note) ? (
                      <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
                        {safeText(event.price_note)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {actionUrl ? (
                <a
                  href={actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-700 px-5 py-4 text-sm font-black text-white shadow-sm transition hover:bg-purple-800"
                >
                  {actionLabel}
                  <ExternalLink size={16} />
                </a>
              ) : (
                <div className="mt-4 rounded-2xl bg-slate-100 px-5 py-4 text-center text-sm font-black text-slate-500">
                  {actionLabel}
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                {mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:border-purple-300 hover:text-purple-700"
                  >
                    <Navigation size={15} />
                    Google Map
                  </a>
                ) : (
                  <span className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-xs font-black text-slate-400">
                    {m.mapTbc}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => shareEvent(title, shortDescription)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:border-purple-300 hover:text-purple-700"
                >
                  <Share2 size={15} />
                  {copiedShare ? m.linkCopied : m.share}
                </button>
              </div>

              {hasOrganizerContact ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                    {uiText(locale, "聯絡主辦方", "联络主办方", "Contact organizer")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100"
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    ) : null}
                    {phoneUrl ? (
                      <a
                        href={phoneUrl}
                        className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 ring-1 ring-sky-100"
                      >
                        <Phone size={14} />
                        {uiText(locale, "電話", "电话", "Call")}
                      </a>
                    ) : null}
                    {emailUrl ? (
                      <a
                        href={emailUrl}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200"
                      >
                        <Mail size={14} /> Email
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {officialUrl && officialUrl !== actionUrl ? (
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-slate-500 transition hover:text-purple-700"
                >
                  {m.official}
                  <ExternalLink size={13} />
                </a>
              ) : null}
            </aside>
          </div>

          {tags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 ring-1 ring-purple-100"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-6">
          <SectionCard title={m.details} icon="✨">
            <div className="whitespace-pre-wrap text-sm font-medium leading-8 text-slate-700">
              {description}
            </div>
          </SectionCard>

          {highlights ? (
            <SectionCard title={m.highlights} icon="⭐">
              <div className="whitespace-pre-wrap text-sm font-medium leading-8 text-slate-700">
                {highlights}
              </div>
            </SectionCard>
          ) : null}

          {terms ? (
            <SectionCard title={m.important} icon="⚠️">
              <div className="whitespace-pre-wrap text-sm font-medium leading-8 text-slate-700">
                {terms}
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
                    rel="noopener noreferrer"
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

          <SectionCard title={m.parentInfo} icon="👨‍👩‍👧‍👦">
            <div className="grid gap-4">
              <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                <p className="text-xs font-black text-amber-700">{m.parentNote}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-amber-900">
                  {parentNote}
                </p>
              </div>

              <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
                <p className="text-xs font-black text-sky-700">{m.safety}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-sky-900">
                  {safetyNote}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-700">{m.cancellation}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700">
                  {cancellationPolicy}
                </p>
              </div>
            </div>
          </SectionCard>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-700">
                <Sparkles size={17} />
              </span>
              <h3 className="text-sm font-black text-slate-950">{m.quickFacts}</h3>
            </div>

            <div className="mt-4 space-y-2">
              <InfoPill
                label={m.category}
                value={categoryLabel}
                icon={<Sparkles size={16} />}
              />
              <InfoPill
                label={m.date}
                value={dateDisplay}
                icon={<CalendarDays size={16} />}
              />
              <InfoPill
                label={m.time}
                value={timeDisplay}
                icon={<Clock3 size={16} />}
              />
              <InfoPill
                label={m.price}
                value={priceDisplay}
                icon={<Ticket size={16} />}
              />
              <InfoPill
                label={uiText(locale, "適合年齡", "适合年龄", "Age")}
                value={ageDisplay}
                icon={<Baby size={16} />}
              />
              <InfoPill
                label={m.mtr}
                value={mtr || m.mtrTbc}
                icon={<TrainFront size={16} />}
                muted={!mtr}
              />
              <InfoPill
                label={m.organizer}
                value={merchantName}
                icon={<Building2 size={16} />}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {isSenFriendly ? <Badge tone="rose">SEN 友善</Badge> : null}
              {isIndoor ? (
                <Badge tone="slate">{uiText(locale, "室內", "室内", "Indoor")}</Badge>
              ) : null}
              <Badge tone="amber">{priceDisplay}</Badge>
            </div>

            {actionUrl ? (
              <a
                href={actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-700 px-5 py-4 text-sm font-black text-white transition hover:bg-purple-800"
              >
                {actionLabel}
                <ExternalLink size={15} />
              </a>
            ) : null}
          </div>

          <div className="rounded-3xl border border-purple-100 bg-purple-50 p-5">
            <h3 className="text-sm font-black text-purple-950">{m.shareReminder}</h3>
            <p className="mt-3 text-xs font-bold leading-6 text-purple-800">
              {m.shareReminderDesc}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => shareEvent(title, shortDescription)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-black text-purple-700 ring-1 ring-purple-100"
              >
                <Share2 size={14} />
                {copiedShare ? m.linkCopied : m.share}
              </button>
              <button
                type="button"
                onClick={toggleFavorite}
                aria-pressed={isFavorite}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-black text-rose-700 ring-1 ring-purple-100"
              >
                <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
                {isFavorite ? m.saved : m.save}
              </button>
            </div>
          </div>

          <Link
            href="/events"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-black text-slate-700 transition hover:border-purple-300 hover:text-purple-700"
          >
            {m.exploreMore}
          </Link>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <button
            type="button"
            onClick={toggleFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? m.saved : m.save}
            className={[
              "grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 transition",
              isFavorite
                ? "bg-rose-50 text-rose-700 ring-rose-100"
                : "bg-white text-slate-700 ring-slate-300",
            ].join(" ")}
          >
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>

          <button
            type="button"
            onClick={() => shareEvent(title, shortDescription)}
            aria-label={m.share}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-300"
          >
            <Share2 size={18} />
          </button>

          {actionUrl ? (
            <a
              href={actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-purple-700 px-4 py-3.5 text-sm font-black text-white shadow-sm"
            >
              <span className="truncate">{actionLabel}</span>
              <ExternalLink size={15} className="shrink-0" />
            </a>
          ) : mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white"
            >
              <Navigation size={15} />
              <span className="truncate">Google Map</span>
            </a>
          ) : (
            <Link
              href="/events"
              className="inline-flex min-w-0 flex-1 items-center justify-center rounded-2xl bg-purple-700 px-4 py-3.5 text-sm font-black text-white"
            >
              {m.exploreMore}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}