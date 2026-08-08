"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

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
  title_en?: string | null;
  short_description_tc?: string | null;
  description_tc?: string | null;
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

  venue_name?: string | null;
  venue_name_tc?: string | null;
  address?: string | null;
  address_tc?: string | null;
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
  activity_type?: string | null;
  activity_category?: string | null;
  category?: string | JsonValue | null;

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

type GalleryImage = {
  url: string;
  label: string;
  isCover: boolean;
};

type PriceFilter = "all" | "free" | "paid";
type DateFilter = "all" | "today" | "tomorrow" | "weekend" | "month";
type SortMode = "recommended" | "date_asc" | "date_desc" | "newest";

const FALLBACK_IMAGE =
  "https://placehold.co/1200x675/f5f3ff/7c3aed?text=HK+Family+Fun";

const dateFilters: { key: DateFilter; label: string }[] = [
  { key: "all", label: "全部日期" },
  { key: "today", label: "今日" },
  { key: "tomorrow", label: "明日" },
  { key: "weekend", label: "今個週末" },
  { key: "month", label: "本月" },
];

const priceFilters: { key: PriceFilter; label: string }[] = [
  { key: "all", label: "全部收費" },
  { key: "free", label: "免費" },
  { key: "paid", label: "收費" },
];

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

function getGalleryImages(event: EventRecord): GalleryImage[] {
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

  if (!ordered.length) {
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
    label: index === 0 ? "封面圖片" : `圖片 ${index}`,
    isCover: index === 0,
  }));
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

function hasRealImage(event: EventRecord): boolean {
  const images = getGalleryImages(event);
  return Boolean(images.length && images[0]?.url !== FALLBACK_IMAGE);
}

function formatDate(value?: string | null): string {
  if (!value) return "日期待定";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateRange(event: EventRecord): string {
  const start = formatDate(event.start_date);
  const end = formatDate(event.end_date);

  if (!event.start_date && !event.end_date) return "日期待定";
  if (!event.end_date || start === end) return start;

  return `${start} 至 ${end}`;
}

function formatTimeRange(event: EventRecord): string {
  const start = safeText(event.start_time);
  const end = safeText(event.end_time);

  if (!start && !end) return "時間待定";
  if (start && end) return `${start} - ${end}`;

  return start || end || "時間待定";
}

function formatPrice(event: EventRecord): string {
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

  if (priceMode === "hidden") return "不顯示價錢";
  if (priceMode === "free") return "免費";
  if (priceMode === "quota") return quotaLabel || "名額有限";

  if (priceMode === "early_bird") {
    if (offerPrice && originalPrice) {
      return `早鳥優惠 HK$${offerPrice}（原價 HK$${originalPrice}）`;
    }
    if (offerPrice) return `早鳥優惠 HK$${offerPrice}`;
    return "早鳥優惠待確認";
  }

  if (priceMode === "range") {
    if (minPrice && maxPrice && minPrice !== maxPrice) {
      return `HK$${minPrice}–HK$${maxPrice}`;
    }
    if (minPrice) return `HK$${minPrice} 起`;
    return "價錢範圍待確認";
  }

  if (priceMode === "fixed") {
    if (minPrice) return `HK$${minPrice}`;
    return "固定收費待確認";
  }

  if (priceMode === "from" || priceMode === "paid") {
    if (minPrice) return `HK$${minPrice} 起`;
    return "收費活動";
  }

  return "收費待確認";
}

function getCategoryLabel(event: EventRecord): string {
  const raw = safeText(
    event.activity_category ||
      event.category ||
      event.activity_type ||
      event.age_group,
    "親子活動",
  );

  const map: Record<string, string> = {
    kids: "親子活動",
    parent_child: "親子活動",
    workshop: "工作坊",
    market: "市集",
    exhibition: "展覽",
    sports: "運動",
    music: "音樂",
    theatre: "劇場",
    outdoor: "戶外活動",
    indoor: "室內活動",
    sen: "SEN 友善",
    free: "免費活動",
  };

  return map[raw] || raw;
}

function getPrimaryActionUrl(event: EventRecord): string | null {
  if (isHttpUrl(event.registration_url)) return String(event.registration_url).trim();
  if (isHttpUrl(event.booking_url)) return String(event.booking_url).trim();
  if (isHttpUrl(event.official_url)) return String(event.official_url).trim();
  if (isHttpUrl(event.source_url)) return String(event.source_url).trim();

  return null;
}

function getPrimaryActionLabel(event: EventRecord): string {
  const custom = safeText(event.cta_label || event.cta_text);
  if (custom) return custom;

  const ctaType = safeText(event.cta_type).toLowerCase();

  if (ctaType === "none") return "無需報名";
  if (ctaType === "contact") return "請向主辦查詢";
  if (ctaType === "whatsapp") return "WhatsApp 報名";
  if (ctaType === "google_form") return "Google Form 報名";
  if (isHttpUrl(event.registration_url) || isHttpUrl(event.booking_url)) {
    return "前往報名";
  }
  if (isHttpUrl(event.official_url) || isHttpUrl(event.source_url)) {
    return "查看官方活動頁";
  }
  if (event.registration_required) return "請向主辦查詢";

  return "無需報名";
}

function getGoogleMapUrl(event: EventRecord): string | null {
  if (isHttpUrl(event.google_map_url)) return String(event.google_map_url).trim();

  const query = [
    event.venue_name_tc || event.venue_name,
    event.address_tc || event.address,
    event.district,
    event.mtr_station,
    "香港",
  ]
    .map((item) => safeText(item))
    .filter(Boolean)
    .join(" ");

  if (!query) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function getTagArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => safeText(item)).filter(Boolean).slice(0, 5);
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
        .slice(0, 5);
    }
  }

  return [];
}

