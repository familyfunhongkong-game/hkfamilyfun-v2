"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

  title_tc?: string | null;
  title_en?: string | null;
  short_description_tc?: string | null;
  description_tc?: string | null;

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

  venue_name_tc?: string | null;
  venue_name_en?: string | null;
  address_tc?: string | null;
  address_en?: string | null;
  area?: string | null;
  district?: string | null;
  mtr_station?: string | null;

  price_type?: string | null;
  price_text?: string | null;
  price_note?: string | null;
  min_price?: number | string | null;

  age_group?: string | null;
  activity_type?: string | null;
  category?: string | null;
  tags?: string[] | JsonValue | null;

  registration_required?: boolean | null;
  registration_url?: string | null;
  source_url?: string | null;
  booking_method?: string | null;
  cta_text?: string | null;

  google_map_url?: string | null;
  google_map_embed_url?: string | null;

  parent_note_tc?: string | null;
  safety_note_tc?: string | null;
  cancellation_policy_tc?: string | null;

  source_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type GalleryImage = {
  url: string;
  label: string;
  isCover: boolean;
};

type CompletenessItem = {
  label: string;
  done: boolean;
};

const FALLBACK_IMAGE =
  "https://placehold.co/1200x675/f5f3ff/7c3aed?text=HK+Family+Fun";

function safeText(value: unknown, fallback = "未填寫"): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed);
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
      .filter((item) => isValidUrl(item));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return [];

    if (isValidUrl(trimmed)) return [trimmed];

    try {
      const parsed = JSON.parse(trimmed);
      return normalizeImageArray(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

function uniqueImages(input: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of input) {
    const url = raw.trim();
    if (!isValidUrl(url)) continue;

    const key = url.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    output.push(url);
  }

  return output;
}

function getGalleryImages(event: EventRecord): GalleryImage[] {
  const cover = isValidUrl(event.cover_image_url)
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
        label: "預設圖片",
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
  const start = safeText(event.start_time, "");
  const end = safeText(event.end_time, "");

  if (!start && !end) return "時間待定";
  if (start && end) return `${start} - ${end}`;
  return start || end || "時間待定";
}

function formatPrice(event: EventRecord): string {
  const priceType = safeText(event.price_type, "").toLowerCase();
  const priceText = safeText(event.price_text, "");
  const minPrice = toNumber(event.min_price, NaN);

  if (priceText) return priceText;

  if (priceType === "free") return "免費";
  if (priceType === "paid" && Number.isFinite(minPrice)) {
    return `HK$${minPrice} 起`;
  }
  if (priceType === "paid") return "收費活動";
  if (priceType === "early_bird") return "早鳥 / 優惠價";
  if (priceType === "contact") return "請向主辦查詢";
  return "收費待確認";
}

function getStatusLabel(status?: string | null): string {
  switch (status) {
    case "draft":
      return "草稿";
    case "submitted":
      return "審批中";
    case "approved":
      return "已批准";
    case "published":
      return "已發布";
    case "rejected":
      return "已拒絕";
    case "archived":
      return "已封存";
    default:
      return "未確認";
  }
}

function getCategoryLabel(event: EventRecord): string {
  const raw =
    safeText(event.category, "") ||
    safeText(event.activity_type, "") ||
    safeText(event.age_group, "");

  if (!raw) return "親子活動";

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

function getTagArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .slice(0, 6);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return getTagArray(parsed);
    } catch {
      return value
        .split(/[,\n，、]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 6);
    }
  }

  return [];
}

function getPrimaryActionUrl(event: EventRecord): string | null {
  if (isValidUrl(event.registration_url)) return event.registration_url.trim();
  if (isValidUrl(event.source_url)) return event.source_url.trim();
  return null;
}

