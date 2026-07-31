"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type PriceMode =
  | "unknown"
  | "free_hidden"
  | "free_show"
  | "fixed"
  | "from"
  | "range"
  | "offer"
  | "multi_ticket"
  | "quota_only";

type BookingType =
  | "official_page"
  | "external_ticketing"
  | "google_form"
  | "merchant_website"
  | "whatsapp"
  | "phone"
  | "email"
  | "walk_in"
  | "enquiry_only";

type PublicStatus = "draft" | "submitted" | "published" | "rejected" | "archived";

type EventRecord = {
  id: string;

  title_tc?: string | null;
  short_description_tc?: string | null;
  description_tc?: string | null;

  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;

  venue_name?: string | null;
  address?: string | null;
  district?: string | null;
  mtr_station?: string | null;
  category?: string | null;

  cover_image_url?: string | null;
  gallery_image_urls?: string[] | null;

  price_type?: string | null;
  price_display_mode?: PriceMode | string | null;
  price_summary?: string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  original_price?: number | string | null;
  discount_price?: number | string | null;
  show_price_on_public?: boolean | null;

  quota_summary?: string | null;
  quota_total?: number | string | null;
  quota_remaining?: number | string | null;
  show_quota_on_public?: boolean | null;

  pricing_items?: unknown;
  add_on_items?: unknown;
  ticketing_notes?: string | null;

  age_groups?: unknown;
  tags?: unknown;
  language?: string | null;
  capacity_text?: string | null;
  duration_text?: string | null;

  event_highlights?: unknown;
  important_notes?: unknown;
  transportation_notes?: string | null;

  google_map_url?: string | null;
  map_embed_url?: string | null;

  organizer_name?: string | null;
  organizer_phone?: string | null;
  organizer_email?: string | null;
  organizer_website?: string | null;
  official_website_url?: string | null;
  contact_whatsapp?: string | null;

  booking_type?: BookingType | string | null;
  booking_url?: string | null;
  booking_whatsapp?: string | null;
  booking_phone?: string | null;
  booking_email?: string | null;
  booking_message?: string | null;
  cta_label?: string | null;
  registration_url?: string | null;
  registration_required?: boolean | null;
  registration_deadline?: string | null;
  is_full?: boolean | null;
  is_walk_in?: boolean | null;

  platform_takes_booking?: boolean | null;
  platform_takes_payment?: boolean | null;
  future_partner_ref?: string | null;

  source_url?: string | null;
  source_type?: string | null;
  status?: PublicStatus | string | null;
  rejection_reason?: string | null;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80";

function safeText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInteger(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeUrl(value: unknown) {
  const text = safeText(value).trim();
  if (!text) return "";
  if (text.startsWith("http://") || text.startsWith("https://")) return text;
  return `https://${text}`;
}

function isValidHttpUrl(value: unknown) {
  const text = safeText(value).trim();
  return text.startsWith("http://") || text.startsWith("https://");
}

function parseList(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();

        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          const label = safeText(record.label).trim();
          const price = safeText(record.price).trim();
          const source = safeText(record.source).trim();
          const note = safeText(record.note).trim();

          return [label, price ? `HK$${price}` : "", source, note]
            .filter(Boolean)
            .join("｜");
        }

        return safeText(item).trim();
      })
      .filter(Boolean);
  }

  const text = safeText(value).trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parseList(parsed);
  } catch {
    return text
      .split(/[,\n，、|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getGalleryImages(event: EventRecord) {
  const cover = safeText(event.cover_image_url).trim();

  const gallery = Array.isArray(event.gallery_image_urls)
    ? event.gallery_image_urls
        .map((image) => safeText(image).trim())
        .filter(Boolean)
    : [];

  const allImages = [cover, ...gallery]
    .filter(Boolean)
    .filter((image, index, arr) => arr.indexOf(image) === index)
    .slice(0, 5);

  if (allImages.length === 0) return [fallbackImage];

  return allImages;
}

function formatDate(value: unknown) {
  const text = safeText(value);
  if (!text) return "日期待確認";

  const parts = text.split("-");
  if (parts.length === 3) return `${parts[0]}-${parts[1]}-${parts[2]}`;

  return text;
}

function formatDateRange(event: EventRecord) {
  const start = safeText(event.start_date);
  const end = safeText(event.end_date);

  if (start && end && start !== end) return `${formatDate(start)} 至 ${formatDate(end)}`;
  if (start) return formatDate(start);
  if (end) return formatDate(end);

  return "日期待確認";
}

function formatTimeRange(event: EventRecord) {
  const start = safeText(event.start_time);
  const end = safeText(event.end_time);

  if (start && end) return `${start.slice(0, 5)}–${end.slice(0, 5)}`;
  if (start) return `${start.slice(0, 5)} 開始`;
  if (end) return `${end.slice(0, 5)} 結束`;

  return "時間待確認";
}

function normalizePriceMode(value: unknown): PriceMode {
  const text = safeText(value);

  if (
    [
      "unknown",
      "free_hidden",
      "free_show",
      "fixed",
      "from",
      "range",
      "offer",
      "multi_ticket",
      "quota_only",
    ].includes(text)
  ) {
    return text as PriceMode;
  }

  if (text === "single") return "fixed";

  return "unknown";
}

function normalizeBookingType(value: unknown): BookingType {
  const text = safeText(value);

  if (
    [
      "official_page",
      "external_ticketing",
      "google_form",
      "merchant_website",
      "whatsapp",
      "phone",
      "email",
      "walk_in",
      "enquiry_only",
    ].includes(text)
  ) {
    return text as BookingType;
  }

  return "official_page";
}

function getPriceDisplay(event: EventRecord) {
  const mode = normalizePriceMode(event.price_display_mode);

  if (event.is_full) return "名額已滿";

  if (event.show_price_on_public === false) return "";
  if (mode === "free_hidden") return "";
  if (mode === "quota_only") return "";

  if (mode === "free_show" || event.price_type === "free") return "免費";

  const min = toNumber(event.price_min);
  const max = toNumber(event.price_max);
  const original = toNumber(event.original_price);
  const discount = toNumber(event.discount_price);

  if (mode === "fixed") {
    if (min !== null) return `HK$${min}`;
    if (discount !== null) return `HK$${discount}`;
    return "收費待確認";
  }

  if (mode === "offer") {
    if (discount !== null && original !== null) {
      return `早鳥優惠價 HK$${discount} (原價 HK$${original})`;
    }
    if (min !== null && original !== null) {
      return `早鳥優惠價 HK$${min} (原價 HK$${original})`;
    }
    if (discount !== null) return `優惠價 HK$${discount}`;
    if (min !== null) return `優惠價 HK$${min}`;
    return "優惠詳情待確認";
  }

  if (mode === "range") {
    if (min !== null && max !== null && min !== max) return `HK$${min}–HK$${max}`;
    if (min !== null) return `HK$${min}`;
    return "收費待確認";
  }

  if (mode === "from" || mode === "multi_ticket") {
    if (min !== null) return `HK$${min} 起`;
    return "多票種";
  }

  const summary = safeText(event.price_summary).trim();
  if (summary) return summary;

  if (event.price_type === "paid") {
    if (min !== null && max !== null && min !== max) return `HK$${min}–HK$${max}`;
    if (min !== null) return `HK$${min}`;
    return "收費待確認";
  }

  return "收費待確認";
}

function getQuotaDisplay(event: EventRecord) {
  if (event.is_full) return "名額已滿";

  const summary = safeText(event.quota_summary).trim();
  const remaining = toInteger(event.quota_remaining);
  const total = toInteger(event.quota_total);

  if (!event.show_quota_on_public && !summary) return "";

  if (summary) return summary;
  if (remaining !== null && total !== null) return `尚餘 ${remaining} / ${total} 個名額`;
  if (remaining !== null) return `尚餘 ${remaining} 個名額`;
  if (total !== null) return `名額共 ${total} 個`;

  return event.show_quota_on_public ? "名額有限" : "";
}

function getCta(event: EventRecord) {
  const bookingType = normalizeBookingType(event.booking_type);
  const customLabel = safeText(event.cta_label).trim();

  if (event.is_full) {
    return {
      label: "名額已滿",
      href: "",
      clickable: false,
      helper: "商戶已標記此活動名額已滿。",
    };
  }

  if (event.is_walk_in || bookingType === "walk_in") {
    return {
      label: customLabel || "無需報名",
      href: "",
      clickable: false,
      helper: "家長可直接到場或按主辦方指示參加。",
    };
  }

  if (bookingType === "enquiry_only") {
    return {
      label: customLabel || "請向主辦查詢",
      href: "",
      clickable: false,
      helper: "此活動只作宣傳或查詢用途。",
    };
  }

  if (bookingType === "whatsapp") {
    const phone = safeText(event.booking_whatsapp || event.contact_whatsapp).replace(/[^\d]/g, "");
    const message = encodeURIComponent(
      safeText(event.booking_message).trim() || `你好，我想查詢「${safeText(event.title_tc)}」。`,
    );

    return {
      label: customLabel || "WhatsApp 報名",
      href: phone ? `https://wa.me/${phone}?text=${message}` : "",
      clickable: Boolean(phone),
      helper: phone ? "家長可直接 WhatsApp 商戶。" : "未填 WhatsApp 電話，公開頁會顯示查詢提示。",
    };
  }

  if (bookingType === "phone") {
    const phone = safeText(event.booking_phone || event.organizer_phone).trim();

    return {
      label: customLabel || "致電查詢",
      href: phone ? `tel:${phone}` : "",
      clickable: Boolean(phone),
      helper: phone ? "家長可直接致電查詢。" : "未填電話，公開頁會顯示查詢提示。",
    };
  }

  if (bookingType === "email") {
    const email = safeText(event.booking_email || event.organizer_email).trim();

    return {
      label: customLabel || "電郵查詢",
      href: email ? `mailto:${email}` : "",
      clickable: Boolean(email),
      helper: email ? "家長可直接電郵查詢。" : "未填電郵，公開頁會顯示查詢提示。",
    };
  }

  const fallbackUrl =
    safeText(event.booking_url).trim() ||
    safeText(event.registration_url).trim() ||
    safeText(event.official_website_url).trim() ||
    safeText(event.organizer_website).trim() ||
    safeText(event.source_url).trim();

  const labels: Record<BookingType, string> = {
    official_page: "查看官方活動頁",
    external_ticketing: "前往報名 / 購票",
    google_form: "填寫報名表",
    merchant_website: "前往商戶網站",
    whatsapp: "WhatsApp 報名",
    phone: "致電查詢",
    email: "電郵查詢",
    walk_in: "無需報名",
    enquiry_only: "請向主辦查詢",
  };

  return {
    label: customLabel || labels[bookingType],
    href: fallbackUrl ? normalizeUrl(fallbackUrl) : "",
    clickable: Boolean(fallbackUrl),
    helper: fallbackUrl ? "家長會被導向商戶或主辦方頁面。" : "未填連結，公開頁會顯示查詢提示。",
  };
}

function getMapEmbedUrl(event: EventRecord) {
  const embed = safeText(event.map_embed_url).trim();
  if (embed) return normalizeUrl(embed);

  const query = [
    event.venue_name,
    event.address,
    event.district,
    event.mtr_station,
    "Hong Kong",
  ]
    .map((item) => safeText(item).trim())
    .filter(Boolean)
    .join(" ");

  if (!query) return "";

  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function getGoogleMapUrl(event: EventRecord) {
  const url = safeText(event.google_map_url).trim();
  if (url) return normalizeUrl(url);

  const query = [
    event.venue_name,
    event.address,
    event.district,
    event.mtr_station,
    "Hong Kong",
  ]
    .map((item) => safeText(item).trim())
    .filter(Boolean)
    .join(" ");

  if (!query) return "";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function getStatusLabel(status: unknown) {
  const text = safeText(status);

  if (text === "draft") return "草稿";
  if (text === "submitted") return "審批中";
  if (text === "published") return "已發布";
  if (text === "rejected") return "需要修改";
  if (text === "archived") return "已封存";

  return "草稿";
}

function getStatusClass(status: unknown) {
  const text = safeText(status);

  if (text === "published") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (text === "submitted") return "bg-amber-50 text-amber-700 border-amber-200";
  if (text === "rejected") return "bg-red-50 text-red-700 border-red-200";
  if (text === "archived") return "bg-slate-100 text-slate-500 border-slate-200";

  return "bg-blue-50 text-blue-700 border-blue-200";
}

export default function MerchantEventPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = typeof params?.id === "string" ? params.id : "";

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  const priceDisplay = useMemo(() => (event ? getPriceDisplay(event) : ""), [event]);
  const quotaDisplay = useMemo(() => (event ? getQuotaDisplay(event) : ""), [event]);
  const cta = useMemo(() => (event ? getCta(event) : null), [event]);
  const mapEmbed = useMemo(() => (event ? getMapEmbedUrl(event) : ""), [event]);
  const googleMapUrl = useMemo(() => (event ? getGoogleMapUrl(event) : ""), [event]);
  const galleryImages = useMemo(() => (event ? getGalleryImages(event) : [fallbackImage]), [event]);

  const tags = useMemo(() => parseList(event?.tags).slice(0, 8), [event?.tags]);
  const ageGroups = useMemo(() => parseList(event?.age_groups), [event?.age_groups]);
  const highlights = useMemo(() => parseList(event?.event_highlights), [event?.event_highlights]);
  const notes = useMemo(() => parseList(event?.important_notes), [event?.important_notes]);
  const pricingItems = useMemo(() => parseList(event?.pricing_items), [event?.pricing_items]);
  const addOnItems = useMemo(() => parseList(event?.add_on_items), [event?.add_on_items]);

  useEffect(() => {
    let active = true;

    async function loadEvent() {
      setLoading(true);
      setErrorMessage("");

      if (!supabase || !eventId) {
        setErrorMessage("Supabase 未連接或活動 ID 不正確。");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setErrorMessage(error?.message || "找不到活動資料。");
        setEvent(null);
        setLoading(false);
        return;
      }

      setEvent(data as EventRecord);
      setLoading(false);
    }

    loadEvent();

    return () => {
      active = false;
    };
  }, [eventId]);

  async function submitForReview() {
    if (!supabase || !event) return;

    setSubmitting(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("events")
      .update({
        status: "submitted",
        price_summary: priceDisplay,
        quota_summary: quotaDisplay || safeText(event.quota_summary),
      })
      .eq("id", event.id);

    if (error) {
      setErrorMessage(error.message);
      setSubmitting(false);
      return;
    }

    router.push("/merchant/dashboard");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-5xl rounded-3xl border bg-white p-8 text-sm font-bold text-slate-600">
          正在載入活動預覽...
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-8 text-sm font-bold text-red-700">
          {errorMessage || "找不到活動資料。"}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <Link href="/merchant/dashboard" className="text-sm font-black text-purple-700">
              ← 返回 Merchant Dashboard
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black">活動提交前預覽</h1>
              <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(event.status)}`}>
                {getStatusLabel(event.status)}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              請檢查家長看到的活動圖片、收費、名額、CTA、地圖及注意事項。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/merchant/events/${event.id}/edit`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
            >
              修改資料
            </Link>
            <button
              type="button"
              onClick={submitForReview}
              disabled={submitting}
              className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
            >
              {submitting ? "提交中..." : "提交 HK Family Fun 審批"}
            </button>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        </section>
      ) : null}

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-6">
          <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="relative h-72 bg-slate-100 sm:h-96">
              <img
                src={galleryImages[0]}
                alt={safeText(event.title_tc) || "活動圖片"}
                className="h-full w-full object-cover"
              />

              <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-purple-700 shadow">
                  {safeText(event.category) || "親子活動"}
                </span>
                {event.status !== "published" ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 shadow">
                    預覽草稿
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setSelectedImage(galleryImages[0])}
                className="absolute bottom-5 right-5 rounded-full bg-white/95 px-4 py-2 text-xs font-black text-slate-900 shadow"
              >
                放大主圖
              </button>
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="text-sm font-black text-purple-700">Event Post Preview</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight">
                    {safeText(event.title_tc) || "未命名活動"}
                  </h2>
                </div>

                {cta ? (
                  <div className="min-w-[220px] rounded-3xl border border-purple-100 bg-purple-50 p-4">
                    <p className="text-xs font-black text-purple-700">主要 CTA</p>
                    {cta.clickable ? (
                      <a
                        href={cta.href}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block rounded-2xl bg-purple-700 px-4 py-3 text-center text-sm font-black text-white"
                      >
                        {cta.label}
                      </a>
                    ) : (
                      <div className="mt-2 rounded-2xl bg-slate-800 px-4 py-3 text-center text-sm font-black text-white">
                        {cta.label}
                      </div>
                    )}
                    <p className="mt-2 text-xs leading-5 text-slate-500">{cta.helper}</p>
                  </div>
                ) : null}
              </div>

              <p className="mt-5 text-base leading-8 text-slate-700">
                {safeText(event.short_description_tc) ||
                  safeText(event.description_tc) ||
                  "請補充活動簡介，讓家長快速理解活動是否適合小朋友。"}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <InfoTile icon="📅" label="日期與時間" value={`${formatDateRange(event)}・${formatTimeRange(event)}`} />
                <InfoTile
                  icon="📍"
                  label="地點"
                  value={[event.venue_name, event.district, event.mtr_station].map(safeText).filter(Boolean).join("・") || "地點待確認"}
                />
                {priceDisplay ? <InfoTile icon="🎟️" label="收費" value={priceDisplay} /> : null}
                {quotaDisplay ? <InfoTile icon="👥" label="名額" value={quotaDisplay} /> : null}
                {ageGroups.length > 0 ? <InfoTile icon="👶" label="適合年齡" value={ageGroups.join("、")} /> : null}
                {safeText(event.language) ? <InfoTile icon="🗣️" label="語言" value={safeText(event.language)} /> : null}
                {safeText(event.duration_text) ? <InfoTile icon="⏱️" label="活動時長" value={safeText(event.duration_text)} /> : null}
                {safeText(event.capacity_text) ? <InfoTile icon="🧾" label="對象 / 名額" value={safeText(event.capacity_text)} /> : null}
              </div>

              {tags.length > 0 ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </article>

          <SectionCard title="活動圖片 Gallery" icon="🖼️">
            <div className="mb-4 rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-blue-900">
              最多顯示 5 張圖片：1 張封面圖 + 4 張活動圖片。圖片可放 poster、場地相、活動流程圖或過往活動相片。
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {galleryImages.slice(0, 5).map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`group relative overflow-hidden rounded-3xl border bg-slate-100 text-left ${
                    index === 0 ? "sm:col-span-2 h-80" : "h-52"
                  }`}
                >
                  <img
                    src={image}
                    alt={`活動圖片 ${index + 1}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-900">
                      {index === 0 ? "封面圖" : `活動圖片 ${index + 1}`}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {galleryImages.length < 5 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-7 text-slate-500">
                目前只有 {galleryImages.length} 張圖片。建議補足至 3–5 張，家長會更容易理解活動內容。
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="活動亮點" icon="✨">
            {highlights.length > 0 ? (
              <BulletList items={highlights} />
            ) : (
              <EmptyText>未填活動亮點。建議列出 3–5 點，例如親子互動、打卡位、免費體驗、適合年齡。</EmptyText>
            )}
          </SectionCard>

          <SectionCard title="活動詳情" icon="📝">
            <div className="whitespace-pre-line text-sm leading-8 text-slate-700">
              {safeText(event.description_tc) || "未填詳細活動介紹。"}
            </div>
          </SectionCard>

          {(pricingItems.length > 0 || addOnItems.length > 0 || safeText(event.ticketing_notes)) ? (
            <SectionCard title="票價、票種及加購資料" icon="🎫">
              <div className="space-y-5">
                {pricingItems.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-black">票種 / 渠道</h3>
                    <BulletList items={pricingItems} />
                  </div>
                ) : null}

                {addOnItems.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-black">加購項目</h3>
                    <BulletList items={addOnItems} />
                  </div>
                ) : null}

                {safeText(event.ticketing_notes) ? (
                  <div className="rounded-3xl bg-amber-50 p-4 text-sm leading-7 text-amber-900">
                    {safeText(event.ticketing_notes)}
                  </div>
                ) : null}
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="注意事項" icon="⚠️">
            {notes.length > 0 ? (
              <BulletList items={notes} />
            ) : (
              <EmptyText>未填注意事項。建議加入報名、取消、年齡限制、入場安排、主辦方最終安排等資料。</EmptyText>
            )}
          </SectionCard>

          <SectionCard title="交通及地圖" icon="🗺️">
            <div className="space-y-4">
              <InfoTile
                icon="📍"
                label="地址"
                value={safeText(event.address) || safeText(event.venue_name) || "地址待確認"}
              />

              {safeText(event.transportation_notes) ? (
                <div className="rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                  {safeText(event.transportation_notes)}
                </div>
              ) : null}

              {mapEmbed ? (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                  <iframe title="Google Map" src={mapEmbed} className="h-80 w-full" loading="lazy" />
                </div>
              ) : (
                <EmptyText>未有足夠地點資料產生 Google Map。</EmptyText>
              )}

              {googleMapUrl ? (
                <a
                  href={googleMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
                >
                  開啟 Google Map
                </a>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="主辦機構及聯絡方式" icon="🏢">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile icon="🏷️" label="主辦機構" value={safeText(event.organizer_name) || "主辦資料待確認"} />
              {safeText(event.organizer_phone) ? <InfoTile icon="☎️" label="電話" value={safeText(event.organizer_phone)} /> : null}
              {safeText(event.organizer_email) ? <InfoTile icon="✉️" label="電郵" value={safeText(event.organizer_email)} /> : null}
              {safeText(event.contact_whatsapp) ? <InfoTile icon="💬" label="WhatsApp" value={safeText(event.contact_whatsapp)} /> : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {isValidHttpUrl(event.official_website_url) ? (
                <a
                  href={safeText(event.official_website_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white"
                >
                  官方網站
                </a>
              ) : null}

              {isValidHttpUrl(event.organizer_website) ? (
                <a
                  href={safeText(event.organizer_website)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
                >
                  主辦網站
                </a>
              ) : null}

              {isValidHttpUrl(event.source_url) ? (
                <a
                  href={safeText(event.source_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-purple-200 bg-purple-50 px-5 py-3 text-sm font-black text-purple-700"
                >
                  來源資料
                </a>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="平台免責聲明" icon="🛡️">
            <p className="text-sm leading-7 text-slate-600">
              HK Family Fun 現階段只代為展示活動曝光、搜尋、資料展示及導流服務；
              不代收活動款項，不保證報名、銷售、名額或參加人數結果。
              所有活動資料以主辦方最後公布為準，家長報名前應自行向主辦方確認詳情。
            </p>
          </SectionCard>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <SideCard title="活動資料檢查">
            <CheckRow ok={Boolean(safeText(event.title_tc))} label="活動名稱" />
            <CheckRow ok={Boolean(galleryImages.length)} label={`活動圖片 ${Math.min(galleryImages.length, 5)} / 5`} />
            <CheckRow ok={Boolean(safeText(event.start_date))} label="開始日期" />
            <CheckRow ok={Boolean(safeText(event.venue_name) || safeText(event.address))} label="場地 / 地址" />
            <CheckRow ok={Boolean(priceDisplay || quotaDisplay)} label="收費或名額" />
            <CheckRow ok={Boolean(cta?.label)} label="CTA" />
            <CheckRow ok={Boolean(mapEmbed)} label="Google Map" />
            <CheckRow ok={Boolean(safeText(event.organizer_name))} label="主辦機構" />
          </SideCard>

          <SideCard title="家長會看到的精簡 Card">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="h-32 bg-slate-100">
                <img
                  src={galleryImages[0]}
                  alt={safeText(event.title_tc)}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-2 p-4">
                <h3 className="line-clamp-2 text-base font-black">
                  {safeText(event.title_tc) || "未命名活動"}
                </h3>
                <p className="line-clamp-2 text-xs leading-5 text-slate-500">
                  {safeText(event.short_description_tc) || "未填活動簡介。"}
                </p>
                <div className="text-xs font-bold text-slate-600">{formatDateRange(event)}</div>
                <div className="text-xs font-bold text-slate-600">
                  {[event.district, event.mtr_station].map(safeText).filter(Boolean).join("・") || "地點待確認"}
                </div>
                {priceDisplay ? <div className="text-xs font-black text-purple-700">{priceDisplay}</div> : null}
                {quotaDisplay ? <div className="text-xs font-black text-amber-700">{quotaDisplay}</div> : null}
              </div>
            </div>
          </SideCard>

          <SideCard title="報名 CTA 狀態">
            <PreviewRow label="CTA" value={cta?.label || "未設定"} />
            <PreviewRow label="狀態" value={cta?.clickable ? "可點擊" : "提示狀態"} />
            <PreviewRow label="收費" value={priceDisplay || "不顯示"} />
            <PreviewRow label="名額" value={quotaDisplay || "不顯示"} />
          </SideCard>

          <SideCard title="操作">
            <div className="space-y-3">
              <Link
                href={`/merchant/events/${event.id}/edit`}
                className="block rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-black text-slate-700"
              >
                修改活動資料
              </Link>

              <button
                type="button"
                onClick={submitForReview}
                disabled={submitting}
                className="w-full rounded-2xl bg-purple-700 px-4 py-3 text-sm font-black text-white disabled:bg-slate-300"
              >
                {submitting ? "提交中..." : "提交 HK Family Fun 審批"}
              </button>

              <Link
                href="/merchant/dashboard"
                className="block rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-black text-white"
              >
                返回 Dashboard
              </Link>
            </div>
          </SideCard>
        </aside>
      </section>

      {selectedImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <button
            type="button"
            onClick={() => setSelectedImage("")}
            className="absolute right-5 top-5 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900"
          >
            關閉
          </button>
          <img
            src={selectedImage}
            alt="活動圖片預覽"
            className="max-h-[85vh] max-w-[95vw] rounded-3xl object-contain"
          />
        </div>
      ) : null}
    </main>
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
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black">
        <span>{icon}</span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex gap-3">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="text-xs font-black text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-black leading-6 text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-sm leading-7 text-slate-700">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-purple-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold leading-7 text-slate-500">
      {children}
    </div>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      <span>{label}</span>
      <span>{ok ? "已填" : "待補"}</span>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 p-3 text-sm">
      <span className="font-black text-slate-500">{label}</span>
      <span className="text-right font-black text-slate-900">{value}</span>
    </div>
  );
}