function normalizedStatus(event: EventRecord): string {
  return safeText(event.status || event.approval_status, "draft").toLowerCase();
}

function canShowPublic(event: EventRecord): boolean {
  const status = normalizedStatus(event);
  return ["published", "approved", "live"].includes(status);
}

function isFreeEvent(event: EventRecord): boolean {
  const priceMode = safeText(
    event.price_display_mode || event.price_type,
  ).toLowerCase();
  const priceText = formatPrice(event);

  return priceMode === "free" || priceText === "免費";
}

function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function eventOverlapsDate(event: EventRecord, target: Date): boolean {
  const start = parseDateOnly(event.start_date);
  const end = parseDateOnly(event.end_date) || start;

  if (!start || !end) return false;

  const targetTime = target.getTime();
  return start.getTime() <= targetTime && targetTime <= end.getTime();
}

function isWeekendDate(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function eventMatchesDateFilter(event: EventRecord, filter: DateFilter): boolean {
  if (filter === "all") return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (filter === "today") return eventOverlapsDate(event, today);
  if (filter === "tomorrow") return eventOverlapsDate(event, tomorrow);

  if (filter === "month") {
    const start = parseDateOnly(event.start_date);
    if (!start) return false;

    return (
      start.getFullYear() === today.getFullYear() &&
      start.getMonth() === today.getMonth()
    );
  }

  if (filter === "weekend") {
    const start = parseDateOnly(event.start_date);
    const end = parseDateOnly(event.end_date) || start;

    if (!start || !end) return false;

    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);

    const final = new Date(end);
    final.setHours(0, 0, 0, 0);

    while (cursor.getTime() <= final.getTime()) {
      if (isWeekendDate(cursor)) return true;
      cursor.setDate(cursor.getDate() + 1);
    }

    return false;
  }

  return true;
}

function getDistrictOptions(events: EventRecord[]): string[] {
  return Array.from(
    new Set(
      events
        .map((event) => safeText(event.district || event.area))
        .filter(Boolean),
    ),
  ).sort();
}

function getCategoryOptions(events: EventRecord[]): string[] {
  return Array.from(
    new Set(events.map((event) => getCategoryLabel(event)).filter(Boolean)),
  ).sort();
}