function getPrimaryActionLabel(event: EventRecord): string {
  const custom = safeText(event.cta_text, "");
  if (custom) return custom;

  if (isValidUrl(event.registration_url)) return "前往報名";
  if (isValidUrl(event.source_url)) return "查看官方活動頁";
  if (event.registration_required) return "請向主辦查詢";
  return "無需報名";
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

function getCompleteness(event: EventRecord, images: GalleryImage[]): CompletenessItem[] {
  return [
    {
      label: "活動名稱",
      done: Boolean(safeText(event.title_tc, "")),
    },
    {
      label: "日期",
      done: Boolean(event.start_date),
    },
    {
      label: "時間",
      done: Boolean(event.start_time || event.end_time),
    },
    {
      label: "地點",
      done: Boolean(event.venue_name_tc || event.address_tc || event.district),
    },
    {
      label: "收費",
      done: Boolean(event.price_text || event.price_type || event.min_price),
    },
    {
      label: "CTA",
      done: Boolean(
        event.registration_url ||
          event.source_url ||
          event.booking_method ||
          event.registration_required === false,
      ),
    },
    {
      label: "圖片",
      done: images.length > 0 && images[0].url !== FALLBACK_IMAGE,
    },
    {
      label: "活動內容",
      done: Boolean(event.short_description_tc || event.description_tc),
    },
  ];
}

function getCompletenessPercent(items: CompletenessItem[]): number {
  if (items.length === 0) return 0;
  const done = items.filter((item) => item.done).length;
  return Math.round((done / items.length) * 100);
}

function PreviewBadge({
  children,
  tone = "purple",
}: {
  children: React.ReactNode;
  tone?: "purple" | "green" | "amber" | "slate";
}) {
  const className =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
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
}: {
  label: string;
  value: string;
}) {
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
  children: React.ReactNode;
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

export default function MerchantEventPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = String(params?.id || "");

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"market" | "detail">("market");

  useEffect(() => {
    let ignore = false;

    async function loadEvent() {
      setLoading(true);
      setErrorText("");

      if (!supabase) {
        setErrorText("Supabase 尚未初始化，請檢查 .env.local。");
        setLoading(false);
        return;
      }

      if (!eventId) {
        setErrorText("找不到活動 ID。");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

      if (ignore) return;

      if (error) {
        setErrorText(error.message || "讀取活動資料失敗。");
        setEvent(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setErrorText("找不到此活動。");
        setEvent(null);
        setLoading(false);
        return;
      }

      setEvent(data as EventRecord);
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
    return getGalleryImages(event);
  }, [event]);

  const selectedImage = images[selectedImageIndex] || images[0];

  const completeness = useMemo(() => {
    if (!event) return [];
    return getCompleteness(event, images);
  }, [event, images]);

  const completenessPercent = getCompletenessPercent(completeness);

  const tags = useMemo(() => {
    if (!event) return [];
    return getTagArray(event.tags);
  }, [event]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-bold text-slate-500">正在載入 Preview...</p>
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
            <p className="text-sm font-extrabold text-rose-600">Preview 讀取失敗</p>
            <p className="mt-2 text-sm text-slate-600">{errorText}</p>
            <button
              type="button"
              onClick={() => router.push("/merchant/dashboard")}
              className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-extrabold text-white"
            >
              返回 Merchant Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  const title = safeText(event.title_tc, "未命名活動");
  const shortDescription = safeText(
    event.short_description_tc,
    "系統已根據商戶資料建立活動草稿，請商戶在正式提交審批前確認內容。",
  );
  const description = safeText(
    event.description_tc,
    "暫未提供詳細活動內容。",
  );
  const venue = safeText(
    event.venue_name_tc,
    safeText(event.address_tc, safeText(event.district, "地點待定")),
  );
  const address = safeText(event.address_tc, "");
  const district = safeText(event.district, "");
  const mtr = safeText(event.mtr_station, "");
  const merchantName = safeText(
    event.merchant_name,
    safeText(event.organizer_name, "HK Family Fun 商戶"),
  );
  const actionUrl = getPrimaryActionUrl(event);
  const actionLabel = getPrimaryActionLabel(event);
  const statusLabel = getStatusLabel(event.status);
  const approvalStatus = getStatusLabel(event.approval_status || event.status);

  const coverStyle: CSSProperties = {
    ...getCoverTransform(event),
    ...getCoverFilter(event),
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push("/merchant/dashboard")}
              className="mb-3 text-sm font-extrabold text-purple-700 hover:text-purple-900"
            >
              ← 返回 Merchant Dashboard
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <PreviewBadge tone="purple">Preview</PreviewBadge>
              <PreviewBadge tone="slate">狀態：{statusLabel}</PreviewBadge>
              <PreviewBadge
                tone={
                  completenessPercent >= 90
                    ? "green"
                    : completenessPercent >= 70
                      ? "amber"
                      : "slate"
                }
              >
                完成度 {completenessPercent}%
              </PreviewBadge>
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              活動提交前預覽
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
              此頁會同步 edit page 的封面裁切、圖片排序及 Gallery 圖片。提交審批前請檢查圖片、日期、地點、收費及報名連結。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push(`/merchant/events/${eventId}/edit`)}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            >
              返回編輯
            </button>
            <button
              type="button"
              onClick={() => router.push("/merchant/dashboard")}
              className="rounded-full bg-purple-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-purple-800"
            >
              返回 Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-6">
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("market")}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-extrabold ${
                viewMode === "market"
                  ? "bg-purple-700 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Market Card Preview
            </button>
            <button
              type="button"
              onClick={() => setViewMode("detail")}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-extrabold ${
                viewMode === "detail"
                  ? "bg-purple-700 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Detail Page Preview
            </button>
          </div>

          {viewMode === "market" ? (
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                <img
                  src={images[0]?.url || FALLBACK_IMAGE}
                  alt={title}
                  className="h-full w-full object-cover"
                  style={coverStyle}
                />

                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-purple-700 shadow-sm backdrop-blur">
                    {getCategoryLabel(event)}
                  </span>
                  <span className="rounded-full bg-amber-100/95 px-3 py-1 text-xs font-black text-amber-700 shadow-sm backdrop-blur">
                    {formatPrice(event)}
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                  封面已同步裁切設定
                </div>
              </div>

              <div className="p-6">
                <div className="mb-3 flex flex-wrap gap-2">
                  <PreviewBadge tone="purple">{getCategoryLabel(event)}</PreviewBadge>
                  <PreviewBadge tone="amber">{formatPrice(event)}</PreviewBadge>
                  {mtr ? <PreviewBadge tone="slate">{mtr}</PreviewBadge> : null}
                </div>

                <h2 className="text-2xl font-black leading-tight text-slate-950">
                  {title}
                </h2>

                <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                  {shortDescription}
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <InfoPill label="日期" value={formatDateRange(event)} />
                  <InfoPill label="時間" value={formatTimeRange(event)} />
                  <InfoPill label="地點" value={venue} />
                  <InfoPill label="收費" value={formatPrice(event)} />
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

                <div className="mt-6">
                  {actionUrl ? (
                    <a
                      href={actionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-purple-700 px-5 py-4 text-sm font-black text-white hover:bg-purple-800 md:w-auto"
                    >
                      {actionLabel}
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-200 px-5 py-4 text-sm font-black text-slate-500 md:w-auto"
                    >
                      {actionLabel}
                    </button>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 lg:aspect-auto lg:min-h-[520px]">
                  <img
                    src={images[0]?.url || FALLBACK_IMAGE}
                    alt={title}
                    className="h-full w-full object-cover"
                    style={coverStyle}
                  />
                </div>

                <div className="p-6 lg:p-8">
                  <div className="flex flex-wrap gap-2">
                    <PreviewBadge tone="purple">{getCategoryLabel(event)}</PreviewBadge>
                    <PreviewBadge tone="amber">{formatPrice(event)}</PreviewBadge>
                  </div>

                  <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950">
                    {title}
                  </h2>

                  <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                    {shortDescription}
                  </p>

                  <div className="mt-6 grid gap-3">
                    <InfoPill label="日期" value={formatDateRange(event)} />
                    <InfoPill label="時間" value={formatTimeRange(event)} />
                    <InfoPill label="地點" value={venue} />
                    <InfoPill label="主辦商戶" value={merchantName} />
                  </div>

                  <div className="mt-6">
                    {actionUrl ? (
                      <a
                        href={actionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-purple-700 px-5 py-4 text-sm font-black text-white hover:bg-purple-800"
                      >
                        {actionLabel}
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-200 px-5 py-4 text-sm font-black text-slate-500"
                      >
                        {actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          <SectionCard title="活動圖片 Gallery" icon="🖼️">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img
                    src={selectedImage?.url || FALLBACK_IMAGE}
                    alt={selectedImage?.label || title}
                    className="h-full w-full object-cover"
                    style={selectedImage?.isCover ? coverStyle : undefined}
                  />

                  <div className="absolute left-4 top-4 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                    {selectedImage?.label || "圖片"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                {images.map((image, index) => (
                  <button
                    key={`${image.url}-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`group overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition ${
                      selectedImageIndex === index
                        ? "border-purple-500 ring-2 ring-purple-200"
                        : "border-slate-200 hover:border-purple-200"
                    }`}
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-slate-100">
                      <img
                        src={image.url}
                        alt={image.label}
                        className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                        style={image.isCover ? coverStyle : undefined}
                      />
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs font-extrabold text-slate-700">
                        {image.label}
                      </span>
                      {image.isCover ? (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-black text-purple-700">
                          Cover
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="活動資料" icon="📝">
            <div className="prose prose-sm max-w-none text-slate-700">
              <p className="whitespace-pre-wrap leading-7">{description}</p>
            </div>
          </SectionCard>

          <SectionCard title="地點及交通" icon="📍">
            <div className="grid gap-3 md:grid-cols-2">
              <InfoPill label="場地" value={venue} />
              <InfoPill label="地區" value={district || "地區待定"} />
              <InfoPill label="港鐵站" value={mtr || "港鐵站待定"} />
              <InfoPill label="地址" value={address || "地址待定"} />
            </div>

            {isValidUrl(event.google_map_embed_url) ? (
              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
                <iframe
                  src={event.google_map_embed_url}
                  className="h-[320px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : isValidUrl(event.google_map_url) ? (
              <a
                href={event.google_map_url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
              >
                開啟 Google Map
              </a>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                尚未加入 Google Map。
              </div>
            )}
          </SectionCard>

          <SectionCard title="家長留意事項" icon="⚠️">
            <div className="grid gap-4">
              <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                <p className="text-xs font-black text-amber-700">家長提示</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-amber-900">
                  {safeText(event.parent_note_tc, "請出發前再次向主辦方確認活動日期、時間、名額、收費及報名安排。")}
                </p>
              </div>

              <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
                <p className="text-xs font-black text-sky-700">安全提示</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-sky-900">
                  {safeText(event.safety_note_tc, "請按小朋友年齡、體力及現場人流情況評估是否適合參加。")}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-700">取消及退款政策</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700">
                  {safeText(event.cancellation_policy_tc, "請以主辦方公布的最新安排為準。")}
                </p>
              </div>
            </div>
          </SectionCard>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-950">公開頁關鍵資料</h3>
              <PreviewBadge
                tone={
                  completenessPercent >= 90
                    ? "green"
                    : completenessPercent >= 70
                      ? "amber"
                      : "slate"
                }
              >
                {completenessPercent}%
              </PreviewBadge>
            </div>

            <div className="mt-4 space-y-2">
              {completeness.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2"
                >
                  <span className="text-xs font-bold text-slate-500">
                    {item.label}
                  </span>
                  <span
                    className={`text-xs font-black ${
                      item.done ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {item.done ? "已完成" : "未完成"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-black text-slate-950">審批狀態</h3>

            <div className="mt-4 grid gap-3">
              <InfoPill label="活動狀態" value={statusLabel} />
              <InfoPill label="審批狀態" value={approvalStatus} />
              <InfoPill label="圖片數量" value={`${images.length} 張`} />
              <InfoPill
                label="來源"
                value={safeText(event.source_type, "商戶手動建立")}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-purple-100 bg-purple-50 p-5">
            <h3 className="text-sm font-black text-purple-950">圖片檢查重點</h3>
            <ul className="mt-3 space-y-2 text-xs font-bold leading-6 text-purple-800">
              <li>• 第一張圖片會作為封面圖片。</li>
              <li>• Preview 已按 edit page 圖片排序顯示。</li>
              <li>• 封面圖會同步 zoom、左右、上下裁切設定。</li>
              <li>• Gallery 已自動移除重複圖片。</li>
              <li>• 建議封面使用 16:9 橫圖，海報可放 Gallery。</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}