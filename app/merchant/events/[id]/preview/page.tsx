"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type EventRecord = {
  id: string;
  title?: string | null;
  title_tc?: string | null;
  short_description_tc?: string | null;
  description_tc?: string | null;
  highlights?: string | null;
  terms?: string | null;
  remarks?: string | null;
  tags?: string | null;
  category?: unknown;
  activity_category?: string | null;

  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;

  venue_name?: string | null;
  address?: string | null;
  area?: string | null;
  district?: string | null;
  mtr_station?: string | null;
  google_map_url?: string | null;
  google_map_embed_url?: string | null;

  price_display_mode?: string | null;
  price_label?: string | null;
  min_price?: string | number | null;
  max_price?: string | number | null;
  original_price?: string | number | null;
  offer_price?: string | number | null;
  quota_label?: string | null;

  cta_type?: string | null;
  cta_label?: string | null;
  registration_url?: string | null;
  booking_url?: string | null;
  official_url?: string | null;
  source_url?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  whatsapp?: string | null;

  cover_image_url?: string | null;
  gallery_image_urls?: unknown;

  organizer_name?: string | null;
  merchant_name?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

type ReadinessItem = {
  key: string;
  label: string;
  done: boolean;
};

function safeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;

  if (Array.isArray(value)) {
    const joined = value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join(", ");
    return joined || fallback;
  }

  const text = String(value).trim();
  return text.length ? text : fallback;
}