function scoreEvent(event: EventRecord): number {
  let score = 0;

  if (hasRealImage(event)) score += 30;
  if (event.start_date) score += 20;
  if (getPrimaryActionUrl(event)) score += 15;
  if (safeText(event.short_description_tc || event.description_tc)) score += 15;
  if (event.google_map_url || event.google_map_embed_url) score += 10;
  if (isFreeEvent(event)) score += 5;
  if (safeText(event.published_at || event.updated_at)) score += 5;

  return score;
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
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function QuickEntry({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-purple-50 text-xl">
          {icon}
        </span>
        <div>
          <p className="font-black text-slate-950">{title}</p>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
            {desc}
          </p>
        </div>
      </div>
    </Link>
  );
}

function StatCard({
  label,
  value,
  note,
  tone = "slate",
}: {
  label: string;
  value: number | string;
  note: string;
  tone?: "slate" | "green" | "purple" | "amber";
}) {
  const className =
    tone === "green"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
      : tone === "purple"
        ? "bg-purple-50 text-purple-950 ring-purple-100"
        : tone === "amber"
          ? "bg-amber-50 text-amber-900 ring-amber-100"
          : "bg-white text-slate-950 ring-slate-200";

  return (
    <div className={`rounded-3xl p-5 shadow-sm ring-1 ${className}`}>
      <p className="text-xs font-black opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold leading-5 opacity-70">{note}</p>
    </div>
  );
}

function EventCard({ event }: { event: EventRecord }) {
  const [shareCopied, setShareCopied] = useState(false);

  const images = getGalleryImages(event);
  const hero = images[0]?.url || FALLBACK_IMAGE;
  const isFallback = hero === FALLBACK_IMAGE;

  const coverStyle: CSSProperties = isFallback
    ? {}
    : {
        ...getCoverTransform(event),
        ...getCoverFilter(event),
      };

  const title = safeText(event.title_tc || event.title, "未命名活動");
  const shortDescription = safeText(
    event.short_description_tc,
    safeText(event.description_tc, "活動詳情請參閱主辦方公布資料。"),
  );
  const venue = safeText(
    event.venue_name_tc || event.venue_name,
    safeText(event.address_tc || event.address, safeText(event.district, "地點待定")),
  );
  const district = safeText(event.district || event.area);
  const mtr = safeText(event.mtr_station);
  const price = formatPrice(event);
  const category = getCategoryLabel(event);
  const tags = getTagArray(event.tags);
  const ctaLabel = getPrimaryActionLabel(event);
  const actionUrl = getPrimaryActionUrl(event);
  const mapUrl = getGoogleMapUrl(event);
  const imageCount = images.filter((image) => image.url !== FALLBACK_IMAGE).length;

  async function shareEvent() {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/events/${event.id}`
        : `/events/${event.id}`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title,
          text: shortDescription,
          url: shareUrl,
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 1800);
      }
    } catch {
      setShareCopied(false);
    }
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-lg">
      <Link href={`/events/${event.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-purple-50 via-white to-amber-50">
          {isFallback ? (
            <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-purple-700 text-2xl font-black text-white shadow-sm">
                親
              </div>
              <p className="mt-3 text-sm font-black text-purple-900">
                HK Family Fun
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                活動圖片準備中
              </p>
            </div>
          ) : (
            <img
              src={hero}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              style={coverStyle}
            />
          )}

          <div className="absolute left-3 top-3 flex max-w-[88%] flex-wrap gap-2">
            <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-black text-purple-700 shadow-sm backdrop-blur">
              {category}
            </span>
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-black shadow-sm backdrop-blur",
                isFreeEvent(event)
                  ? "bg-emerald-100/95 text-emerald-700"
                  : "bg-amber-100/95 text-amber-700",
              ].join(" ")}
            >
              {price}
            </span>
          </div>

          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
            {district ? (
              <span className="rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                📍 {district}
              </span>
            ) : null}

            <span className="rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">
              🖼️ {Math.max(imageCount, 1)} 張圖片
            </span>
          </div>

          <div className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-slate-700 shadow-sm backdrop-blur">
            ♡
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-2">
          <Badge tone="purple">{category}</Badge>
          <Badge tone={isFreeEvent(event) ? "green" : "orange"}>{price}</Badge>
          {mtr ? <Badge tone="slate">{mtr}</Badge> : null}
        </div>

        <Link href={`/events/${event.id}`} className="mt-4 block">
          <h2 className="line-clamp-2 min-h-[3.6rem] text-xl font-black leading-tight text-slate-950 group-hover:text-purple-800">
            {title}
          </h2>
        </Link>

        <p className="mt-3 line-clamp-2 min-h-[3rem] text-sm font-medium leading-6 text-slate-600">
          {shortDescription}
        </p>

        <div className="mt-4 grid gap-2 text-sm">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
            <p className="text-xs font-black text-slate-400">日期</p>
            <p className="mt-1 line-clamp-1 font-extrabold text-slate-800">
              {formatDateRange(event)}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">時間</p>
              <p className="mt-1 line-clamp-1 font-extrabold text-slate-800">
                {formatTimeRange(event)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-slate-400">地區</p>
              <p className="mt-1 line-clamp-1 font-extrabold text-slate-800">
                {district || "地區待定"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
            <p className="text-xs font-black text-slate-400">場地</p>
            <p className="mt-1 line-clamp-1 font-extrabold text-slate-800">
              {venue}
            </p>
          </div>
        </div>

        {tags.length > 0 ? (
          <div className="mt-4 flex min-h-[2rem] flex-wrap gap-2">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-4 min-h-[2rem]" />
        )}

        <div className="mt-auto pt-5">
          <div className="grid gap-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href={`/events/${event.id}`}
                className="inline-flex items-center justify-center rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800"
              >
                查看詳情
              </Link>

              {actionUrl ? (
                <a
                  href={actionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
                >
                  {ctaLabel}
                </a>
              ) : (
                <span className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-600 ring-1 ring-slate-200">
                  {ctaLabel}
                </span>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
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
                  📍 地圖待定
                </span>
              )}

              <button
                type="button"
                onClick={shareEvent}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50"
              >
                {shareCopied ? "已複製連結" : "🔗 分享"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function PublicEventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [keyword, setKeyword] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("recommended");

  async function loadEvents() {
    const client = supabase;

    setLoading(true);
    setErrorText("");

    if (!client) {
      setErrorText("網站暫時未能連接資料庫，請稍後再試。");
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data, error } = await client
      .from("events")
      .select("*")
      .order("start_date", { ascending: true });

    if (error) {
      setErrorText(error.message || "讀取活動資料失敗。");
      setEvents([]);
      setLoading(false);
      return;
    }

    setEvents(((data || []) as EventRecord[]).filter(canShowPublic));
    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const districtOptions = useMemo(() => getDistrictOptions(events), [events]);
  const categoryOptions = useMemo(() => getCategoryOptions(events), [events]);

  const filteredEvents = useMemo(() => {
    const text = keyword.trim().toLowerCase();

    let next = [...events];

    if (text) {
      next = next.filter((event) => {
        const haystack = [
          event.title_tc,
          event.title,
          event.short_description_tc,
          event.description_tc,
          event.merchant_name,
          event.organizer_name,
          event.venue_name_tc,
          event.venue_name,
          event.address_tc,
          event.address,
          event.district,
          event.area,
          event.mtr_station,
          event.activity_category,
          event.category,
          event.activity_type,
          event.tags,
        ]
          .map((item) => safeText(item))
          .join(" ")
          .toLowerCase();

        return haystack.includes(text);
      });
    }

    if (dateFilter !== "all") {
      next = next.filter((event) => eventMatchesDateFilter(event, dateFilter));
    }

    if (priceFilter === "free") {
      next = next.filter(isFreeEvent);
    }

    if (priceFilter === "paid") {
      next = next.filter((event) => !isFreeEvent(event));
    }

    if (districtFilter !== "all") {
      next = next.filter(
        (event) => safeText(event.district || event.area) === districtFilter,
      );
    }

    if (categoryFilter !== "all") {
      next = next.filter((event) => getCategoryLabel(event) === categoryFilter);
    }

    if (sortMode === "recommended") {
      next.sort((a, b) => {
        const scoreDiff = scoreEvent(b) - scoreEvent(a);
        if (scoreDiff !== 0) return scoreDiff;

        const aDate = parseDateOnly(a.start_date)?.getTime() || Number.MAX_SAFE_INTEGER;
        const bDate = parseDateOnly(b.start_date)?.getTime() || Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      });
    }

    if (sortMode === "date_asc") {
      next.sort((a, b) => {
        const aTime = parseDateOnly(a.start_date)?.getTime() || Number.MAX_SAFE_INTEGER;
        const bTime = parseDateOnly(b.start_date)?.getTime() || Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
    }

    if (sortMode === "date_desc") {
      next.sort((a, b) => {
        const aTime = parseDateOnly(a.start_date)?.getTime() || 0;
        const bTime = parseDateOnly(b.start_date)?.getTime() || 0;
        return bTime - aTime;
      });
    }

    if (sortMode === "newest") {
      next.sort((a, b) => {
        const aTime = new Date(a.published_at || a.updated_at || a.created_at || 0).getTime();
        const bTime = new Date(b.published_at || b.updated_at || b.created_at || 0).getTime();
        return bTime - aTime;
      });
    }

    return next;
  }, [
    events,
    keyword,
    dateFilter,
    priceFilter,
    districtFilter,
    categoryFilter,
    sortMode,
  ]);

  const todayCount = useMemo(
    () => events.filter((event) => eventMatchesDateFilter(event, "today")).length,
    [events],
  );

  const freeCount = useMemo(() => events.filter(isFreeEvent).length, [events]);

  const imageReadyCount = useMemo(
    () => events.filter(hasRealImage).length,
    [events],
  );

  function clearFilters() {
    setKeyword("");
    setDateFilter("all");
    setPriceFilter("all");
    setDistrictFilter("all");
    setCategoryFilter("all");
    setSortMode("recommended");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="purple">香港親子活動</Badge>
                <Badge tone="green">{events.length} 個公開活動</Badge>
                <Badge tone="amber">今日 {todayCount} 個</Badge>
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 lg:text-5xl">
                搜尋香港親子活動
              </h1>

              <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-slate-600">
                一站式搜尋香港親子市集、工作坊、展覽、商場活動、免費活動及家庭好去處。
                活動卡已同步商戶圖片排序及封面裁切設定。
              </p>
            </div>

            <div className="grid gap-3">
              <QuickEntry
                href="/today"
                icon="☀️"
                title="今日活動"
                desc="快速查看今日適合帶小朋友去的活動。"
              />
              <QuickEntry
                href="/calendar"
                icon="🗓️"
                title="活動日曆"
                desc="按日期及時間瀏覽活動。"
              />
              <QuickEntry
                href="/events/map"
                icon="🗺️"
                title="附近活動地圖"
                desc="按地點搜尋附近親子活動。"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="公開活動"
            value={events.length}
            note="只顯示已發布或已批准活動"
            tone="slate"
          />
          <StatCard
            label="免費活動"
            value={freeCount}
            note="適合想控制預算的家庭"
            tone="green"
          />
          <StatCard
            label="圖片完成"
            value={imageReadyCount}
            note="已有活動封面或 Gallery"
            tone="purple"
          />
        </div>

        <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
            <input
              value={keyword}
              onChange={(changeEvent) => setKeyword(changeEvent.target.value)}
              placeholder="搜尋活動名稱、商戶、地點、分類、港鐵站..."
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />

            <select
              value={sortMode}
              onChange={(changeEvent) => setSortMode(changeEvent.target.value as SortMode)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            >
              <option value="recommended">推薦排序</option>
              <option value="date_asc">活動日期近至遠</option>
              <option value="date_desc">活動日期遠至近</option>
              <option value="newest">最新發布</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {dateFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setDateFilter(filter.key)}
                className={[
                  "rounded-full px-4 py-2 text-sm font-black transition",
                  dateFilter === filter.key
                    ? "bg-purple-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                ].join(" ")}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <select
              value={priceFilter}
              onChange={(changeEvent) =>
                setPriceFilter(changeEvent.target.value as PriceFilter)
              }
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            >
              {priceFilters.map((filter) => (
                <option key={filter.key} value={filter.key}>
                  {filter.label}
                </option>
              ))}
            </select>

            <select
              value={districtFilter}
              onChange={(changeEvent) => setDistrictFilter(changeEvent.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            >
              <option value="all">全部地區</option>
              {districtOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(changeEvent) => setCategoryFilter(changeEvent.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            >
              <option value="all">全部分類</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-500">
              顯示 {filteredEvents.length} / {events.length} 個公開活動
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              清除篩選
            </button>
          </div>
        </div>

        {errorText ? (
          <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-800">
            {errorText}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-50 text-2xl">
              親
            </div>
            <p className="text-sm font-black text-slate-700">正在讀取活動資料...</p>
          </div>
        ) : null}

        {!loading && filteredEvents.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-xl font-black text-slate-950">
              暫時沒有符合條件的活動
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              請更改日期、地區、分類或關鍵字再試。
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800"
            >
              清除全部篩選
            </button>
          </div>
        ) : null}

        {!loading && filteredEvents.length > 0 ? (
          <div className="mt-6 grid items-stretch gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}