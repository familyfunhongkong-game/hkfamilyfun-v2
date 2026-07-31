"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type PriceMode =
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

type FormState = {
  title_tc: string;
  short_description_tc: string;
  description_tc: string;
  category: string;
  tags: string;

  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  address: string;
  district: string;
  mtr_station: string;
  google_map_url: string;
  map_embed_url: string;
  transportation_notes: string;

  cover_image_url: string;
  gallery_image_1: string;
  gallery_image_2: string;
  gallery_image_3: string;
  gallery_image_4: string;

  price_type: string;
  price_display_mode: PriceMode;
  price_summary: string;
  price_min: string;
  price_max: string;
  original_price: string;
  discount_price: string;
  show_price_on_public: boolean;

  quota_summary: string;
  quota_total: string;
  quota_remaining: string;
  show_quota_on_public: boolean;

  pricing_items_text: string;
  add_on_items_text: string;
  ticketing_notes: string;

  booking_type: BookingType;
  booking_url: string;
  booking_whatsapp: string;
  booking_phone: string;
  booking_email: string;
  booking_message: string;
  cta_label: string;
  registration_deadline: string;
  is_full: boolean;
  is_walk_in: boolean;

  event_highlights: string;
  important_notes: string;

  organizer_name: string;
  organizer_phone: string;
  organizer_email: string;
  organizer_website: string;
  official_website_url: string;
  contact_whatsapp: string;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80";

const emptyForm: FormState = {
  title_tc: "",
  short_description_tc: "",
  description_tc: "",
  category: "親子活動",
  tags: "",

  start_date: "",
  end_date: "",
  start_time: "",
  end_time: "",
  venue_name: "",
  address: "",
  district: "",
  mtr_station: "",
  google_map_url: "",
  map_embed_url: "",
  transportation_notes: "",

  cover_image_url: "",
  gallery_image_1: "",
  gallery_image_2: "",
  gallery_image_3: "",
  gallery_image_4: "",

  price_type: "paid",
  price_display_mode: "fixed",
  price_summary: "",
  price_min: "",
  price_max: "",
  original_price: "",
  discount_price: "",
  show_price_on_public: true,

  quota_summary: "",
  quota_total: "",
  quota_remaining: "",
  show_quota_on_public: false,

  pricing_items_text: "",
  add_on_items_text: "",
  ticketing_notes: "",

  booking_type: "official_page",
  booking_url: "",
  booking_whatsapp: "",
  booking_phone: "",
  booking_email: "",
  booking_message: "",
  cta_label: "",
  registration_deadline: "",
  is_full: false,
  is_walk_in: false,

  event_highlights: "",
  important_notes: "",

  organizer_name: "",
  organizer_phone: "",
  organizer_email: "",
  organizer_website: "",
  official_website_url: "",
  contact_whatsapp: "",
};

const steps = [
  "1. 基本資料",
  "2. 圖片及海報",
  "3. 時間地點",
  "4. 收費名額",
  "5. 報名 CTA",
  "6. 內容提交",
];

const priceModes: { key: PriceMode; title: string; desc: string }[] = [
  {
    key: "free_hidden",
    title: "免費，不顯示價錢",
    desc: "適合只想顯示活動內容，不突出價錢。",
  },
  {
    key: "free_show",
    title: "免費",
    desc: "活動卡及詳情頁會顯示免費。",
  },
  {
    key: "fixed",
    title: "固定價",
    desc: "例如 HK$50，不會顯示「起」。",
  },
  {
    key: "from",
    title: "HK$XX 起",
    desc: "適合多票種、不同渠道、兒童成人不同價。",
  },
  {
    key: "range",
    title: "價錢範圍",
    desc: "例如 HK$50–HK$180。",
  },
  {
    key: "offer",
    title: "優惠 / 早鳥",
    desc: "例如早鳥優惠價 HK$50 (原價 HK$90)。",
  },
  {
    key: "multi_ticket",
    title: "多票種",
    desc: "適合 Klook、Eventbrite、NF Touch 等渠道。",
  },
  {
    key: "quota_only",
    title: "只顯示名額",
    desc: "不顯示價錢，只顯示名額有限。",
  },
];

const bookingTypes: { key: BookingType; title: string; desc: string }[] = [
  {
    key: "official_page",
    title: "查看官方活動頁",
    desc: "導向主辦方活動頁，適合只作官方詳情導流。",
  },
  {
    key: "external_ticketing",
    title: "外部連結報名",
    desc: "Klook / Eventbrite / Ticketing Partner。",
  },
  {
    key: "google_form",
    title: "Google Form",
    desc: "直接填表報名。",
  },
  {
    key: "merchant_website",
    title: "商戶網站",
    desc: "導向商戶網站。",
  },
  {
    key: "whatsapp",
    title: "WhatsApp",
    desc: "家長 WhatsApp 查詢或報名。",
  },
  {
    key: "phone",
    title: "電話",
    desc: "家長致電查詢。",
  },
  {
    key: "email",
    title: "電郵",
    desc: "家長電郵查詢。",
  },
  {
    key: "walk_in",
    title: "無需報名",
    desc: "家長可 walk-in / 即場參加。",
  },
  {
    key: "enquiry_only",
    title: "只作宣傳 / 查詢",
    desc: "不開放即時報名。",
  },
];

function safeText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function splitTextToArray(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinArrayText(value: unknown) {
  if (!value) return "";

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;

        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return [record.label, record.price, record.source, record.note]
            .map(safeText)
            .filter(Boolean)
            .join("｜");
        }

        return safeText(item);
      })
      .filter(Boolean)
      .join("\n");
  }

  return safeText(value);
}

