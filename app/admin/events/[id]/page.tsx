"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  admin_note?: string | null;
  rejection_reason?: string | null;

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

  venue_name?: string | null;
  venue_name_tc?: string | null;
  venue_name_en?: string | null;
  address?: string | null;
  address_tc?: string | null;
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

type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  level: "critical" | "warning" | "good";
  note: string;
};

type StatusTone = "purple" | "green" | "amber" | "slate" | "rose";

const FALLBACK_IMAGE =
  "https://placehold.co/1200x675/f5f3ff/7c3aed?text=HK+Family+Fun";

function safeText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;

  if (Array.isArray(value)) {
    const joined = value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join(", ");
    return joined || fallback;
  }

  if (typeof value === "object") {
    return fallback;
  }

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

function isValidUrl(value: unknown): value is string {
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
      return trimmed
        .split(/[,\n，、]/)
        .map((item) => item.trim())
        .filter((item) => isValidUrl(item));
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

function getTagArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => safeText(item)).filter(Boolean).slice(0, 8);
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
        .slice(0, 8);
    }
  }

  return [];
}

function getPrimaryActionUrl(event: EventRecord): string | null {
  if (isValidUrl(event.registration_url)) return event.registration_url.trim();
  if (isValidUrl(event.booking_url)) return event.booking_url.trim();
  if (isValidUrl(event.official_url)) return event.official_url.trim();
  if (isValidUrl(event.source_url)) return event.source_url.trim();

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
  if (isValidUrl(event.registration_url) || isValidUrl(event.booking_url)) {
    return "前往報名";
  }
  if (isValidUrl(event.official_url) || isValidUrl(event.source_url)) {
    return "查看官方活動頁";
  }
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
  if (filterName === "soft") {
    extraFilter = "contrast(0.94) brightness(1.04)";
  }

  return {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${extraFilter}`,
  };
}

function getStatusLabel(status?: string | null): string {
  const text = safeText(status, "draft").toLowerCase();

  if (["submitted", "pending", "review", "pending_review"].includes(text)) {
    return "審批中";
  }
  if (["approved", "published", "live"].includes(text)) return "已發布";
  if (["rejected", "declined"].includes(text)) return "已拒絕";
  if (["archived", "hidden", "offline"].includes(text)) return "已封存";

  return "草稿";
}

function getStatusTone(status?: string | null): StatusTone {
  const text = safeText(status, "draft").toLowerCase();

  if (["submitted", "pending", "review", "pending_review"].includes(text)) {
    return "amber";
  }
  if (["approved", "published", "live"].includes(text)) return "green";
  if (["rejected", "declined"].includes(text)) return "rose";
  if (["archived", "hidden", "offline"].includes(text)) return "slate";

  return "purple";
}

function extractMissingColumn(errorMessage: string) {
  const match = errorMessage.match(/Could not find the '([^']+)' column/);
  return match?.[1] || "";
}

function buildChecklist(event: EventRecord, images: GalleryImage[]): ChecklistItem[] {
  const actionUrl = getPrimaryActionUrl(event);
  const description = safeText(event.description_tc || event.short_description_tc);
  const price = formatPrice(event);
  const hasMap = isValidUrl(event.google_map_url) || isValidUrl(event.google_map_embed_url);
  const hasRealImage = images.length > 0 && images[0]?.url !== FALLBACK_IMAGE;

  return [
    {
      key: "title",
      label: "活動名稱",
      done: Boolean(safeText(event.title_tc || event.title)),
      level: "critical",
      note: "公開頁最重要欄位，不能空白。",
    },
    {
      key: "date",
      label: "日期",
      done: Boolean(event.start_date),
      level: "critical",
      note: "沒有日期不應發布。",
    },
    {
      key: "venue",
      label: "地點",
      done: Boolean(
        event.venue_name_tc ||
          event.venue_name ||
          event.address_tc ||
          event.address ||
          event.district,
      ),
      level: "critical",
      note: "至少要有場地、地址或地區。",
    },
    {
      key: "image",
      label: "圖片",
      done: hasRealImage,
      level: "critical",
      note: "至少需要一張真實活動圖或海報。",
    },
    {
      key: "cta",
      label: "CTA / 報名方式",
      done:
        Boolean(actionUrl) ||
        safeText(event.cta_type).toLowerCase() === "none" ||
        safeText(event.cta_type).toLowerCase() === "contact" ||
        event.registration_required === false,
      level: "critical",
      note: "要清楚知道家長是否需要報名及去哪裡報名。",
    },
    {
      key: "price",
      label: "收費",
      done: price !== "收費待確認",
      level: "warning",
      note: "可以發布，但最好避免顯示收費待確認。",
    },
    {
      key: "description",
      label: "活動內容",
      done: description.length >= 20,
      level: "warning",
      note: "內容太短會影響家長理解及 SEO。",
    },
    {
      key: "map",
      label: "Google Map",
      done: hasMap,
      level: "warning",
      note: "沒有地圖仍可發布，但用戶體驗較差。",
    },
    {
      key: "parentNote",
      label: "家長提示",
      done: Boolean(event.parent_note_tc || event.terms || event.remarks),
      level: "good",
      note: "建議有注意事項、取消安排或家長提示。",
    },
  ];
}

function getChecklistScore(items: ChecklistItem[]) {
  if (!items.length) return 0;
  const done = items.filter((item) => item.done).length;
  return Math.round((done / items.length) * 100);
}

function hasCriticalBlocker(items: ChecklistItem[]) {
  return items.some((item) => item.level === "critical" && !item.done);
}

function Badge({
  children,
  tone = "purple",
}: {
  children: ReactNode;
  tone?: StatusTone;
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

export default function AdminEventReviewPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = String(params?.id || "");

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [message, setMessage] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  async function loadEvent() {
    const client = supabase;

    setLoading(true);
    setErrorText("");
    setMessage("");

    if (!client) {
      setErrorText("Supabase 尚未初始化，請檢查 .env.local。");
      setLoading(false);
      return;
    }

    if (!eventId) {
      setErrorText("找不到活動 ID。");
      setLoading(false);
      return;
    }

    const { data, error } = await client
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();

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

    const currentEvent = data as EventRecord;
    setEvent(currentEvent);
    setAdminNote(safeText(currentEvent.admin_note || currentEvent.rejection_reason));
    setSelectedImageIndex(0);
    setLoading(false);
  }

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const images = useMemo(() => {
    if (!event) return [];
    return getGalleryImages(event);
  }, [event]);

  const selectedImage = images[selectedImageIndex] || images[0];

  const checklist = useMemo(() => {
    if (!event) return [];
    return buildChecklist(event, images);
  }, [event, images]);

  const checklistScore = getChecklistScore(checklist);
  const blocked = hasCriticalBlocker(checklist);

  const tags = useMemo(() => {
    if (!event) return [];
    return getTagArray(event.tags);
  }, [event]);

  async function updateEventStatus(
    nextStatus: "published" | "rejected" | "archived" | "draft",
  ) {
    const client = supabase;

    if (!client || !event) {
      setErrorText("Supabase 尚未初始化或活動資料不存在。");
      return;
    }

    if (nextStatus === "published" && blocked) {
      setMessage("仍有關鍵資料未完成，請先補齊活動名稱、日期、地點、圖片及 CTA。");
      return;
    }

    setSaving(true);
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
      admin_note: adminNote,
      updated_at: now,
    };

    if (nextStatus === "published") {
      payload.published_at = now;
    }

    if (nextStatus === "rejected") {
      payload.rejection_reason =
        adminNote || "資料未符合發布要求，請商戶補充後再提交。";
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
        setEvent(updated);
        setAdminNote(safeText(updated.admin_note || updated.rejection_reason));
        setSaving(false);

        if (nextStatus === "published") setMessage("活動已批准並發布。");
        if (nextStatus === "rejected") setMessage("活動已拒絕，商戶需要修改後再提交。");
        if (nextStatus === "archived") setMessage("活動已封存。");
        if (nextStatus === "draft") setMessage("活動已轉回草稿。");

        return;
      }

      const missingColumn = extractMissingColumn(error.message || "");

      if (missingColumn && Object.prototype.hasOwnProperty.call(payload, missingColumn)) {
        const nextPayload = { ...payload };
        delete nextPayload[missingColumn];
        payload = nextPayload;
        continue;
      }

      setErrorText(error.message || "更新審批狀態失敗。");
      setSaving(false);
      return;
    }

    setErrorText("更新失敗：資料庫欄位不一致，重試後仍未成功。");
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              正在載入 Admin Review...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (errorText && !event) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-extrabold text-rose-600">活動讀取失敗</p>
            <p className="mt-2 text-sm text-slate-600">{errorText}</p>
            <button
              type="button"
              onClick={() => router.push("/admin/events")}
              className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-extrabold text-white"
            >
              返回審批中心
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!event) return null;

  const title = safeText(event.title_tc || event.title, "未命名活動");
  const shortDescription = safeText(event.short_description_tc, "商戶未提供短簡介。");
  const description = safeText(event.description_tc, "暫未提供詳細活動內容。");
  const venue = safeText(
    event.venue_name_tc || event.venue_name,
    safeText(event.address_tc || event.address, safeText(event.district, "地點待定")),
  );
  const address = safeText(event.address_tc || event.address);
  const district = safeText(event.district);
  const mtr = safeText(event.mtr_station);
  const merchantName = safeText(event.merchant_name || event.organizer_name, "未填商戶名稱");
  const actionUrl = getPrimaryActionUrl(event);
  const actionLabel = getPrimaryActionLabel(event);

  const coverStyle: CSSProperties = {
    ...getCoverTransform(event),
    ...getCoverFilter(event),
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                href="/admin/events"
                className="text-sm font-black text-purple-700 hover:text-purple-900"
              >
                ← 返回活動審批中心
              </Link>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone={getStatusTone(event.status)}>
                  活動狀態：{getStatusLabel(event.status)}
                </Badge>
                <Badge tone={getStatusTone(event.approval_status || event.status)}>
                  審批：{getStatusLabel(event.approval_status || event.status)}
                </Badge>
                <Badge tone={blocked ? "rose" : "green"}>
                  發布檢查 {checklistScore}%
                </Badge>
                <Badge tone="slate">圖片 {images.length} 張</Badge>
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                活動最終審批 Review
              </h1>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                此頁顯示商戶最終圖片排序、封面裁切、Gallery、CTA、地點及收費。批准後活動會變成公開狀態。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadEvent}
                disabled={saving}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                重新整理
              </button>

              <Link
                href={`/merchant/events/${event.id}/preview`}
                className="rounded-full border border-purple-200 bg-white px-5 py-2 text-sm font-black text-purple-700 hover:bg-purple-50"
              >
                商戶 Preview
              </Link>

              <Link
                href={`/events/${event.id}`}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                公開頁
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
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-6">
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
                封面已套用商戶 crop 設定
              </div>
            </div>

            <div className="p-6 lg:p-8">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge tone="purple">{getCategoryLabel(event)}</Badge>
                <Badge tone="amber">{formatPrice(event)}</Badge>
                {mtr ? <Badge tone="slate">{mtr}</Badge> : null}
              </div>

              <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-950">
                {title}
              </h2>

              <p className="mt-4 max-w-4xl text-sm font-medium leading-7 text-slate-600">
                {shortDescription}
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
            </div>
          </section>

          <SectionCard title="圖片 Review Gallery" icon="🖼️">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
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

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
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

          <SectionCard title="活動內容 Review" icon="📝">
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <p className="text-xs font-black text-slate-400">活動詳情</p>
                <div className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm font-medium leading-8 text-slate-700 ring-1 ring-slate-100">
                  {description}
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-slate-400">活動亮點</p>
                <div className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm font-medium leading-8 text-slate-700 ring-1 ring-slate-100">
                  {safeText(event.highlights, "未填寫")}
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-slate-400">注意事項</p>
                <div className="mt-2 whitespace-pre-wrap rounded-2xl bg-amber-50 p-4 text-sm font-medium leading-8 text-amber-900 ring-1 ring-amber-100">
                  {safeText(event.terms || event.parent_note_tc, "未填寫")}
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-slate-400">備註 / 安全提示</p>
                <div className="mt-2 whitespace-pre-wrap rounded-2xl bg-sky-50 p-4 text-sm font-medium leading-8 text-sky-900 ring-1 ring-sky-100">
                  {safeText(event.remarks || event.safety_note_tc, "未填寫")}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="地點、CTA 及來源資料" icon="📍">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <InfoPill label="場地" value={venue} />
              <InfoPill label="地區" value={district || "地區待定"} />
              <InfoPill label="港鐵站" value={mtr || "港鐵站待定"} />
              <InfoPill label="地址" value={address || "地址待定"} />
              <InfoPill label="主辦 / 商戶" value={merchantName} />
              <InfoPill label="來源" value={safeText(event.source_type, "商戶手動建立")} />
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-black text-slate-950">CTA 檢查</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                按鈕文字：<span className="font-black">{actionLabel}</span>
              </p>

              {actionUrl ? (
                <a
                  href={actionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800"
                >
                  測試打開 CTA 連結
                </a>
              ) : (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  沒有可點擊 CTA URL。若活動需要報名，請先退回商戶修改。
                </div>
              )}
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
        </section>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-purple-700">
                  Final Publish Checklist
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-950">
                  發布前檢查
                </h2>
              </div>
              <Badge tone={blocked ? "rose" : "green"}>{checklistScore}%</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {checklist.map((item) => (
                <div
                  key={item.key}
                  className={[
                    "rounded-2xl border p-3",
                    item.done
                      ? "border-emerald-100 bg-emerald-50"
                      : item.level === "critical"
                        ? "border-rose-200 bg-rose-50"
                        : "border-amber-200 bg-amber-50",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-950">{item.label}</p>
                    <span
                      className={[
                        "text-xs font-black",
                        item.done
                          ? "text-emerald-700"
                          : item.level === "critical"
                            ? "text-rose-700"
                            : "text-amber-700",
                      ].join(" ")}
                    >
                      {item.done
                        ? "通過"
                        : item.level === "critical"
                          ? "必須修正"
                          : "建議修正"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium leading-5 text-slate-600">
                    {item.note}
                  </p>
                </div>
              ))}
            </div>

            {blocked ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-800">
                不建議發布：仍有關鍵欄位未完成。請退回商戶修改。
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800">
                關鍵欄位已完成，可以批准發布。
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">審批備註</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              拒絕或退回草稿時，請寫清楚商戶需要修改什麼。
            </p>

            <textarea
              value={adminNote}
              onChange={(changeEvent) => setAdminNote(changeEvent.target.value)}
              placeholder="例如：請補充正確報名連結、活動日期、收費資料或更清晰圖片。"
              className="mt-4 min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">審批操作</h2>

            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={() => updateEventStatus("published")}
                disabled={saving || blocked}
                className="rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-300"
              >
                {saving ? "處理中..." : "批准並發布"}
              </button>

              <button
                type="button"
                onClick={() => updateEventStatus("rejected")}
                disabled={saving}
                className="rounded-2xl bg-rose-600 px-5 py-4 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50"
              >
                拒絕並退回商戶
              </button>

              <button
                type="button"
                onClick={() => updateEventStatus("draft")}
                disabled={saving}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                轉回草稿
              </button>

              <button
                type="button"
                onClick={() => updateEventStatus("archived")}
                disabled={saving}
                className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
              >
                封存活動
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-purple-200 bg-purple-50 p-5">
            <h2 className="text-sm font-black text-purple-950">Admin Review 重點</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs font-bold leading-6 text-purple-800">
              <li>封面顯示已同步商戶 crop 設定。</li>
              <li>Gallery 順序已跟商戶 edit page 一致。</li>
              <li>批准後會把活動變成 published。</li>
              <li>拒絕時應填寫清楚備註，方便商戶修改。</li>
              <li>沒有 CTA URL 時，不要批准需要報名的活動。</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}