function splitLines(value: unknown) {
  return safeText(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getGalleryArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
      }
    } catch {
      return text
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function uniqueImages(images: string[]) {
  return Array.from(new Set(images.map((item) => item.trim()).filter(Boolean))).slice(0, 5);
}

function getAllImages(event: EventRecord) {
  return uniqueImages([
    safeText(event.cover_image_url),
    ...getGalleryArray(event.gallery_image_urls),
  ]);
}

function getHeroImage(event: EventRecord) {
  return safeText(event.cover_image_url) || getAllImages(event)[0] || "";
}

function getTitle(event: EventRecord) {
  return safeText(event.title_tc || event.title, "未命名活動");
}

function getActivityCategory(event: EventRecord) {
  const direct = safeText(event.activity_category);
  if (direct) return direct;

  const legacy = event.category;
  if (Array.isArray(legacy)) return safeText(legacy[0], "親子活動");

  return safeText(legacy, "親子活動");
}

function formatDate(value?: string | null) {
  const text = safeText(value);
  if (!text) return "";
  return text.slice(0, 10);
}

function formatDateRange(event: EventRecord) {
  const start = formatDate(event.start_date);
  const end = formatDate(event.end_date);

  if (start && end && start !== end) return `${start} 至 ${end}`;
  if (start) return start;
  if (end) return end;
  return "日期待確認";
}

function formatTimeRange(event: EventRecord) {
  const start = safeText(event.start_time).slice(0, 5);
  const end = safeText(event.end_time).slice(0, 5);

  if (start && end) return `${start}–${end}`;
  if (start) return `${start} 開始`;
  return "時間待確認";
}

function formatPrice(event: EventRecord) {
  const mode = safeText(event.price_display_mode, "unknown");
  const label = safeText(event.price_label);
  const min = safeText(event.min_price);
  const max = safeText(event.max_price);
  const original = safeText(event.original_price);
  const offer = safeText(event.offer_price);
  const quota = safeText(event.quota_label);

  if (mode === "hidden") return "不顯示價錢";
  if (mode === "free") return "免費";
  if (mode === "quota") return quota || "名額有限，詳情請向主辦查詢";

  if (mode === "early_bird") {
    if (offer && original) return `早鳥優惠價 HK$${offer}（原價 HK$${original}）`;
    if (offer) return `早鳥優惠價 HK$${offer}`;
    return label || "早鳥優惠價待確認";
  }

  if (mode === "fixed") {
    if (min) return `HK$${min}`;
    return label || "固定收費待確認";
  }

  if (mode === "range") {
    if (min && max && min !== max) return `HK$${min}–HK$${max}`;
    if (min) return `HK$${min}`;
    return label || "價錢範圍待確認";
  }

  if (mode === "from") {
    if (min) return `HK$${min} 起`;
    return label || "HK$XX 起";
  }

  return label || "收費待確認";
}

function getCtaLabel(event: EventRecord) {
  const label = safeText(event.cta_label);
  if (label) return label;

  const type = safeText(event.cta_type, "official");

  if (type === "external") return "前往報名";
  if (type === "google_form") return "Google Form 報名";
  if (type === "whatsapp") return "WhatsApp 報名";
  if (type === "contact") return "請向主辦查詢";
  if (type === "none") return "無需報名";
  return "查看官方活動頁";
}

function getCtaUrl(event: EventRecord) {
  const type = safeText(event.cta_type, "official");

  if (type === "whatsapp") return safeText(event.whatsapp);
  if (type === "google_form") return safeText(event.registration_url || event.booking_url);
  if (type === "external") return safeText(event.registration_url || event.booking_url);
  if (type === "official") return safeText(event.official_url || event.source_url);
  return "";
}

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function statusLabel(status?: string | null) {
  const value = safeText(status, "draft").toLowerCase();

  if (["submitted", "pending", "review", "pending_review"].includes(value)) return "審批中";
  if (["published", "approved", "live"].includes(value)) return "已發布";
  if (["rejected", "declined"].includes(value)) return "已拒絕";
  if (["archived", "hidden", "offline"].includes(value)) return "已封存";
  return "草稿";
}

function getReadiness(event: EventRecord): ReadinessItem[] {
  const images = getAllImages(event);
  const ctaUrl = getCtaUrl(event);
  const ctaType = safeText(event.cta_type, "official");

  return [
    { key: "title", label: "活動名稱", done: !!safeText(event.title_tc || event.title) },
    { key: "date", label: "日期", done: !!safeText(event.start_date) },
    { key: "location", label: "地點", done: !!safeText(event.venue_name || event.address) },
    { key: "price", label: "收費", done: formatPrice(event) !== "收費待確認" },
    {
      key: "cta",
      label: "CTA",
      done: ctaType === "none" || ctaType === "contact" || isExternalUrl(ctaUrl),
    },
    { key: "images", label: `圖片 ${images.length} / 5`, done: images.length > 0 },
    {
      key: "map",
      label: "Google Map",
      done: !!safeText(event.google_map_url || event.google_map_embed_url),
    },
  ];
}

function readinessScore(items: ReadinessItem[]) {
  if (!items.length) return 0;
  return Math.round((items.filter((item) => item.done).length / items.length) * 100);
}

function getGoogleMapEmbed(event: EventRecord) {
  const embed = safeText(event.google_map_embed_url);
  if (embed) return embed;

  const mapUrl = safeText(event.google_map_url);
  if (mapUrl && mapUrl.includes("google.com/maps")) return mapUrl;

  return "";
}

function getImageFrameClass(mode: "hero" | "gallery" | "side" = "gallery") {
  if (mode === "hero") {
    return "flex min-h-[420px] w-full items-center justify-center bg-gradient-to-br from-slate-100 via-white to-purple-50 p-4";
  }

  if (mode === "side") {
    return "flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-slate-100 via-white to-purple-50 p-3";
  }

  return "flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-slate-100 via-white to-purple-50 p-3";
}

function getImageClass(mode: "hero" | "gallery" | "side" = "gallery") {
  if (mode === "hero") {
    return "max-h-[620px] max-w-full rounded-2xl object-contain shadow-sm";
  }

  return "max-h-full max-w-full rounded-2xl object-contain";
}

export default function MerchantEventPreviewPage() {
  const params = useParams();
  const eventId = String(params?.id || "");

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const images = useMemo(() => (event ? getAllImages(event) : []), [event]);
  const heroImage = useMemo(() => {
    if (selectedImage) return selectedImage;
    if (!event) return "";
    return getHeroImage(event);
  }, [event, selectedImage]);

  const readiness = useMemo(() => (event ? getReadiness(event) : []), [event]);
  const score = readinessScore(readiness);
  const missing = readiness.filter((item) => !item.done).map((item) => item.label);

  async function loadEvent() {
    const client = supabase;

    setLoading(true);
    setMessage("");

    if (!client) {
      setMessage("Supabase client 未能初始化。");
      setLoading(false);
      return;
    }

    if (!eventId) {
      setMessage("找不到活動 ID。");
      setLoading(false);
      return;
    }

    const { data, error } = await client
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();

    if (error) {
      setMessage(`讀取活動失敗：${error.message}`);
      setLoading(false);
      return;
    }

    if (!data) {
      setMessage("找不到活動。");
      setLoading(false);
      return;
    }

    const currentEvent = data as EventRecord;
    const currentImages = getAllImages(currentEvent);

    setEvent(currentEvent);
    setSelectedImage(currentImages[0] || "");
    setLoading(false);
  }

  async function submitForReview() {
    const client = supabase;

    if (!client || !event) return;

    if (missing.length) {
      setMessage(`提交前請先補齊：${missing.join("、")}。`);
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { data, error } = await client
      .from("events")
      .update({
        status: "submitted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id)
      .select("*")
      .maybeSingle();

    if (error) {
      setMessage(`提交失敗：${error.message}`);
      setSubmitting(false);
      return;
    }

    if (data) {
      setEvent(data as EventRecord);
    }

    setMessage("已提交 HK Family Fun 審批。");
    setSubmitting(false);
  }

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1500px] px-4 py-16">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-50 text-3xl">
              親
            </div>
            <p className="font-black text-slate-700">正在讀取 Preview...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
            <h1 className="text-2xl font-black text-slate-950">找不到活動</h1>
            <p className="mt-3 text-sm leading-6 text-amber-800">
              {message || "請返回 Dashboard 重新選擇活動。"}
            </p>
            <Link
              href="/merchant/dashboard"
              className="mt-6 inline-flex rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white"
            >
              返回 Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const ctaLabel = getCtaLabel(event);
  const ctaUrl = getCtaUrl(event);
  const mapEmbed = getGoogleMapEmbed(event);
  const highlights = splitLines(event.highlights);
  const terms = splitLines(event.terms);
  const tags = splitLines(event.tags).length
    ? splitLines(event.tags)
    : safeText(event.tags)
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/merchant/dashboard"
                className="text-sm font-black text-purple-700 hover:text-purple-900"
              >
                ← 返回 Merchant Dashboard
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight text-slate-950">
                  活動提交前預覽
                </h1>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  {statusLabel(event.status)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                這裡會即時讀取已儲存的圖片、5 張 Gallery、收費、CTA 及 Google Map。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadEvent}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                重新讀取
              </button>
              <Link
                href={`/merchant/events/${event.id}/edit`}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                返回編輯
              </Link>
              <button
                type="button"
                onClick={submitForReview}
                disabled={submitting || missing.length > 0}
                className="rounded-full bg-purple-700 px-5 py-2 text-sm font-black text-white hover:bg-purple-800 disabled:bg-slate-300"
              >
                {submitting ? "提交中..." : "提交 HK Family Fun 審批"}
              </button>
            </div>
          </div>

          {message ? (
            <div
              className={[
                "mt-5 rounded-2xl border px-4 py-3 text-sm font-bold",
                message.includes("失敗") || message.includes("補齊")
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800",
              ].join(" ")}
            >
              {message}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 xl:grid-cols-[1fr_390px]">
        <div className="space-y-6">
          <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-100">
              {heroImage ? (
                <div className={getImageFrameClass("hero")}>
                  <img
                    src={heroImage}
                    alt={getTitle(event)}
                    className={getImageClass("hero")}
                  />
                </div>
              ) : (
                <div className="flex min-h-[420px] items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 text-6xl">
                  親
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
                  {getActivityCategory(event)}
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  {statusLabel(event.status)}
                </span>
              </div>

              <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950">
                {getTitle(event)}
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                {safeText(
                  event.short_description_tc || event.description_tc,
                  "活動簡介尚未填寫。"
                )}
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <InfoCard label="日期" value={formatDateRange(event)} icon="🗓️" />
                <InfoCard label="時間" value={formatTimeRange(event)} icon="⏰" />
                <InfoCard
                  label="地點"
                  value={safeText(event.venue_name || event.address, "地點待確認")}
                  icon="📍"
                />
                <InfoCard label="收費" value={formatPrice(event)} icon="🎟️" />
              </div>

              {tags.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {tags.slice(0, 10).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-6">
                {isExternalUrl(ctaUrl) ? (
                  <a
                    href={ctaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-purple-700 px-5 py-4 text-sm font-black text-white hover:bg-purple-800 md:w-auto"
                  >
                    {ctaLabel}
                  </a>
                ) : (
                  <div className="rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-600">
                    {ctaLabel}
                  </div>
                )}
              </div>
            </div>
          </article>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-950">活動圖片 Gallery</h2>
                <p className="mt-1 text-sm text-slate-500">
                  已讀取 {images.length} 張圖片。點擊圖片可切換上方主圖。
                </p>
              </div>
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
                {images.length} / 5
              </span>
            </div>

            {images.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={[
                      "overflow-hidden rounded-3xl border bg-white text-left transition",
                      selectedImage === image
                        ? "border-purple-500 ring-4 ring-purple-100"
                        : "border-slate-200 hover:border-purple-300",
                    ].join(" ")}
                  >
                    <div className={getImageFrameClass("gallery")}>
                      <img
                        src={image}
                        alt={`Gallery 圖片 ${index + 1}`}
                        className={getImageClass("gallery")}
                      />
                    </div>
                    <div className="border-t border-slate-100 px-3 py-2 text-xs font-black text-slate-500">
                      圖片 {index + 1}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                暫時沒有 Gallery 圖片。請返回編輯頁 Step 3 上載圖片並等候 Auto Save 成功。
              </div>
            )}
          </section>

          <ContentSection title="活動亮點" icon="✨" lines={highlights} fallback="活動亮點尚未填寫。" />

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">活動詳情</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
              {safeText(event.description_tc, "詳細介紹尚未填寫。")}
            </p>
          </section>

          <ContentSection title="注意事項" icon="⚠️" lines={terms} fallback="注意事項尚未填寫。" />

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">交通及地圖</h2>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p>
                <span className="font-black text-slate-500">場地：</span>
                {safeText(event.venue_name, "未填")}
              </p>
              <p>
                <span className="font-black text-slate-500">地址：</span>
                {safeText(event.address, "未填")}
              </p>
              <p>
                <span className="font-black text-slate-500">港鐵站：</span>
                {safeText(event.mtr_station, "未填")}
              </p>
            </div>

            {mapEmbed ? (
              <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                <iframe
                  src={mapEmbed}
                  className="h-[320px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
                Google Map 尚未設定。
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">主辦機構及聯絡方式</h2>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InfoCard
                label="主辦方"
                value={safeText(event.organizer_name || event.merchant_name, "未填")}
                icon="🏢"
              />
              <InfoCard label="電話" value={safeText(event.contact_phone, "未填")} icon="☎️" />
              <InfoCard label="Email" value={safeText(event.contact_email, "未填")} icon="✉️" />
              <InfoCard label="WhatsApp" value={safeText(event.whatsapp, "未填")} icon="💬" />
            </div>
          </section>

          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-sm leading-7 text-blue-900">
            <h2 className="text-lg font-black">平台免責聲明</h2>
            <p className="mt-2">
              HK Family Fun 只作活動資訊展示及整理，實際日期、時間、名額、收費及安排以主辦方公布為準。
              家長報名前應自行核對主辦方官方資料。
            </p>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">提交前檢查</h2>
              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-black",
                  score >= 80
                    ? "bg-emerald-50 text-emerald-700"
                    : score >= 60
                    ? "bg-amber-50 text-amber-700"
                    : "bg-rose-50 text-rose-700",
                ].join(" ")}
              >
                {score}%
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {readiness.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                >
                  <span className="font-black text-slate-600">{item.label}</span>
                  <span
                    className={[
                      "font-black",
                      item.done ? "text-emerald-700" : "text-rose-700",
                    ].join(" ")}
                  >
                    {item.done ? "已完成" : "未完成"}
                  </span>
                </div>
              ))}
            </div>

            {missing.length ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                <p className="font-black">提交前要補齊：</p>
                <p>{missing.join("、")}</p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                主要資料已齊，可以提交審批。
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-50 p-3">
              {heroImage ? (
                <div className={getImageFrameClass("side")}>
                  <img
                    src={heroImage}
                    alt={getTitle(event)}
                    className={getImageClass("side")}
                  />
                </div>
              ) : null}
            </div>
            <div className="p-4">
              <p className="text-xs font-black text-purple-700">家長看到的活動 Card</p>
              <h3 className="mt-2 line-clamp-2 text-base font-black text-slate-950">
                {getTitle(event)}
              </h3>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
                {safeText(event.short_description_tc || event.description_tc)}
              </p>
              <p className="mt-3 text-xs font-black text-slate-700">{formatPrice(event)}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-purple-200 bg-purple-50 p-5 text-sm leading-6 text-purple-900">
            <p className="font-black">圖片顯示設計</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>主圖使用大尺寸顯示，方便看清活動海報。</li>
              <li>Gallery 使用 2-column 大圖，不再壓成細 thumbnail。</li>
              <li>圖片使用 object-contain，不會裁走海報文字。</li>
              <li>點擊 Gallery 圖片可切換上方主圖。</li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-lg shadow-sm">
          {icon}
        </div>
        <div>
          <p className="text-xs font-black text-slate-400">{label}</p>
          <p className="mt-1 text-sm font-black leading-5 text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ContentSection({
  title,
  icon,
  lines,
  fallback,
}: {
  title: string;
  icon: string;
  lines: string[];
  fallback: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">
        {icon} {title}
      </h2>

      {lines.length ? (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
          {lines.map((line, index) => (
            <li key={`${line}-${index}`}>{line}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-500">
          {fallback}
        </div>
      )}
    </section>
  );
}