function toNumberOrNull(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getGalleryArray(form: FormState) {
  return [
    form.gallery_image_1,
    form.gallery_image_2,
    form.gallery_image_3,
    form.gallery_image_4,
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function getAllImages(form: FormState) {
  const images = [form.cover_image_url, ...getGalleryArray(form)]
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .slice(0, 5);

  return images.length ? images : [fallbackImage];
}

function getPriceDisplay(form: FormState) {
  if (form.is_full) return "名額已滿";
  if (!form.show_price_on_public) return "";
  if (form.price_display_mode === "free_hidden") return "";
  if (form.price_display_mode === "quota_only") return "";
  if (form.price_display_mode === "free_show") return "免費";

  const min = toNumberOrNull(form.price_min);
  const max = toNumberOrNull(form.price_max);
  const original = toNumberOrNull(form.original_price);
  const discount = toNumberOrNull(form.discount_price);

  if (form.price_display_mode === "fixed") {
    if (min !== null) return `HK$${min}`;
    return "收費待確認";
  }

  if (form.price_display_mode === "offer") {
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

  if (form.price_display_mode === "range") {
    if (min !== null && max !== null && min !== max) return `HK$${min}–HK$${max}`;
    if (min !== null) return `HK$${min}`;
    return "收費待確認";
  }

  if (form.price_display_mode === "from") {
    if (min !== null) return `HK$${min} 起`;
    return "收費待確認";
  }

  if (form.price_display_mode === "multi_ticket") {
    if (min !== null) return `HK$${min} 起`;
    return form.price_summary.trim() || "多票種";
  }

  return form.price_summary.trim() || "收費待確認";
}

function getQuotaDisplay(form: FormState) {
  if (form.is_full) return "名額已滿";

  if (!form.show_quota_on_public && !form.quota_summary.trim()) return "";

  if (form.quota_summary.trim()) return form.quota_summary.trim();

  const total = form.quota_total.trim();
  const remaining = form.quota_remaining.trim();

  if (remaining && total) return `尚餘 ${remaining} / ${total} 個名額`;
  if (remaining) return `尚餘 ${remaining} 個名額`;
  if (total) return `名額共 ${total} 個`;

  return form.show_quota_on_public ? "名額有限" : "";
}

function getCtaDisplay(form: FormState) {
  if (form.is_full) return "名額已滿";
  if (form.is_walk_in || form.booking_type === "walk_in") {
    return form.cta_label.trim() || "無需報名";
  }

  const defaultLabels: Record<BookingType, string> = {
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

  return form.cta_label.trim() || defaultLabels[form.booking_type];
}

function isPriceFieldEnabled(form: FormState, field: string) {
  const mode = form.price_display_mode;

  if (mode === "free_hidden" || mode === "free_show" || mode === "quota_only") {
    return false;
  }

  if (mode === "fixed") {
    return field === "price_min" || field === "price_summary";
  }

  if (mode === "from") {
    return field === "price_min" || field === "price_summary";
  }

  if (mode === "range") {
    return field === "price_min" || field === "price_max" || field === "price_summary";
  }

  if (mode === "offer") {
    return (
      field === "discount_price" ||
      field === "original_price" ||
      field === "price_min" ||
      field === "price_summary" ||
      field === "ticketing_notes"
    );
  }

  if (mode === "multi_ticket") {
    return (
      field === "price_min" ||
      field === "price_max" ||
      field === "price_summary" ||
      field === "pricing_items_text" ||
      field === "add_on_items_text" ||
      field === "ticketing_notes"
    );
  }

  return true;
}

function isBookingFieldEnabled(form: FormState, field: string) {
  const type = form.booking_type;

  if (type === "walk_in" || type === "enquiry_only") {
    return field === "cta_label" || field === "booking_message" || field === "is_walk_in";
  }

  if (type === "whatsapp") {
    return field === "booking_whatsapp" || field === "booking_message" || field === "cta_label";
  }

  if (type === "phone") {
    return field === "booking_phone" || field === "cta_label";
  }

  if (type === "email") {
    return field === "booking_email" || field === "cta_label";
  }

  if (
    type === "google_form" ||
    type === "external_ticketing" ||
    type === "merchant_website" ||
    type === "official_page"
  ) {
    return field === "booking_url" || field === "cta_label" || field === "registration_deadline";
  }

  return true;
}

export default function MerchantEventEditPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = typeof params?.id === "string" ? params.id : "";

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedPreviewImage, setSelectedPreviewImage] = useState("");

  const allImages = useMemo(() => getAllImages(form), [form]);
  const priceDisplay = useMemo(() => getPriceDisplay(form), [form]);
  const quotaDisplay = useMemo(() => getQuotaDisplay(form), [form]);
  const ctaDisplay = useMemo(() => getCtaDisplay(form), [form]);

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
        setLoading(false);
        return;
      }

      const gallery = Array.isArray(data.gallery_image_urls) ? data.gallery_image_urls : [];

      setForm({
        ...emptyForm,
        title_tc: safeText(data.title_tc),
        short_description_tc: safeText(data.short_description_tc),
        description_tc: safeText(data.description_tc),
        category: safeText(data.category) || "親子活動",
        tags: joinArrayText(data.tags),

        start_date: safeText(data.start_date),
        end_date: safeText(data.end_date),
        start_time: safeText(data.start_time),
        end_time: safeText(data.end_time),
        venue_name: safeText(data.venue_name),
        address: safeText(data.address),
        district: safeText(data.district),
        mtr_station: safeText(data.mtr_station),
        google_map_url: safeText(data.google_map_url),
        map_embed_url: safeText(data.map_embed_url),
        transportation_notes: safeText(data.transportation_notes),

        cover_image_url: safeText(data.cover_image_url),
        gallery_image_1: safeText(gallery[0]),
        gallery_image_2: safeText(gallery[1]),
        gallery_image_3: safeText(gallery[2]),
        gallery_image_4: safeText(gallery[3]),

        price_type: safeText(data.price_type) || "paid",
        price_display_mode: (safeText(data.price_display_mode) || "fixed") as PriceMode,
        price_summary: safeText(data.price_summary),
        price_min: safeText(data.price_min),
        price_max: safeText(data.price_max),
        original_price: safeText(data.original_price),
        discount_price: safeText(data.discount_price),
        show_price_on_public: data.show_price_on_public !== false,

        quota_summary: safeText(data.quota_summary),
        quota_total: safeText(data.quota_total),
        quota_remaining: safeText(data.quota_remaining),
        show_quota_on_public: Boolean(data.show_quota_on_public),

        pricing_items_text: joinArrayText(data.pricing_items),
        add_on_items_text: joinArrayText(data.add_on_items),
        ticketing_notes: safeText(data.ticketing_notes),

        booking_type: (safeText(data.booking_type) || "official_page") as BookingType,
        booking_url: safeText(data.booking_url || data.registration_url),
        booking_whatsapp: safeText(data.booking_whatsapp),
        booking_phone: safeText(data.booking_phone),
        booking_email: safeText(data.booking_email),
        booking_message: safeText(data.booking_message),
        cta_label: safeText(data.cta_label),
        registration_deadline: safeText(data.registration_deadline),
        is_full: Boolean(data.is_full),
        is_walk_in: Boolean(data.is_walk_in),

        event_highlights: joinArrayText(data.event_highlights),
        important_notes: joinArrayText(data.important_notes),

        organizer_name: safeText(data.organizer_name),
        organizer_phone: safeText(data.organizer_phone),
        organizer_email: safeText(data.organizer_email),
        organizer_website: safeText(data.organizer_website),
        official_website_url: safeText(data.official_website_url),
        contact_whatsapp: safeText(data.contact_whatsapp),
      });

      setStatus(safeText(data.status) || "draft");
      setLoading(false);
    }

    loadEvent();

    return () => {
      active = false;
    };
  }, [eventId]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function buildPayload(nextStatus?: string) {
    const gallery = getGalleryArray(form);

    return {
      title_tc: form.title_tc.trim(),
      short_description_tc: form.short_description_tc.trim(),
      description_tc: form.description_tc.trim(),
      category: form.category.trim(),
      tags: splitTextToArray(form.tags),

      start_date: form.start_date || null,
      end_date: form.end_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      venue_name: form.venue_name.trim(),
      address: form.address.trim(),
      district: form.district.trim(),
      mtr_station: form.mtr_station.trim(),
      google_map_url: form.google_map_url.trim(),
      map_embed_url: form.map_embed_url.trim(),
      transportation_notes: form.transportation_notes.trim(),

      cover_image_url: form.cover_image_url.trim(),
      gallery_image_urls: gallery,

      price_type:
        form.price_display_mode === "free_hidden" || form.price_display_mode === "free_show"
          ? "free"
          : "paid",
      price_display_mode: form.price_display_mode,
      price_summary: priceDisplay || form.price_summary.trim(),
      price_min: toNumberOrNull(form.price_min),
      price_max: toNumberOrNull(form.price_max),
      original_price: toNumberOrNull(form.original_price),
      discount_price: toNumberOrNull(form.discount_price),
      show_price_on_public: form.show_price_on_public,

      quota_summary: quotaDisplay || form.quota_summary.trim(),
      quota_total: toNumberOrNull(form.quota_total),
      quota_remaining: toNumberOrNull(form.quota_remaining),
      show_quota_on_public: form.show_quota_on_public,

      pricing_items: splitTextToArray(form.pricing_items_text),
      add_on_items: splitTextToArray(form.add_on_items_text),
      ticketing_notes: form.ticketing_notes.trim(),

      booking_type: form.booking_type,
      booking_url: form.booking_url.trim(),
      registration_url: form.booking_url.trim(),
      booking_whatsapp: form.booking_whatsapp.trim(),
      booking_phone: form.booking_phone.trim(),
      booking_email: form.booking_email.trim(),
      booking_message: form.booking_message.trim(),
      cta_label: ctaDisplay,
      registration_deadline: form.registration_deadline || null,
      is_full: form.is_full,
      is_walk_in: form.is_walk_in || form.booking_type === "walk_in",

      event_highlights: splitTextToArray(form.event_highlights),
      important_notes: splitTextToArray(form.important_notes),

      organizer_name: form.organizer_name.trim(),
      organizer_phone: form.organizer_phone.trim(),
      organizer_email: form.organizer_email.trim(),
      organizer_website: form.organizer_website.trim(),
      official_website_url: form.official_website_url.trim(),
      contact_whatsapp: form.contact_whatsapp.trim(),

      status: nextStatus || status || "draft",
    };
  }

  async function saveEvent(nextStatus?: string) {
    setSaving(true);
    setMessage("");
    setErrorMessage("");

    if (!supabase || !eventId) {
      setErrorMessage("Supabase 未連接或活動 ID 不正確。");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("events").update(buildPayload(nextStatus)).eq("id", eventId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    if (nextStatus) setStatus(nextStatus);

    setMessage(nextStatus === "submitted" ? "已提交 HK Family Fun 審批。" : "已儲存草稿。");
    setSaving(false);
  }

  async function saveAndPreview() {
    await saveEvent(status || "draft");
    router.push(`/merchant/events/${eventId}/preview`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-5xl rounded-3xl border bg-white p-8 text-sm font-bold text-slate-600">
          正在載入活動資料...
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
            <h1 className="mt-2 text-3xl font-black">編輯活動資料</h1>
            <p className="mt-2 text-sm text-slate-500">
              分步填寫，右邊即時預覽家長看到的大約效果。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveAndPreview}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
            >
              預覽頁
            </button>
            <button
              type="button"
              onClick={() => saveEvent("draft")}
              disabled={saving}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
            >
              {saving ? "儲存中..." : "儲存草稿"}
            </button>
            <button
              type="button"
              onClick={() => saveEvent("submitted")}
              disabled={saving}
              className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
            >
              提交審批
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {message ? (
          <div className="mb-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="mb-6 flex gap-2 overflow-x-auto rounded-[2rem] border border-slate-200 bg-white p-3">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index + 1)}
              className={`min-w-[130px] rounded-2xl px-4 py-3 text-sm font-black ${
                step === index + 1 ? "bg-purple-700 text-white" : "bg-slate-50 text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            {step === 1 ? (
              <div className="space-y-5">
                <StepTitle title="Step 1：基本資料" desc="先填家長最需要知道的活動名稱、簡介、分類及標籤。" />

                <Input label="活動名稱" required value={form.title_tc} onChange={(value) => updateField("title_tc", value)} />

                <Textarea
                  label="短簡介"
                  value={form.short_description_tc}
                  onChange={(value) => updateField("short_description_tc", value)}
                />

                <Textarea
                  label="詳細介紹"
                  rows={7}
                  value={form.description_tc}
                  onChange={(value) => updateField("description_tc", value)}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="活動分類" value={form.category} onChange={(value) => updateField("category", value)} />
                  <Textarea
                    label="標籤，每行一個"
                    value={form.tags}
                    onChange={(value) => updateField("tags", value)}
                    placeholder={"免費\n室內\n親子\nSEN 友善"}
                  />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <StepTitle
                  title="Step 2：圖片及海報"
                  desc="最多 5 張：封面圖 1 張 + Gallery 4 張。沒有圖片可暫時留空，不會顯示壞圖。"
                />

                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-blue-900">
                  建議：封面圖用最吸引的一張；Gallery 可放 poster、場地相、活動流程圖、過往活動相片。
                </div>

                <Input
                  label="封面圖 URL"
                  value={form.cover_image_url}
                  onChange={(value) => updateField("cover_image_url", value)}
                  placeholder="https://..."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="活動圖片 1 URL" value={form.gallery_image_1} onChange={(value) => updateField("gallery_image_1", value)} />
                  <Input label="活動圖片 2 URL" value={form.gallery_image_2} onChange={(value) => updateField("gallery_image_2", value)} />
                  <Input label="活動圖片 3 URL" value={form.gallery_image_3} onChange={(value) => updateField("gallery_image_3", value)} />
                  <Input label="活動圖片 4 URL" value={form.gallery_image_4} onChange={(value) => updateField("gallery_image_4", value)} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {allImages.map((image, index) => (
                    <button
                      type="button"
                      key={`${image}-${index}`}
                      onClick={() => setSelectedPreviewImage(image)}
                      className={`relative overflow-hidden rounded-3xl border bg-slate-100 ${
                        index === 0 ? "sm:col-span-2 h-64" : "h-40"
                      }`}
                    >
                      <img src={image} alt={`活動圖片 ${index + 1}`} className="h-full w-full object-cover" />
                      <span className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1 text-xs font-black">
                        {index === 0 ? "封面圖" : `活動圖片 ${index + 1}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <StepTitle title="Step 3：時間地點" desc="地點資料會影響搜尋、地圖及附近活動推薦。" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input type="date" label="開始日期" value={form.start_date} onChange={(value) => updateField("start_date", value)} />
                  <Input type="date" label="結束日期" value={form.end_date} onChange={(value) => updateField("end_date", value)} />
                  <Input type="time" label="開始時間" value={form.start_time} onChange={(value) => updateField("start_time", value)} />
                  <Input type="time" label="結束時間" value={form.end_time} onChange={(value) => updateField("end_time", value)} />
                  <Input label="場地名稱" value={form.venue_name} onChange={(value) => updateField("venue_name", value)} />
                  <Input label="詳細地址" value={form.address} onChange={(value) => updateField("address", value)} />
                  <Input label="地區" value={form.district} onChange={(value) => updateField("district", value)} />
                  <Input label="港鐵站" value={form.mtr_station} onChange={(value) => updateField("mtr_station", value)} />
                </div>

                <Textarea label="交通提示" value={form.transportation_notes} onChange={(value) => updateField("transportation_notes", value)} />
                <Input label="Google Map 連結" value={form.google_map_url} onChange={(value) => updateField("google_map_url", value)} />
                <Input label="Google Map Embed URL" value={form.map_embed_url} onChange={(value) => updateField("map_embed_url", value)} />
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-6">
                <StepTitle
                  title="Step 4：收費、優惠、票種及名額"
                  desc="收費和名額分開處理。選了不需要的模式，相關欄位會變灰，減少混亂。"
                />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {priceModes.map((mode) => (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => updateField("price_display_mode", mode.key)}
                      className={`rounded-3xl border p-4 text-left ${
                        form.price_display_mode === mode.key
                          ? "border-purple-500 bg-purple-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <h3 className="font-black">{mode.title}</h3>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{mode.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-blue-900">
                  顯示規則：固定價只顯示 HK$50；優惠會顯示「早鳥優惠價 HK$50 (原價 HK$90)」；
                  只選「HK$XX 起」、「多票種」或「價錢範圍」才會顯示「起」或範圍。
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="公開頁價錢摘要"
                    value={form.price_summary}
                    onChange={(value) => updateField("price_summary", value)}
                    disabled={!isPriceFieldEnabled(form, "price_summary")}
                    placeholder="可留空，由系統自動生成"
                  />
                  <Input
                    label="最低 / 固定收費 HK$"
                    value={form.price_min}
                    onChange={(value) => updateField("price_min", value)}
                    disabled={!isPriceFieldEnabled(form, "price_min")}
                    placeholder="例如 50"
                  />
                  <Input
                    label="最高收費 HK$"
                    value={form.price_max}
                    onChange={(value) => updateField("price_max", value)}
                    disabled={!isPriceFieldEnabled(form, "price_max")}
                    placeholder="只在範圍 / 多票種需要"
                  />
                  <Input
                    label="共用原價 HK$"
                    value={form.original_price}
                    onChange={(value) => updateField("original_price", value)}
                    disabled={!isPriceFieldEnabled(form, "original_price")}
                    placeholder="例如 90"
                  />
                  <Input
                    label="優惠價 HK$"
                    value={form.discount_price}
                    onChange={(value) => updateField("discount_price", value)}
                    disabled={!isPriceFieldEnabled(form, "discount_price")}
                    placeholder="例如 50"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="名額摘要"
                    value={form.quota_summary}
                    onChange={(value) => updateField("quota_summary", value)}
                    placeholder="例如：名額有限，先到先得，額滿即止"
                  />
                  <Input label="總名額" value={form.quota_total} onChange={(value) => updateField("quota_total", value)} />
                  <Input label="剩餘名額" value={form.quota_remaining} onChange={(value) => updateField("quota_remaining", value)} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Checkbox label="公開頁顯示價錢" checked={form.show_price_on_public} onChange={(checked) => updateField("show_price_on_public", checked)} />
                  <Checkbox label="公開頁顯示名額" checked={form.show_quota_on_public} onChange={(checked) => updateField("show_quota_on_public", checked)} />
                  <Checkbox label="名額已滿" checked={form.is_full} onChange={(checked) => updateField("is_full", checked)} />
                </div>

                <Textarea
                  label="票種 / 渠道資料，每行一項"
                  value={form.pricing_items_text}
                  onChange={(value) => updateField("pricing_items_text", value)}
                  disabled={!isPriceFieldEnabled(form, "pricing_items_text")}
                  placeholder={"NF Touch 會員 HK$50｜原價 HK$90\nKlook 早鳥優惠 HK$60｜原價 HK$90"}
                />

                <Textarea
                  label="加購項目，每行一項"
                  value={form.add_on_items_text}
                  onChange={(value) => updateField("add_on_items_text", value)}
                  disabled={!isPriceFieldEnabled(form, "add_on_items_text")}
                />

                <Textarea
                  label="票務 / 收費備註"
                  value={form.ticketing_notes}
                  onChange={(value) => updateField("ticketing_notes", value)}
                  disabled={!isPriceFieldEnabled(form, "ticketing_notes")}
                />
              </div>
            ) : null}

            {step === 5 ? (
              <div className="space-y-6">
                <StepTitle title="Step 5：報名 CTA" desc="不是所有活動都在平台報名，所以 CTA 必須按實際情況顯示。" />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {bookingTypes.map((type) => (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => updateField("booking_type", type.key)}
                      className={`rounded-3xl border p-4 text-left ${
                        form.booking_type === type.key
                          ? "border-purple-500 bg-purple-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <h3 className="font-black">{type.title}</h3>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{type.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
                  只需要填與報名方式相關的欄位。灰色欄位代表目前模式不需要填。
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="報名 / 購票 / 官方連結"
                    value={form.booking_url}
                    onChange={(value) => updateField("booking_url", value)}
                    disabled={!isBookingFieldEnabled(form, "booking_url")}
                  />
                  <Input
                    label="CTA 顯示文字"
                    value={form.cta_label}
                    onChange={(value) => updateField("cta_label", value)}
                    disabled={!isBookingFieldEnabled(form, "cta_label")}
                    placeholder={ctaDisplay}
                  />
                  <Input
                    label="WhatsApp"
                    value={form.booking_whatsapp}
                    onChange={(value) => updateField("booking_whatsapp", value)}
                    disabled={!isBookingFieldEnabled(form, "booking_whatsapp")}
                  />
                  <Input
                    label="電話"
                    value={form.booking_phone}
                    onChange={(value) => updateField("booking_phone", value)}
                    disabled={!isBookingFieldEnabled(form, "booking_phone")}
                  />
                  <Input
                    label="電郵"
                    value={form.booking_email}
                    onChange={(value) => updateField("booking_email", value)}
                    disabled={!isBookingFieldEnabled(form, "booking_email")}
                  />
                  <Input
                    type="date"
                    label="報名截止日期"
                    value={form.registration_deadline}
                    onChange={(value) => updateField("registration_deadline", value)}
                    disabled={!isBookingFieldEnabled(form, "registration_deadline")}
                  />
                </div>

                <Textarea
                  label="WhatsApp / 查詢預設訊息"
                  value={form.booking_message}
                  onChange={(value) => updateField("booking_message", value)}
                  disabled={!isBookingFieldEnabled(form, "booking_message")}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Checkbox label="無需報名 / Walk-in" checked={form.is_walk_in} onChange={(checked) => updateField("is_walk_in", checked)} />
                </div>
              </div>
            ) : null}

            {step === 6 ? (
              <div className="space-y-5">
                <StepTitle title="Step 6：內容細節及提交" desc="最後補充活動亮點、注意事項、主辦機構及聯絡方式。" />

                <Textarea
                  label="活動亮點，每行一點"
                  value={form.event_highlights}
                  onChange={(value) => updateField("event_highlights", value)}
                  placeholder={"親子互動體驗\n適合小朋友打卡\n室內活動，雨天都適合"}
                />

                <Textarea
                  label="注意事項，每行一點"
                  value={form.important_notes}
                  onChange={(value) => updateField("important_notes", value)}
                  placeholder={"活動資料以主辦方公布為準\n名額有限，請預早查詢\n家長需自行確認報名及付款安排"}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="主辦機構" value={form.organizer_name} onChange={(value) => updateField("organizer_name", value)} />
                  <Input label="主辦電話" value={form.organizer_phone} onChange={(value) => updateField("organizer_phone", value)} />
                  <Input label="主辦 Email" value={form.organizer_email} onChange={(value) => updateField("organizer_email", value)} />
                  <Input label="主辦網站" value={form.organizer_website} onChange={(value) => updateField("organizer_website", value)} />
                  <Input label="官方網站" value={form.official_website_url} onChange={(value) => updateField("official_website_url", value)} />
                  <Input label="聯絡 WhatsApp" value={form.contact_whatsapp} onChange={(value) => updateField("contact_whatsapp", value)} />
                </div>
              </div>
            ) : null}

            <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(1, current - 1))}
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
              >
                上一步
              </button>

              <span className="text-sm font-black text-slate-500">Step {step} / 6</span>

              {step < 6 ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.min(6, current + 1))}
                  className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white"
                >
                  下一步
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => saveEvent("draft")}
                  disabled={saving}
                  className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
                >
                  {saving ? "儲存中..." : "儲存草稿"}
                </button>
              )}
            </div>
          </section>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-purple-700">即時預覽</h2>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                  家長看到的大約效果
                </span>
              </div>

              <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200">
                <div className="h-48 bg-slate-100">
                  <img src={allImages[0]} alt="活動主圖" className="h-full w-full object-cover" />
                </div>

                <div className="space-y-3 p-4">
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
                    {form.category || "親子活動"}
                  </span>

                  <h3 className="text-lg font-black leading-tight">{form.title_tc || "未命名活動"}</h3>

                  <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                    {form.short_description_tc || "請填寫短簡介。"}
                  </p>

                  <PreviewLine label="日期" value={`${form.start_date || "日期待確認"} 至 ${form.end_date || form.start_date || "待確認"}`} />
                  <PreviewLine label="地點" value={[form.venue_name, form.district].filter(Boolean).join("・") || "地點待確認"} />
                  {priceDisplay ? <PreviewLine label="收費" value={priceDisplay} /> : null}
                  {quotaDisplay ? <PreviewLine label="名額" value={quotaDisplay} /> : null}
                  <PreviewLine label="報名方式" value={ctaDisplay} />

                  <div className="grid grid-cols-4 gap-2">
                    {allImages.slice(1, 5).map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setSelectedPreviewImage(image)}
                        className="h-16 overflow-hidden rounded-2xl border bg-slate-100"
                      >
                        <img src={image} alt={`Gallery ${index + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>

                  <button type="button" className="w-full rounded-2xl bg-purple-700 px-4 py-3 text-sm font-black text-white">
                    {ctaDisplay}
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">公開頁關鍵資料</h2>
              <div className="mt-4 space-y-3">
                <InfoRow label="圖片" value={`${allImages.length} / 5`} />
                <InfoRow label="價錢" value={priceDisplay || "不顯示"} />
                <InfoRow label="名額" value={quotaDisplay || "不顯示"} />
                <InfoRow label="CTA" value={ctaDisplay} />
                <InfoRow label="地圖" value={form.google_map_url || form.map_embed_url ? "已準備" : "待補"} />
              </div>
            </section>

            <section className="rounded-[2rem] border border-purple-200 bg-purple-50 p-5">
              <h2 className="text-lg font-black text-purple-900">商戶提示</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-purple-900">
                <li>• 封面圖影響活動 card 點擊率。</li>
                <li>• Gallery 建議補 3–5 張，家長會更易理解活動。</li>
                <li>• 固定價不要填最高價，避免變成 HK$50 起或範圍。</li>
                <li>• 名額資料要獨立填，不要放入收費欄。</li>
                <li>• 報名 CTA 要按實際流程選擇。</li>
              </ul>
            </section>
          </aside>
        </div>
      </section>

      {selectedPreviewImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <button
            type="button"
            onClick={() => setSelectedPreviewImage("")}
            className="absolute right-5 top-5 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900"
          >
            關閉
          </button>
          <img
            src={selectedPreviewImage}
            alt="圖片預覽"
            className="max-h-[85vh] max-w-[95vw] rounded-3xl object-contain"
          />
        </div>
      ) : null}
    </main>
  );
}

function StepTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className={`block ${disabled ? "opacity-45" : ""}`}>
      <span className="text-sm font-black text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-purple-500 disabled:bg-slate-100"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <label className={`block ${disabled ? "opacity-45" : ""}`}>
      <span className="text-sm font-black text-slate-700">{label}</span>
      <textarea
        value={value}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold leading-6 outline-none focus:border-purple-500 disabled:bg-slate-100"
      />
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-16 shrink-0 font-black text-slate-500">{label}</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 p-3 text-sm">
      <span className="font-black text-slate-500">{label}</span>
      <span className="text-right font-black text-slate-900">{value}</span>
    </div>
  );
}