"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type BookingType =
  | "whatsapp"
  | "google_form"
  | "merchant_website"
  | "ticketing"
  | "official_page"
  | "phone"
  | "email"
  | "walk_in"
  | "enquiry_only"
  | string;

type PriceDisplayMode =
  | "unknown"
  | "free_no_price"
  | "free_show"
  | "single"
  | "range"
  | "offer"
  | "multi_ticket"
  | "quota_only"
  | string;

type PricingItem = {
  label?: string | null;
  price?: number | string | null;
  original_price?: number | string | null;
  currency?: string | null;
  source?: string | null;
  note?: string | null;
};

type AddOnItem = {
  label?: string | null;
  price?: number | string | null;
  currency?: string | null;
  note?: string | null;
};

type PublicEvent = {
  id: string;

  title_tc?: string | null;
  short_description_tc?: string | null;
  description_tc?: string | null;

  cover_image_url?: string | null;
  gallery_image_urls?: string[] | null;

  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;

  venue_name?: string | null;
  address?: string | null;
  district?: string | null;
  mtr_station?: string | null;

  category?: string | null;
  tags?: string[] | null;
  age_groups?: string[] | null;
  language?: string | null;
  capacity_text?: string | null;
  duration_text?: string | null;

  price_type?: string | null;
  price_display_mode?: PriceDisplayMode | null;
  price_summary?: string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  original_price?: number | string | null;
  discount_price?: number | string | null;
  ticketing_notes?: string | null;
  pricing_items?: PricingItem[] | null;
  add_on_items?: AddOnItem[] | null;
  quota_summary?: string | null;
  quota_total?: number | string | null;
  quota_remaining?: number | string | null;
  show_price_on_public?: boolean | null;
  show_quota_on_public?: boolean | null;

  event_highlights?: string[] | null;
  important_notes?: string[] | null;
  transportation_notes?: string | null;
  google_map_url?: string | null;
  map_embed_url?: string | null;

  organizer_name?: string | null;
  organizer_phone?: string | null;
  organizer_email?: string | null;
  organizer_website?: string | null;
  official_website_url?: string | null;
  contact_whatsapp?: string | null;

  booking_type?: BookingType | null;
  booking_url?: string | null;
  booking_whatsapp?: string | null;
  booking_phone?: string | null;
  booking_email?: string | null;
  booking_message?: string | null;
  cta_label?: string | null;
  registration_deadline?: string | null;
  is_full?: boolean | null;
  is_walk_in?: boolean | null;
  platform_takes_booking?: boolean | null;
  platform_takes_payment?: boolean | null;

  registration_required?: boolean | null;
  registration_url?: string | null;
  source_url?: string | null;

  status?: string | null;
  publish_status?: string | null;
};

type CtaState = {
  label: string;
  href: string;
  enabled: boolean;
  note: string;
  tone: "primary" | "green" | "amber" | "red" | "dark";
};

