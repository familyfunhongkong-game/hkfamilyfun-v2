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
  short_description_tc?: string | null;
  description_tc?: string | null;
  highlights?: string | null;
  terms?: string | null;
  remarks?: string | null;
  tags?: string[] | JsonValue | null;

  status?: string | null;
  approval_status?: string | null;
  admin_note?: string | null;
  rejection_reason?: string | null;

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
  contact_phone?: string | null;
  contact_email?: string | null;
  whatsapp?: string | null;

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

type StatusFilter =
  | "all"
  | "draft"
  | "submitted"
  | "published"
  | "rejected"
  | "archived";

type SortMode = "newest" | "oldest" | "date";

type Tone = "purple" | "green" | "amber" | "slate" | "rose";

const FALLBACK_IMAGE =
  "https://placehold.co/1200x675/f5f3ff/7c3aed?text=HK+Family+Fun";

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "submitted", label: "待審批" },
  { key: "draft", label: "草稿" },
  { key: "published", label: "已發布" },
  { key: "rejected", label: "已拒絕" },
  { key: "archived", label: "已封存" },
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

function normalizedStatus(event: EventRecord): StatusFilter {
  const status = safeText(event.status || event.approval_status, "draft").toLowerCase();

  if (["submitted", "pending", "review", "pending_review"].includes(status)) {
    return "submitted";
  }

  if (["approved", "published", "live"].includes(status)) return "published";
  if (["rejected", "declined"].includes(status)) return "rejected";
  if (["archived", "hidden", "offline"].includes(status)) return "archived";

  return "draft";
}

function getStatusLabel(event: EventRecord): string {
  const status = normalizedStatus(event);

  if (status === "submitted") return "審批中";
  if (status === "published") return "已發布";
  if (status === "rejected") return "已拒絕";
  if (status === "archived") return "已封存";

  return "草稿";
}

function getStatusTone(status: StatusFilter): Tone {
  if (status === "submitted") return "amber";
  if (status === "published") return "green";
  if (status === "rejected") return "rose";
  if (status === "archived") return "slate";

  return "purple";
}

function extractMissingColumn(errorMessage: string) {
  const match = errorMessage.match(/Could not find the '([^']+)' column/);
  return match?.[1] || "";
}

function hasCriticalReady(event: EventRecord): boolean {
  const images = getGalleryImages(event);
  const hasRealImage = images.length > 0 && images[0]?.url !== FALLBACK_IMAGE;

  const hasTitle = Boolean(safeText(event.title_tc || event.title));
  const hasDate = Boolean(event.start_date);
  const hasVenue = Boolean(
    event.venue_name_tc ||
      event.venue_name ||
      event.address_tc ||
      event.address ||
      event.district,
  );
  const hasCta =
    Boolean(getPrimaryActionUrl(event)) ||
    safeText(event.cta_type).toLowerCase() === "none" ||
    safeText(event.cta_type).toLowerCase() === "contact" ||
    event.registration_required === false;

  return hasTitle && hasDate && hasVenue && hasRealImage && hasCta;
}