function safeText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function isHttpUrl(value: unknown) {
  return (
    typeof value === "string" &&
    (value.startsWith("https://") || value.startsWith("http://"))
  );
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function money(value: unknown, currency = "HK$") {
  const parsed = numberValue(value);
  if (parsed === null) return "";
  if (parsed === 0) return "免費";
  return `${currency}${parsed}`;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-HK", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatDateRange(event: PublicEvent) {
  const start = formatDate(event.start_date);
  const end = formatDate(event.end_date);

  if (start && end && event.start_date !== event.end_date) {
    return `${start} 至 ${end}`;
  }

  return start || end || "日期待確認";
}

function formatTime(value?: string | null) {
  if (!value) return "";
  const [hour, minute] = value.split(":");
  if (!hour || !minute) return value;
  return `${hour}:${minute}`;
}

function formatTimeRange(event: PublicEvent) {
  const start = formatTime(event.start_time);
  const end = formatTime(event.end_time);

  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} 開始`;
  if (end) return `${end} 結束`;

  return "時間請參考主辦方公布";
}

function formatList(items?: string[] | null) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => item.trim()).filter(Boolean);
}

function parsePricingItems(value: PublicEvent["pricing_items"]) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object");
}

function parseAddOnItems(value: PublicEvent["add_on_items"]) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object");
}

function isPublished(event: PublicEvent) {
  return event.status === "published" || event.publish_status === "published";
}

function isPastDate(value?: string | null) {
  if (!value) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return false;

  return target < today;
}

function getPriceDisplay(event: PublicEvent) {
  const mode = event.price_display_mode || "unknown";
  const showPrice = event.show_price_on_public !== false;
  const summary = safeText(event.price_summary);
  const pricingItems = parsePricingItems(event.pricing_items);
  const addOnItems = parseAddOnItems(event.add_on_items);

  if (mode === "free_no_price") {
    return {
      visible: false,
      headline: "",
      subline: "",
      modeLabel: "免費活動",
      pricingItems,
      addOnItems,
    };
  }

  if (mode === "quota_only") {
    return {
      visible: false,
      headline: "",
      subline: "",
      modeLabel: "名額活動",
      pricingItems,
      addOnItems,
    };
  }

  if (!showPrice) {
    return {
      visible: false,
      headline: "",
      subline: "",
      modeLabel: "不公開顯示價錢",
      pricingItems,
      addOnItems,
    };
  }

  if (summary) {
    return {
      visible: true,
      headline: summary,
      subline: safeText(event.ticketing_notes),
      modeLabel:
        mode === "offer"
          ? "優惠價"
          : mode === "multi_ticket"
            ? "多票種"
            : mode === "free_show"
              ? "免費"
              : "收費資料",
      pricingItems,
      addOnItems,
    };
  }

  if (mode === "free_show" || event.price_type === "free") {
    return {
      visible: true,
      headline: "免費",
      subline: safeText(event.ticketing_notes),
      modeLabel: "免費活動",
      pricingItems,
      addOnItems,
    };
  }

  const min = numberValue(event.price_min);
  const max = numberValue(event.price_max);
  const discount = numberValue(event.discount_price);
  const original = numberValue(event.original_price);

  if (mode === "offer" && discount !== null && original !== null) {
    return {
      visible: true,
      headline: `優惠 ${money(discount)}，原價 ${money(original)}`,
      subline: safeText(event.ticketing_notes),
      modeLabel: "優惠價",
      pricingItems,
      addOnItems,
    };
  }

  if (min !== null && max !== null && min !== max) {
    return {
      visible: true,
      headline: `${money(min)} - ${money(max)}`,
      subline: safeText(event.ticketing_notes),
      modeLabel: "收費範圍",
      pricingItems,
      addOnItems,
    };
  }

  if (min !== null) {
    return {
      visible: true,
      headline: money(min),
      subline: safeText(event.ticketing_notes),
      modeLabel: "收費",
      pricingItems,
      addOnItems,
    };
  }

  return {
    visible: true,
    headline: "收費請參考主辦方公布",
    subline: safeText(event.ticketing_notes),
    modeLabel: "收費未確認",
    pricingItems,
    addOnItems,
  };
}

function getCtaState(event: PublicEvent): CtaState {
  const bookingType = event.booking_type || "";
  const label = safeText(event.cta_label);

  if (event.end_date && isPastDate(event.end_date)) {
    return {
      label: "活動已完結",
      href: "",
      enabled: false,
      note: "此活動日期已過，資料只供參考。",
      tone: "dark",
    };
  }

  if (event.is_full) {
    return {
      label: "名額已滿",
      href: "",
      enabled: false,
      note: "此活動名額已滿，請向主辦方查詢候補安排。",
      tone: "red",
    };
  }

  if (event.registration_deadline && isPastDate(event.registration_deadline)) {
    return {
      label: "報名已截止",
      href: "",
      enabled: false,
      note: "此活動報名截止日期已過。",
      tone: "dark",
    };
  }

  if (bookingType === "walk_in" || event.is_walk_in) {
    return {
      label: label || "無需報名",
      href: "",
      enabled: false,
      note: "此活動標示為無需報名，建議出發前仍先查閱主辦方最新公布。",
      tone: "green",
    };
  }

  if (bookingType === "enquiry_only") {
    return {
      label: label || "請向主辦查詢",
      href: "",
      enabled: false,
      note: "此活動未有明確報名連結，請使用下方聯絡方式向主辦查詢。",
      tone: "amber",
    };
  }

  if (bookingType === "whatsapp") {
    const phone = safeText(event.booking_whatsapp) || safeText(event.contact_whatsapp);
    const message = encodeURIComponent(
      safeText(event.booking_message) ||
        `你好，我想查詢 ${safeText(event.title_tc, "HK Family Fun 活動")}。`,
    );

    if (!phone) {
      return {
        label: label || "WhatsApp 報名",
        href: "",
        enabled: false,
        note: "主辦方未提供 WhatsApp 電話。",
        tone: "amber",
      };
    }

    return {
      label: label || "WhatsApp 報名",
      href: `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${message}`,
      enabled: true,
      note: "將前往 WhatsApp 與主辦方聯絡。",
      tone: "green",
    };
  }

  if (bookingType === "phone") {
    const phone = safeText(event.booking_phone) || safeText(event.organizer_phone);

    return {
      label: label || "致電報名",
      href: phone ? `tel:${phone}` : "",
      enabled: Boolean(phone),
      note: phone ? "將開啟電話報名。" : "主辦方未提供電話。",
      tone: phone ? "primary" : "amber",
    };
  }

  if (bookingType === "email") {
    const email = safeText(event.booking_email) || safeText(event.organizer_email);
    const subject = encodeURIComponent(
      `查詢活動：${safeText(event.title_tc, "HK Family Fun 活動")}`,
    );

    return {
      label: label || "電郵查詢",
      href: email ? `mailto:${email}?subject=${subject}` : "",
      enabled: Boolean(email),
      note: email ? "將開啟電郵查詢。" : "主辦方未提供電郵。",
      tone: email ? "primary" : "amber",
    };
  }

  const bookingUrl =
    safeText(event.booking_url) ||
    safeText(event.registration_url) ||
    safeText(event.official_website_url) ||
    safeText(event.organizer_website) ||
    safeText(event.source_url);

  if (isHttpUrl(bookingUrl)) {
    const defaultLabel =
      bookingType === "google_form"
        ? "填寫報名表"
        : bookingType === "merchant_website"
          ? "前往商戶網站"
          : bookingType === "ticketing"
            ? "前往購票"
            : bookingType === "official_page"
              ? "查看官方活動頁"
              : event.registration_required
                ? "前往報名"
                : "查看官方活動頁";

    return {
      label: label || defaultLabel,
      href: bookingUrl,
      enabled: true,
      note: "將離開 HK Family Fun，前往主辦方或第三方官方頁面。",
      tone: "primary",
    };
  }

  if (event.registration_required) {
    return {
      label: "請向主辦查詢",
      href: "",
      enabled: false,
      note: "此活動需要報名，但未有提供有效報名連結。",
      tone: "amber",
    };
  }

  return {
    label: "無需報名",
    href: "",
    enabled: false,
    note: "此活動未有提供報名連結，請以主辦方最新公布為準。",
    tone: "green",
  };
}

function ctaClass(tone: CtaState["tone"]) {
  if (tone === "green") return "bg-emerald-600 hover:bg-emerald-700 text-white";
  if (tone === "amber") return "bg-amber-500 text-white";
  if (tone === "red") return "bg-red-600 text-white";
  if (tone === "dark") return "bg-slate-800 text-white";
  return "bg-purple-700 hover:bg-purple-800 text-white";
}

function getExternalWebsiteList(event: PublicEvent) {
  const items = [
    {
      label: "報名 / 購票連結",
      url: safeText(event.booking_url) || safeText(event.registration_url),
    },
    {
      label: "官方活動頁",
      url: safeText(event.official_website_url) || safeText(event.source_url),
    },
    {
      label: "主辦機構網站",
      url: safeText(event.organizer_website),
    },
  ];

  const seen = new Set<string>();

  return items.filter((item) => {
    if (!isHttpUrl(item.url)) return false;
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

export default function PublicEventDetailPage() {
  const params = useParams();
  const eventId = typeof params?.id === "string" ? params.id : "";

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEvent() {
      setLoading(true);
      setLoadError("");

      if (!eventId) {
        setLoadError("找不到活動 ID。");
        setLoading(false);
        return;
      }

      if (!supabase) {
        setLoadError("Supabase 未連接，暫時未能載入活動。");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setLoadError(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setLoadError("找不到此活動。");
        setLoading(false);
        return;
      }

      const loadedEvent = data as PublicEvent;

      if (!isPublished(loadedEvent)) {
        setLoadError("此活動尚未公開或已封存。");
        setLoading(false);
        return;
      }

      setEvent(loadedEvent);
      setLoading(false);
    }

    loadEvent();

    return () => {
      active = false;
    };
  }, [eventId]);

  const cta = useMemo(() => (event ? getCtaState(event) : null), [event]);
  const priceDisplay = useMemo(
    () => (event ? getPriceDisplay(event) : null),
    [event],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-slate-500">正在載入活動資料...</p>
        </div>
      </main>
    );
  }

  if (loadError || !event || !cta || !priceDisplay) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-black text-purple-700">HK Family Fun</p>
          <h1 className="mt-3 text-2xl font-black text-slate-950">
            暫時未能顯示活動
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {loadError || "活動資料不存在。"}
          </p>
          <Link
            href="/events"
            className="mt-6 inline-flex rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800"
          >
            返回活動列表
          </Link>
        </div>
      </main>
    );
  }

  const tags = formatList(event.tags);
  const ageGroups = formatList(event.age_groups);
  const highlights = formatList(event.event_highlights);
  const notes = formatList(event.important_notes);
  const websites = getExternalWebsiteList(event);

  return (
    <main className="min-h-screen bg-slate-50 pb-28 text-slate-950">
      <section className="bg-gradient-to-b from-white via-purple-50/30 to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <div className="flex flex-wrap gap-2">
                {event.category ? <Pill>{event.category}</Pill> : null}
                {event.district ? <Pill>{event.district}</Pill> : null}
                {priceDisplay.visible && priceDisplay.headline ? (
                  <Pill>{priceDisplay.modeLabel}</Pill>
                ) : null}
              </div>

              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight md:text-5xl">
                {safeText(event.title_tc, "未命名活動")}
              </h1>

              {event.short_description_tc ? (
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                  {event.short_description_tc}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                {cta.enabled ? (
                  <a
                    href={cta.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`rounded-full px-6 py-3 text-sm font-black shadow-sm ${ctaClass(cta.tone)}`}
                  >
                    {cta.label}
                  </a>
                ) : (
                  <span
                    className={`rounded-full px-6 py-3 text-sm font-black shadow-sm ${ctaClass(cta.tone)}`}
                  >
                    {cta.label}
                  </span>
                )}

                <Link
                  href="/events"
                  className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
                >
                  返回活動列表
                </Link>

                <Link
                  href="/events/map"
                  className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                >
                  附近活動地圖
                </Link>
              </div>

              <p className="mt-3 text-xs leading-6 text-slate-500">{cta.note}</p>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              {event.cover_image_url ? (
                <img
                  src={event.cover_image_url}
                  alt={safeText(event.title_tc, "活動圖片")}
                  className="h-80 w-full object-cover"
                />
              ) : (
                <div className="flex h-80 w-full items-center justify-center bg-gradient-to-br from-purple-100 via-pink-50 to-cyan-100">
                  <div className="text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-3xl shadow-sm">
                      親
                    </div>
                    <p className="mt-4 text-sm font-black text-slate-600">
                      HK Family Fun 活動圖片
                    </p>
                  </div>
                </div>
              )}

              <div className="p-5">
                <p className="text-xs font-black text-purple-700">活動重點</p>
                <div className="mt-3 grid gap-3">
                  <MiniFact label="日期" value={formatDateRange(event)} />
                  <MiniFact label="時間" value={formatTimeRange(event)} />
                  <MiniFact
                    label="地點"
                    value={
                      safeText(event.venue_name) ||
                      safeText(event.address) ||
                      "地點待確認"
                    }
                  />
                  {priceDisplay.visible ? (
                    <MiniFact label="收費" value={priceDisplay.headline} />
                  ) : null}
                  {event.show_quota_on_public && event.quota_summary ? (
                    <MiniFact label="名額" value={event.quota_summary} />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-6">
          <Card title="活動詳情">
            {event.description_tc ? (
              <p className="whitespace-pre-line text-sm leading-8 text-slate-700">
                {event.description_tc}
              </p>
            ) : (
              <p className="text-sm leading-8 text-slate-500">
                主辦方暫未提供詳細介紹，請查看官方活動頁。
              </p>
            )}
          </Card>

          {highlights.length > 0 ? (
            <Card title="活動亮點">
              <div className="grid gap-3 md:grid-cols-2">
                {highlights.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold leading-7 text-emerald-900"
                  >
                    ✓ {item}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card title="收費、優惠及票務">
            {priceDisplay.visible ? (
              <div className="rounded-3xl border border-purple-100 bg-purple-50 p-5">
                <p className="text-xs font-black text-purple-700">
                  {priceDisplay.modeLabel}
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {priceDisplay.headline}
                </p>
                {priceDisplay.subline ? (
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {priceDisplay.subline}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-bold leading-7 text-slate-600">
                  {event.price_display_mode === "quota_only"
                    ? "此活動主要以名額安排為準，公開頁不顯示價錢。"
                    : "此活動不公開顯示價錢，請參考主辦方最新公布。"}
                </p>
              </div>
            )}

            {priceDisplay.pricingItems.length > 0 ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {priceDisplay.pricingItems.map((item, index) => {
                  const itemPrice = money(item.price);
                  const original = money(item.original_price);
                  const source = safeText(item.source);
                  const note = safeText(item.note);

                  return (
                    <div
                      key={`${safeText(item.label, "ticket")}-${index}`}
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <p className="text-sm font-black text-slate-950">
                        {safeText(item.label, `票種 ${index + 1}`)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-end gap-2">
                        {itemPrice ? (
                          <span className="text-2xl font-black text-purple-700">
                            {itemPrice}
                          </span>
                        ) : null}
                        {original && original !== itemPrice ? (
                          <span className="text-sm font-bold text-slate-400 line-through">
                            原價 {original}
                          </span>
                        ) : null}
                      </div>
                      {source ? (
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          渠道：{source}
                        </p>
                      ) : null}
                      {note ? (
                        <p className="mt-2 text-xs leading-6 text-slate-500">
                          {note}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {priceDisplay.addOnItems.length > 0 ? (
              <div className="mt-6">
                <p className="text-sm font-black text-slate-950">加購項目</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {priceDisplay.addOnItems.map((item, index) => (
                    <div
                      key={`${safeText(item.label, "addon")}-${index}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="text-sm font-black text-slate-900">
                        {safeText(item.label, `加購 ${index + 1}`)}
                      </p>
                      {money(item.price) ? (
                        <p className="mt-1 text-lg font-black text-slate-950">
                          {money(item.price)}
                        </p>
                      ) : null}
                      {item.note ? (
                        <p className="mt-1 text-xs leading-6 text-slate-500">
                          {item.note}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          {(event.show_quota_on_public || event.quota_summary) ? (
            <Card title="名額資料">
              <div className="grid gap-3 md:grid-cols-3">
                <InfoBox
                  label="名額摘要"
                  value={safeText(event.quota_summary, "名額請參考主辦方公布")}
                />
                <InfoBox
                  label="總名額"
                  value={
                    event.quota_total !== null && event.quota_total !== undefined
                      ? String(event.quota_total)
                      : "未提供"
                  }
                />
                <InfoBox
                  label="剩餘名額"
                  value={
                    event.quota_remaining !== null &&
                    event.quota_remaining !== undefined
                      ? String(event.quota_remaining)
                      : "未提供"
                  }
                />
              </div>
            </Card>
          ) : null}

          <Card title="交通及地圖">
            <div className="space-y-4">
              {event.transportation_notes ? (
                <p className="whitespace-pre-line text-sm leading-8 text-slate-700">
                  {event.transportation_notes}
                </p>
              ) : (
                <p className="text-sm leading-8 text-slate-500">
                  請出發前查看主辦方或 Google Map 最新交通資訊。
                </p>
              )}

              {event.map_embed_url && isHttpUrl(event.map_embed_url) ? (
                <div className="overflow-hidden rounded-3xl border border-slate-200">
                  <iframe
                    src={event.map_embed_url}
                    title="活動地圖"
                    className="h-72 w-full"
                    loading="lazy"
                  />
                </div>
              ) : null}

              {event.google_map_url && isHttpUrl(event.google_map_url) ? (
                <a
                  href={event.google_map_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                >
                  打開 Google Map
                </a>
              ) : null}
            </div>
          </Card>

          {notes.length > 0 ? (
            <Card title="注意事項">
              <ul className="space-y-3">
                {notes.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-900"
                  >
                    • {item}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card title="平台聲明">
            <p className="text-sm leading-8 text-slate-600">
              HK Family Fun 現階段只提供活動曝光、搜尋、資料展示及官方報名導流服務。
              平台不代收活動款項，不保證報名、銷售、名額或參加人數結果。
              所有活動資料、收費、名額、時間及條款，請以主辦方最新公布為準。
            </p>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card title="活動資料">
            <div className="space-y-3">
              <InfoBox label="日期" value={formatDateRange(event)} />
              <InfoBox label="時間" value={formatTimeRange(event)} />
              <InfoBox
                label="地點"
                value={safeText(event.venue_name, "地點待確認")}
              />
              <InfoBox
                label="地址"
                value={safeText(event.address, "詳細地址待確認")}
              />
              <InfoBox
                label="地區 / 港鐵"
                value={`${safeText(event.district, "地區待確認")} ${
                  event.mtr_station ? `｜${event.mtr_station}` : ""
                }`}
              />
              {event.language ? <InfoBox label="語言" value={event.language} /> : null}
              {event.duration_text ? (
                <InfoBox label="活動時長" value={event.duration_text} />
              ) : null}
              {event.capacity_text ? (
                <InfoBox label="名額 / 對象" value={event.capacity_text} />
              ) : null}
            </div>
          </Card>

          <Card title="報名方式">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-lg font-black text-slate-950">{cta.label}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{cta.note}</p>

              {cta.enabled ? (
                <a
                  href={cta.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`mt-4 inline-flex w-full justify-center rounded-2xl px-5 py-3 text-sm font-black ${ctaClass(cta.tone)}`}
                >
                  {cta.label}
                </a>
              ) : (
                <span
                  className={`mt-4 inline-flex w-full justify-center rounded-2xl px-5 py-3 text-sm font-black ${ctaClass(cta.tone)}`}
                >
                  {cta.label}
                </span>
              )}
            </div>
          </Card>

          <Card title="主辦機構">
            <div className="space-y-3">
              <InfoBox
                label="主辦機構"
                value={safeText(event.organizer_name, "主辦機構待確認")}
              />
              {event.organizer_phone ? (
                <ContactLine label="電話" value={event.organizer_phone} href={`tel:${event.organizer_phone}`} />
              ) : null}
              {event.organizer_email ? (
                <ContactLine label="電郵" value={event.organizer_email} href={`mailto:${event.organizer_email}`} />
              ) : null}
              {event.contact_whatsapp ? (
                <ContactLine
                  label="WhatsApp"
                  value={event.contact_whatsapp}
                  href={`https://wa.me/${event.contact_whatsapp.replace(/[^\d]/g, "")}`}
                />
              ) : null}
            </div>
          </Card>

          {websites.length > 0 ? (
            <Card title="官方連結">
              <div className="space-y-3">
                {websites.map((item) => (
                  <a
                    key={`${item.label}-${item.url}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-purple-700 hover:border-purple-300 hover:bg-purple-50"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </Card>
          ) : null}

          {(tags.length > 0 || ageGroups.length > 0) ? (
            <Card title="標籤">
              <div className="flex flex-wrap gap-2">
                {[...ageGroups, ...tags].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </Card>
          ) : null}
        </aside>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="line-clamp-1 text-sm font-black text-slate-950">
              {safeText(event.title_tc, "HK Family Fun 活動")}
            </p>
            <p className="text-xs text-slate-500">
              {formatDateRange(event)}
              {priceDisplay.visible && priceDisplay.headline
                ? `｜${priceDisplay.headline}`
                : ""}
            </p>
          </div>

          {cta.enabled ? (
            <a
              href={cta.href}
              target="_blank"
              rel="noreferrer"
              className={`rounded-full px-6 py-3 text-sm font-black ${ctaClass(cta.tone)}`}
            >
              {cta.label}
            </a>
          ) : (
            <span
              className={`rounded-full px-6 py-3 text-sm font-black ${ctaClass(cta.tone)}`}
            >
              {cta.label}
            </span>
          )}
        </div>
      </div>
    </main>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black text-purple-700">{label}</p>
      <p className="mt-1 text-sm font-bold leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black leading-6 text-slate-900">{value}</p>
    </div>
  );
}

function ContactLine({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-purple-300 hover:bg-purple-50"
    >
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm font-black text-purple-700">
        {value}
      </p>
    </a>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
      {children}
    </span>
  );
}