function getCompleteness(event: EventRecord): number {
  const images = getGalleryImages(event);

  const checks = [
    Boolean(safeText(event.title_tc || event.title)),
    Boolean(event.start_date),
    Boolean(
      event.venue_name_tc ||
        event.venue_name ||
        event.address_tc ||
        event.address ||
        event.district,
    ),
    images.length > 0 && images[0]?.url !== FALLBACK_IMAGE,
    Boolean(getPrimaryActionUrl(event)) ||
      safeText(event.cta_type).toLowerCase() === "none" ||
      safeText(event.cta_type).toLowerCase() === "contact" ||
      event.registration_required === false,
    formatPrice(event) !== "收費待確認",
    Boolean(safeText(event.description_tc || event.short_description_tc)),
    Boolean(event.google_map_url || event.google_map_embed_url),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function Badge({
  children,
  tone = "purple",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  const className =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : tone === "rose"
          ? "bg-rose-50 text-rose-700 ring-rose-100"
          : tone === "slate"
            ? "bg-slate-100 text-slate-700 ring-slate-200"
            : "bg-purple-50 text-purple-700 ring-purple-100";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${className}`}>
      {children}
    </span>
  );
}

function AnalyticsCard({
  label,
  value,
  note,
  tone = "purple",
}: {
  label: string;
  value: string | number;
  note: string;
  tone?: Tone;
}) {
  const bg =
    tone === "green"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-900 ring-amber-100"
        : tone === "rose"
          ? "bg-rose-50 text-rose-900 ring-rose-100"
          : tone === "slate"
            ? "bg-slate-50 text-slate-900 ring-slate-100"
            : "bg-purple-50 text-purple-950 ring-purple-100";

  return (
    <div className={`rounded-3xl p-5 ring-1 ${bg}`}>
      <p className="text-xs font-black opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-2 text-xs font-bold leading-5 opacity-70">{note}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[76px_1fr] gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
      <span className="font-black text-slate-400">{label}</span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  );
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [errorText, setErrorText] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [searchText, setSearchText] = useState("");

  async function loadEvents() {
    const client = supabase;

    setLoading(true);
    setErrorText("");
    setMessage("");

    if (!client) {
      setErrorText("Supabase 尚未初始化，請檢查 .env.local。");
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data, error } = await client
      .from("events")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      setErrorText(error.message || "讀取 Admin 活動資料失敗。");
      setEvents([]);
      setLoading(false);
      return;
    }

    setEvents((data || []) as EventRecord[]);
    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function updateEventStatus(
    event: EventRecord,
    nextStatus: "published" | "rejected" | "archived" | "draft",
  ) {
    const client = supabase;

    if (!client) {
      setErrorText("Supabase 尚未初始化。");
      return;
    }

    if (nextStatus === "published" && !hasCriticalReady(event)) {
      setMessage("此活動仍有關鍵資料未完成。請入 Review 頁檢查後再發布。");
      return;
    }

    setSavingId(event.id);
    setErrorText("");
    setMessage("");

    const now = new Date().toISOString();

    let payload: Record<string, unknown> = {
      status: nextStatus,
      approval_status:
        nextStatus === "published"
          ? "approved"
          : nextStatus === "rejected"
            ? "rejected"
            : nextStatus === "archived"
              ? "archived"
              : "draft",
      updated_at: now,
    };

    if (nextStatus === "published") {
      payload.published_at = now;
    }

    if (nextStatus === "rejected") {
      payload.rejection_reason = "Admin 已拒絕，請商戶修改資料後再提交。";
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { data, error } = await client
        .from("events")
        .update(payload)
        .eq("id", event.id)
        .select("*")
        .maybeSingle();

      if (!error) {
        const updated = data as EventRecord;

        setEvents((previous) =>
          previous.map((item) => (item.id === event.id ? updated : item)),
        );

        if (nextStatus === "published") setMessage("活動已發布。");
        if (nextStatus === "rejected") setMessage("活動已拒絕。");
        if (nextStatus === "archived") setMessage("活動已封存。");
        if (nextStatus === "draft") setMessage("活動已轉回草稿。");

        setSavingId("");
        return;
      }

      const missingColumn = extractMissingColumn(error.message || "");

      if (missingColumn && Object.prototype.hasOwnProperty.call(payload, missingColumn)) {
        const nextPayload = { ...payload };
        delete nextPayload[missingColumn];
        payload = nextPayload;
        continue;
      }

      setErrorText(error.message || "更新活動狀態失敗。");
      setSavingId("");
      return;
    }

    setErrorText("更新活動狀態失敗：資料庫欄位不一致，已重試多次仍失敗。");
    setSavingId("");
  }

  const analytics = useMemo(() => {
    const total = events.length;
    const submitted = events.filter((item) => normalizedStatus(item) === "submitted").length;
    const draft = events.filter((item) => normalizedStatus(item) === "draft").length;
    const published = events.filter((item) => normalizedStatus(item) === "published").length;
    const rejected = events.filter((item) => normalizedStatus(item) === "rejected").length;
    const archived = events.filter((item) => normalizedStatus(item) === "archived").length;
    const readyToPublish = events.filter((item) => hasCriticalReady(item)).length;

    const imageReady = events.filter((item) => {
      const images = getGalleryImages(item);
      return images.length > 0 && images[0]?.url !== FALLBACK_IMAGE;
    }).length;

    return {
      total,
      submitted,
      draft,
      published,
      rejected,
      archived,
      readyToPublish,
      imageReady,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    let next = [...events];

    if (statusFilter !== "all") {
      next = next.filter((event) => normalizedStatus(event) === statusFilter);
    }

    if (keyword) {
      next = next.filter((event) => {
        const haystack = [
          event.title_tc,
          event.title,
          event.short_description_tc,
          event.merchant_name,
          event.organizer_name,
          event.venue_name_tc,
          event.venue_name,
          event.district,
          event.mtr_station,
          event.activity_category,
          event.category,
        ]
          .map((item) => safeText(item))
          .join(" ")
          .toLowerCase();

        return haystack.includes(keyword);
      });
    }

    if (sortMode === "oldest") {
      next.sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
        const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
        return aTime - bTime;
      });
    }

    if (sortMode === "newest") {
      next.sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
        const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
        return bTime - aTime;
      });
    }

    if (sortMode === "date") {
      next.sort((a, b) => {
        const aTime = new Date(a.start_date || a.updated_at || 0).getTime();
        const bTime = new Date(b.start_date || b.updated_at || 0).getTime();
        return aTime - bTime;
      });
    }

    return next;
  }, [events, statusFilter, searchText, sortMode]);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                href="/admin"
                className="text-sm font-black text-purple-700 hover:text-purple-900"
              >
                ← 返回 Admin
              </Link>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                Admin 活動審批中心
              </h1>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                管理商戶提交活動、快速審批、進入 Review 詳情頁檢查圖片排序、封面裁切、CTA、地點及發布清單。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadEvents}
                disabled={loading}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? "讀取中..." : "重新整理"}
              </button>

              <Link
                href="/merchant/events/import"
                className="rounded-full border border-purple-200 bg-white px-5 py-2 text-sm font-black text-purple-700 hover:bg-purple-50"
              >
                AI 匯入活動
              </Link>

              <Link
                href="/merchant/dashboard"
                className="rounded-full bg-purple-700 px-5 py-2 text-sm font-black text-white hover:bg-purple-800"
              >
                商戶 Dashboard
              </Link>
            </div>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
              {message}
            </div>
          ) : null}

          {errorText ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
              {errorText}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <AnalyticsCard
            label="全部活動"
            value={analytics.total}
            note="系統內所有活動"
            tone="slate"
          />
          <AnalyticsCard
            label="待審批"
            value={analytics.submitted}
            note="需要 Admin Review"
            tone="amber"
          />
          <AnalyticsCard
            label="已發布"
            value={analytics.published}
            note="公開頁可見"
            tone="green"
          />
          <AnalyticsCard
            label="圖片完成"
            value={analytics.imageReady}
            note="已有封面或圖片"
            tone="purple"
          />
          <AnalyticsCard
            label="可發布"
            value={analytics.readyToPublish}
            note="關鍵欄位已齊"
            tone="green"
          />
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-black transition",
                    statusFilter === filter.key
                      ? "bg-purple-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  ].join(" ")}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <select
              value={sortMode}
              onChange={(changeEvent) => setSortMode(changeEvent.target.value as SortMode)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            >
              <option value="newest">最新更新</option>
              <option value="oldest">最舊更新</option>
              <option value="date">活動日期</option>
            </select>
          </div>

          <input
            value={searchText}
            onChange={(changeEvent) => setSearchText(changeEvent.target.value)}
            placeholder="搜尋活動名稱、商戶、地點、分類、港鐵站..."
            className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          />
        </div>

        {loading ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-50 text-2xl">
              親
            </div>
            <p className="text-sm font-black text-slate-700">正在讀取 Admin 活動資料...</p>
          </div>
        ) : null}

        {!loading && filteredEvents.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-black text-slate-900">沒有符合條件的活動</p>
            <p className="mt-2 text-sm text-slate-500">請更改 filter 或重新整理。</p>
          </div>
        ) : null}

        {!loading && filteredEvents.length > 0 ? (
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {filteredEvents.map((event) => {
              const images = getGalleryImages(event);
              const status = normalizedStatus(event);
              const tone = getStatusTone(status);
              const title = safeText(event.title_tc || event.title, "未命名活動");
              const shortDescription = safeText(
                event.short_description_tc,
                "未提供短簡介。",
              );
              const merchantName = safeText(
                event.merchant_name || event.organizer_name,
                "未填商戶名稱",
              );
              const venue = safeText(
                event.venue_name_tc || event.venue_name,
                safeText(
                  event.address_tc || event.address,
                  safeText(event.district, "地點待定"),
                ),
              );
              const ctaUrl = getPrimaryActionUrl(event);
              const ready = hasCriticalReady(event);
              const completeness = getCompleteness(event);
              const isSaving = savingId === event.id;
              const isFallback = images[0]?.url === FALLBACK_IMAGE;

              const coverStyle: CSSProperties = isFallback
                ? {}
                : {
                    ...getCoverTransform(event),
                    ...getCoverFilter(event),
                  };

              return (
                <article
                  key={event.id}
                  className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
                >
                  <div className="grid gap-0 lg:grid-cols-[300px_1fr]">
                    <div className="relative min-h-[260px] overflow-hidden bg-gradient-to-br from-purple-50 via-white to-amber-50">
                      {isFallback ? (
                        <div className="flex h-full min-h-[260px] w-full flex-col items-center justify-center px-6 text-center">
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
                          src={images[0]?.url || FALLBACK_IMAGE}
                          alt={title}
                          className="h-full min-h-[260px] w-full object-cover"
                          style={coverStyle}
                        />
                      )}

                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        <Badge tone={tone}>{getStatusLabel(event)}</Badge>
                        <Badge tone={ready ? "green" : "rose"}>
                          {completeness}%
                        </Badge>
                      </div>

                      <div className="absolute bottom-3 left-3 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                        圖片 {images.length} 張
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="purple">{getCategoryLabel(event)}</Badge>
                        <Badge tone="amber">{formatPrice(event)}</Badge>
                        {ready ? (
                          <Badge tone="green">可發布</Badge>
                        ) : (
                          <Badge tone="rose">需檢查</Badge>
                        )}
                      </div>

                      <h2 className="mt-4 line-clamp-2 text-2xl font-black leading-tight text-slate-950">
                        {title}
                      </h2>

                      <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-slate-600">
                        {shortDescription}
                      </p>

                      <div className="mt-4 grid gap-2 md:grid-cols-2">
                        <InfoRow label="日期" value={formatDateRange(event)} />
                        <InfoRow label="時間" value={formatTimeRange(event)} />
                        <InfoRow label="地點" value={venue} />
                        <InfoRow label="商戶" value={merchantName} />
                      </div>

                      <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                        <p className="text-xs font-black text-slate-400">CTA</p>
                        <p className="mt-1 text-sm font-black text-slate-800">
                          {getPrimaryActionLabel(event)}
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-slate-400">
                          {ctaUrl || "沒有 URL"}
                        </p>
                      </div>

                      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <Link
                          href={`/admin/events/${event.id}`}
                          className="rounded-2xl bg-purple-700 px-4 py-3 text-center text-sm font-black text-white hover:bg-purple-800"
                        >
                          Review
                        </Link>

                        <Link
                          href={`/merchant/events/${event.id}/preview`}
                          className="rounded-2xl border border-purple-200 bg-white px-4 py-3 text-center text-sm font-black text-purple-700 hover:bg-purple-50"
                        >
                          Preview
                        </Link>

                        <Link
                          href={`/merchant/events/${event.id}/edit`}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </Link>

                        <Link
                          href={`/events/${event.id}`}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-50"
                        >
                          Public
                        </Link>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => updateEventStatus(event, "published")}
                          disabled={isSaving || !ready}
                          className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-300"
                        >
                          {isSaving ? "處理中..." : "快速發布"}
                        </button>

                        <button
                          type="button"
                          onClick={() => updateEventStatus(event, "rejected")}
                          disabled={isSaving}
                          className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          拒絕
                        </button>

                        <button
                          type="button"
                          onClick={() => updateEventStatus(event, "draft")}
                          disabled={isSaving}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          轉草稿
                        </button>

                        <button
                          type="button"
                          onClick={() => updateEventStatus(event, "archived")}
                          disabled={isSaving}
                          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          封存
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}