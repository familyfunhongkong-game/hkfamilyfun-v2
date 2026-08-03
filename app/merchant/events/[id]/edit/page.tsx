"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type EventRecord = Record<string, unknown> & { id: string };
type MerchantRecord = Record<string, unknown> & { id: string };

type FormState = {
  title_tc: string;
  short_description_tc: string;
  description_tc: string;
  activity_category: string;
  highlights: string;
  terms: string;
  remarks: string;
  tags: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  address: string;
  area: string;
  district: string;
  mtr_station: string;
  google_map_url: string;
  google_map_embed_url: string;
  price_display_mode: string;
  price_label: string;
  min_price: string;
  max_price: string;
  original_price: string;
  offer_price: string;
  quota_label: string;
  cta_type: string;
  cta_label: string;
  registration_url: string;
  booking_url: string;
  official_url: string;
  source_url: string;
  contact_phone: string;
  contact_email: string;
  whatsapp: string;
  cover_image_url: string;
  gallery_image_urls: string[];
  organizer_name: string;
};

const STORAGE_BUCKET = "event-images";

const emptyForm: FormState = {
  title_tc: "",
  short_description_tc: "",
  description_tc: "",
  activity_category: "親子活動",
  highlights: "",
  terms: "",
  remarks: "",
  tags: "",
  start_date: "",
  end_date: "",
  start_time: "",
  end_time: "",
  venue_name: "",
  address: "",
  area: "",
  district: "",
  mtr_station: "",
  google_map_url: "",
  google_map_embed_url: "",
  price_display_mode: "unknown",
  price_label: "",
  min_price: "",
  max_price: "",
  original_price: "",
  offer_price: "",
  quota_label: "",
  cta_type: "official",
  cta_label: "查看官方活動頁",
  registration_url: "",
  booking_url: "",
  official_url: "",
  source_url: "",
  contact_phone: "",
  contact_email: "",
  whatsapp: "",
  cover_image_url: "",
  gallery_image_urls: ["", "", "", "", ""],
  organizer_name: "",
};

const steps = ["基本資料", "時間地點", "圖片", "收費名額", "報名 CTA", "內容提交"];

const priceModes = [
  { key: "unknown", title: "收費待確認", desc: "未確認收費，需商戶補充。" },
  { key: "hidden", title: "不顯示價錢", desc: "公開頁不展示任何價錢。" },
  { key: "free", title: "免費", desc: "活動免費，不需要填收費。" },
  { key: "fixed", title: "固定價", desc: "例如 HK$50，不會顯示「起」。" },
  { key: "early_bird", title: "優惠 / 早鳥", desc: "例如 HK$50（原價 HK$90）。" },
  { key: "range", title: "價錢範圍", desc: "例如 HK$50–HK$180。" },
  { key: "from", title: "HK$XX 起", desc: "適合不同票種，最低價起。" },
  { key: "quota", title: "只顯示名額", desc: "不顯示價錢，只顯示名額。" },
];

const ctaTypes = [
  { key: "official", title: "官方活動頁", desc: "家長前往主辦方活動頁。", label: "查看官方活動頁" },
  { key: "external", title: "外部連結報名", desc: "Klook / Eventbrite / Ticketing Partner。", label: "前往報名" },
  { key: "google_form", title: "Google Form", desc: "直接填寫 Google Form。", label: "Google Form 報名" },
  { key: "whatsapp", title: "WhatsApp", desc: "以 WhatsApp 查詢或報名。", label: "WhatsApp 報名" },
  { key: "contact", title: "向主辦查詢", desc: "電話、Email 或 WhatsApp 查詢。", label: "請向主辦查詢" },
  { key: "none", title: "無需報名", desc: "活動可直接到場。", label: "無需報名" },
];

const possiblyArrayColumns = [
  "category",
  "activity_category",
  "tags",
  "highlights",
  "terms",
  "remarks",
];

function safeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function valueOf(record: EventRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

function getGalleryArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item || "").trim()).filter(Boolean);
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function normalizeGallery(images: string[]) {
  return Array.from(new Set(images.map((item) => item.trim()).filter(Boolean))).slice(0, 5);
}

function ensureFiveImages(images: string[]) {
  const next = [...images].slice(0, 5);
  while (next.length < 5) next.push("");
  return next;
}

function updateImageItem(images: string[], index: number, value: string) {
  const next = [...images];
  next[index] = value;
  return ensureFiveImages(next);
}

function formatPricePreview(form: FormState) {
  const mode = form.price_display_mode;
  if (mode === "hidden") return "不顯示價錢";
  if (mode === "free") return "免費";
  if (mode === "quota") return form.quota_label || "名額有限，詳情請向主辦查詢";

  if (mode === "early_bird") {
    if (form.offer_price && form.original_price) return `早鳥優惠價 HK$${form.offer_price}（原價 HK$${form.original_price}）`;
    if (form.offer_price) return `早鳥優惠價 HK$${form.offer_price}`;
    if (form.price_label) return form.price_label;
    return "早鳥優惠價待確認";
  }

  if (mode === "fixed") {
    if (form.min_price) return `HK$${form.min_price}`;
    if (form.price_label) return form.price_label;
    return "固定收費待確認";
  }

  if (mode === "range") {
    if (form.min_price && form.max_price) {
      if (form.min_price === form.max_price) return `HK$${form.min_price}`;
      return `HK$${form.min_price}–HK$${form.max_price}`;
    }
    if (form.min_price) return `HK$${form.min_price} 起`;
    if (form.price_label) return form.price_label;
    return "價錢範圍待確認";
  }

  if (mode === "from") {
    if (form.min_price) return `HK$${form.min_price} 起`;
    if (form.price_label) return form.price_label;
    return "HK$XX 起";
  }

  if (form.price_label) return form.price_label;
  return "收費待確認";
}

function getCtaPreview(form: FormState) {
  if (form.cta_label) return form.cta_label;
  return ctaTypes.find((item) => item.key === form.cta_type)?.label || "查看詳情";
}

function activeCtaUrl(form: FormState) {
  if (form.cta_type === "whatsapp") return form.whatsapp;
  if (form.cta_type === "google_form") return form.registration_url || form.booking_url;
  if (form.cta_type === "external") return form.registration_url || form.booking_url;
  if (form.cta_type === "official") return form.official_url || form.source_url;
  return "";
}

function readiness(form: FormState) {
  const checks = [
    { key: "活動名稱", done: !!safeText(form.title_tc) },
    { key: "日期", done: !!safeText(form.start_date) },
    { key: "地點", done: !!safeText(form.venue_name) || !!safeText(form.address) },
    { key: "收費", done: formatPricePreview(form) !== "收費待確認" },
    { key: "CTA", done: form.cta_type === "none" || form.cta_type === "contact" || !!safeText(activeCtaUrl(form)) },
    { key: "圖片", done: !!safeText(form.cover_image_url) || normalizeGallery(form.gallery_image_urls).length > 0 },
    { key: "Google Map", done: !!safeText(form.google_map_url) || !!safeText(form.google_map_embed_url) },
  ];
  const score = Math.round((checks.filter((item) => item.done).length / checks.length) * 100);
  const missing = checks.filter((item) => !item.done).map((item) => item.key);
  return { score, missing, checks };
}

function isDisabledPriceField(mode: string, field: string) {
  if (mode === "hidden" || mode === "free") {
    return ["price_label", "min_price", "max_price", "original_price", "offer_price", "quota_label"].includes(field);
  }
  if (mode === "fixed") return ["max_price", "original_price", "offer_price", "quota_label"].includes(field);
  if (mode === "early_bird") return ["max_price"].includes(field);
  if (mode === "range") return ["original_price", "offer_price", "quota_label"].includes(field);
  if (mode === "from") return ["max_price", "original_price", "offer_price", "quota_label"].includes(field);
  if (mode === "quota") return ["price_label", "min_price", "max_price", "original_price", "offer_price"].includes(field);
  return false;
}

function statusLabel(status: unknown) {
  const text = safeText(status, "draft").toLowerCase();
  if (["submitted", "pending", "review", "pending_review"].includes(text)) return "審批中";
  if (["published", "approved", "live"].includes(text)) return "已發布";
  if (["rejected", "declined"].includes(text)) return "已拒絕";
  if (["archived", "hidden", "offline"].includes(text)) return "已封存";
  return "草稿";
}

function formFromEvent(event: EventRecord): FormState {
  const gallery = ensureFiveImages(normalizeGallery([valueOf(event, ["cover_image_url"]), ...getGalleryArray(event.gallery_image_urls)]));
  return {
    title_tc: valueOf(event, ["title_tc", "title", "name"]),
    short_description_tc: valueOf(event, ["short_description_tc", "summary", "short_description"]),
    description_tc: valueOf(event, ["description_tc", "description"]),
    activity_category: valueOf(event, ["activity_category", "category"], "親子活動"),
    highlights: valueOf(event, ["highlights"]),
    terms: valueOf(event, ["terms"]),
    remarks: valueOf(event, ["remarks"]),
    tags: valueOf(event, ["tags"]),
    start_date: valueOf(event, ["start_date", "date"]),
    end_date: valueOf(event, ["end_date"]),
    start_time: valueOf(event, ["start_time"]),
    end_time: valueOf(event, ["end_time"]),
    venue_name: valueOf(event, ["venue_name", "venue", "location_name"]),
    address: valueOf(event, ["address", "location"]),
    area: valueOf(event, ["area"]),
    district: valueOf(event, ["district"]),
    mtr_station: valueOf(event, ["mtr_station", "station"]),
    google_map_url: valueOf(event, ["google_map_url", "map_url"]),
    google_map_embed_url: valueOf(event, ["google_map_embed_url", "map_embed_url"]),
    price_display_mode: valueOf(event, ["price_display_mode"], "unknown"),
    price_label: valueOf(event, ["price_label", "price", "fee"]),
    min_price: valueOf(event, ["min_price"]),
    max_price: valueOf(event, ["max_price"]),
    original_price: valueOf(event, ["original_price"]),
    offer_price: valueOf(event, ["offer_price"]),
    quota_label: valueOf(event, ["quota_label"]),
    cta_type: valueOf(event, ["cta_type"], "official"),
    cta_label: valueOf(event, ["cta_label"], "查看官方活動頁"),
    registration_url: valueOf(event, ["registration_url", "registration_link"]),
    booking_url: valueOf(event, ["booking_url"]),
    official_url: valueOf(event, ["official_url"]),
    source_url: valueOf(event, ["source_url", "url", "event_url"]),
    contact_phone: valueOf(event, ["contact_phone", "phone"]),
    contact_email: valueOf(event, ["contact_email", "email"]),
    whatsapp: valueOf(event, ["whatsapp", "whatsapp_number"]),
    cover_image_url: valueOf(event, ["cover_image_url"]) || gallery[0] || "",
    gallery_image_urls: gallery,
    organizer_name: valueOf(event, ["organizer_name", "merchant_name", "organizer"]),
  };
}

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.-]/g, "-").replace(/-+/g, "-").slice(0, 90);
}

function removeProblemColumnFromPayload(payload: Record<string, unknown>, message: string) {
  const next = { ...payload };
  const missingColumnMatch = message.match(/Could not find the '([^']+)' column/i);
  if (missingColumnMatch?.[1]) {
    delete next[missingColumnMatch[1]];
    return { payload: next, removed: missingColumnMatch[1] };
  }

  const malformedMatch = message.match(/malformed array literal:\s*"([^"]*)"/i);
  const malformedValue = malformedMatch?.[1] || "";

  for (const key of possiblyArrayColumns) {
    if (String(payload[key] || "") === malformedValue) {
      delete next[key];
      return { payload: next, removed: key };
    }
  }

  for (const key of possiblyArrayColumns) delete next[key];
  return { payload: next, removed: possiblyArrayColumns.join(", ") };
}

async function updateEventWithFallback(eventId: string, originalPayload: Record<string, unknown>) {
  const client = supabase;
  if (!client) return { data: null, errorMessage: "Supabase client 未能初始化。", removed: [] as string[] };

  let payload = { ...originalPayload };
  const removed: string[] = [];

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await client.from("events").update(payload).eq("id", eventId).select("*").maybeSingle();
    if (!error) return { data, errorMessage: "", removed };

    const message = error.message || "";
    if (!message.includes("Could not find") && !message.includes("malformed array literal")) {
      return { data: null, errorMessage: message, removed };
    }

    const result = removeProblemColumnFromPayload(payload, message);
    payload = result.payload;
    removed.push(result.removed);
  }

  return { data: null, errorMessage: "已多次嘗試移除不兼容欄位，但仍未能儲存。請檢查 events table schema。", removed };
}

function buildPayload(form: FormState, merchant: MerchantRecord | null, eventRecord: EventRecord | null, nextStatus?: string) {
  const finalGallery = normalizeGallery([form.cover_image_url, ...form.gallery_image_urls]);
  const priceSummary = formatPricePreview(form);
  const ctaSummary = getCtaPreview(form);

  return {
    title_tc: form.title_tc || "未命名活動草稿",
    title: form.title_tc || "Untitled event",
    short_description_tc: form.short_description_tc,
    description_tc: form.description_tc,

    category: form.activity_category,
    activity_category: form.activity_category,

    highlights: form.highlights,
    terms: form.terms,
    remarks: form.remarks,
    tags: form.tags,

    start_date: form.start_date || null,
    end_date: form.end_date || form.start_date || null,
    start_time: form.start_time || null,
    end_time: form.end_time || null,

    venue_name: form.venue_name,
    address: form.address,
    area: form.area,
    district: form.district,
    mtr_station: form.mtr_station,
    google_map_url: form.google_map_url,
    google_map_embed_url: form.google_map_embed_url,

    price_display_mode: form.price_display_mode,
    price_label: priceSummary,
    min_price: ["hidden", "free", "quota"].includes(form.price_display_mode) ? null : form.min_price || null,
    max_price: form.price_display_mode === "range" && form.max_price ? form.max_price : null,
    original_price: form.price_display_mode === "early_bird" && form.original_price ? form.original_price : null,
    offer_price: form.price_display_mode === "early_bird" && form.offer_price ? form.offer_price : null,
    quota_label: form.price_display_mode === "quota" || form.quota_label ? form.quota_label : "",

    cta_type: form.cta_type,
    cta_label: ctaSummary,
    registration_url: form.registration_url,
    booking_url: form.booking_url,
    official_url: form.official_url,
    source_url: form.source_url,
    contact_phone: form.contact_phone,
    contact_email: form.contact_email,
    whatsapp: form.whatsapp,

    cover_image_url: form.cover_image_url || finalGallery[0] || "",
    gallery_image_urls: finalGallery,

    organizer_name: form.organizer_name || safeText(merchant?.business_name) || "",
    merchant_name: safeText(merchant?.business_name) || safeText(eventRecord?.merchant_name) || "",
    status: nextStatus || safeText(eventRecord?.status, "draft"),
    updated_at: new Date().toISOString(),
  };
}

export default function MerchantEventEditPage() {
  const params = useParams();
  const eventId = String(params?.id || "");
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  const [eventRecord, setEventRecord] = useState<EventRecord | null>(null);
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autosaveState, setAutosaveState] = useState("未有未儲存更改");
  const [message, setMessage] = useState("");
  const [previewMode, setPreviewMode] = useState<"card" | "detail">("card");
  const [uploadingKey, setUploadingKey] = useState("");

  const ready = useMemo(() => readiness(form), [form]);
  const galleryImages = useMemo(() => normalizeGallery([form.cover_image_url, ...form.gallery_image_urls]), [form.cover_image_url, form.gallery_image_urls]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function persist(nextStatus?: string, silent = false) {
    if (!eventId || !eventRecord) return false;
    if (nextStatus === "submitted" && ready.missing.length) {
      setMessage(`提交前請先補齊：${ready.missing.join("、")}。`);
      return false;
    }

    setSaving(true);
    if (silent) setAutosaveState("正在自動儲存...");
    if (!silent) setMessage("");

    const payload = buildPayload(form, merchant, eventRecord, nextStatus);
    const result = await updateEventWithFallback(eventId, payload);

    if (result.errorMessage) {
      if (silent) setAutosaveState("自動儲存失敗");
      setMessage(`儲存失敗：${result.errorMessage}`);
      setSaving(false);
      return false;
    }

    if (result.data) {
      const updated = result.data as EventRecord;
      setEventRecord(updated);
      setForm(formFromEvent(updated));
    }

    const removedNote = result.removed.length ? ` 已自動略過不兼容欄位：${result.removed.join("、")}。` : "";
    if (silent) setAutosaveState(`已自動儲存 ${new Date().toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit" })}`);
    if (!silent) setMessage(nextStatus === "submitted" ? `已提交 HK Family Fun 審批。${removedNote}` : `已儲存草稿。${removedNote}`);
    setSaving(false);
    return true;
  }

  async function uploadImage(file: File, target: "cover" | "gallery", index = 0) {
    const client = supabase;
    if (!client) {
      setMessage("Supabase client 未能初始化，暫時不能上載圖片。");
      return;
    }
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("請上載圖片檔案，例如 JPG、PNG 或 WebP。");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage("圖片太大，請壓縮至 8MB 以下再上載。");
      return;
    }

    const key = target === "cover" ? "cover" : `gallery-${index}`;
    setUploadingKey(key);
    setMessage("");

    const path = `${eventId}/${Date.now()}-${target}-${index}-${sanitizeFileName(file.name || "image.jpg")}`;
    const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

    if (error) {
      setMessage(`圖片上載失敗：${error.message}。請確認 Supabase Storage 已建立 public bucket：${STORAGE_BUCKET}`);
      setUploadingKey("");
      return;
    }

    const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const publicUrl = data.publicUrl;

    if (target === "cover") {
      const nextGallery = ensureFiveImages([publicUrl, ...form.gallery_image_urls]).slice(0, 5);
      setForm((previous) => ({ ...previous, cover_image_url: publicUrl, gallery_image_urls: nextGallery }));
    } else {
      setForm((previous) => ({ ...previous, gallery_image_urls: updateImageItem(previous.gallery_image_urls, index, publicUrl) }));
    }

    setMessage("圖片已上載並加入 Preview。系統會自動儲存，也可以按「儲存草稿」。");
    setUploadingKey("");
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>, target: "cover" | "gallery", index = 0) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await uploadImage(file, target, index);
  }

  useEffect(() => {
    async function loadEvent() {
      const client = supabase;
      setLoading(true);
      setMessage("");

      if (!client) {
        setMessage("Supabase client 未能初始化，請檢查 .env.local。");
        setLoading(false);
        return;
      }

      const { data: userResult, error: userError } = await client.auth.getUser();
      const user = userResult?.user;
      if (userError || !user) {
        setMessage("請先登入商戶帳戶。");
        setLoading(false);
        return;
      }

      const { data: merchantData } = await client.from("merchants").select("*").eq("owner_user_id", user.id).maybeSingle();
      setMerchant((merchantData || null) as MerchantRecord | null);

      const { data: eventData, error: eventError } = await client.from("events").select("*").eq("id", eventId).maybeSingle();
      if (eventError) {
        setMessage(`讀取活動失敗：${eventError.message}`);
        setLoading(false);
        return;
      }
      if (!eventData) {
        setMessage("找不到此活動。");
        setLoading(false);
        return;
      }

      const currentEvent = eventData as EventRecord;
      setEventRecord(currentEvent);
      setForm(formFromEvent(currentEvent));
      hydrated.current = true;
      setLoading(false);
    }

    if (eventId) loadEvent();
  }, [eventId]);

  useEffect(() => {
    if (!hydrated.current || loading || !eventRecord) return;
    setAutosaveState("有未儲存更改，準備自動儲存...");
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void persist(undefined, true);
    }, 1300);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [form]);

  if (loading) {
    return <main className="min-h-screen bg-slate-50 p-10 text-center font-black text-slate-700">正在讀取活動資料...</main>;
  }

  if (!eventRecord) {
    return (
      <main className="min-h-screen bg-slate-50 p-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-2xl font-black text-slate-950">找不到活動</h1>
          <p className="mt-3 text-sm text-amber-800">{message || "請返回 Dashboard 重新選擇活動。"}</p>
          <Link href="/merchant/dashboard" className="mt-6 inline-flex rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white">返回 Dashboard</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link href="/merchant/dashboard" className="text-sm font-black text-purple-700 hover:text-purple-900">← 返回 Merchant Dashboard</Link>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">編輯活動資料</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">支援圖片上載、圖片 URL、5 張 Gallery、即時 Preview 及自動儲存。</p>
              <p className="mt-2 text-xs font-black text-slate-500">{autosaveState}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/merchant/events/${eventId}/preview`} className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Preview</Link>
              <button type="button" onClick={() => persist()} disabled={saving} className="rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">{saving ? "儲存中..." : "儲存草稿"}</button>
              <button type="button" onClick={() => persist("submitted")} disabled={saving || ready.missing.length > 0} className="rounded-full bg-purple-700 px-5 py-2 text-sm font-black text-white hover:bg-purple-800 disabled:bg-slate-300">提交審批</button>
            </div>
          </div>
          {message ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</div> : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 xl:grid-cols-[1fr_390px]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {steps.map((label, index) => (
                <button key={label} type="button" onClick={() => setStep(index)} className={["rounded-2xl px-4 py-3 text-sm font-black transition", step === index ? "bg-purple-700 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"].join(" ")}>{index + 1}. {label}</button>
              ))}
            </div>
          </div>

          {step === 0 ? (
            <Section title="Step 1：基本資料" desc="先確認活動名稱、分類及簡介。">
              <Input label="活動名稱" value={form.title_tc} onChange={(value) => updateField("title_tc", value)} />
              <Input label="活動分類" value={form.activity_category} onChange={(value) => updateField("activity_category", value)} />
              <Textarea label="短簡介" value={form.short_description_tc} onChange={(value) => updateField("short_description_tc", value)} />
              <Input label="標籤" value={form.tags} onChange={(value) => updateField("tags", value)} placeholder="AIRSIDE, 親子活動, 健康活動" />
            </Section>
          ) : null}

          {step === 1 ? (
            <Section title="Step 2：時間及地點" desc="日期、時間、地點和 Google Map 會直接影響家長搜尋。">
              <Input label="開始日期" type="date" value={form.start_date} onChange={(value) => updateField("start_date", value)} />
              <Input label="結束日期" type="date" value={form.end_date} onChange={(value) => updateField("end_date", value)} />
              <Input label="開始時間" type="time" value={form.start_time} onChange={(value) => updateField("start_time", value)} />
              <Input label="結束時間" type="time" value={form.end_time} onChange={(value) => updateField("end_time", value)} />
              <Input label="場地名稱" value={form.venue_name} onChange={(value) => updateField("venue_name", value)} />
              <Input label="詳細地址" value={form.address} onChange={(value) => updateField("address", value)} />
              <Input label="地區" value={form.area} onChange={(value) => updateField("area", value)} />
              <Input label="分區" value={form.district} onChange={(value) => updateField("district", value)} />
              <Input label="港鐵站" value={form.mtr_station} onChange={(value) => updateField("mtr_station", value)} />
              <Input label="Google Map URL" value={form.google_map_url} onChange={(value) => updateField("google_map_url", value)} />
              <Input label="Google Map Embed URL" value={form.google_map_embed_url} onChange={(value) => updateField("google_map_embed_url", value)} />
            </Section>
          ) : null}

          {step === 2 ? (
            <Section title="Step 3：圖片 Gallery" desc="商戶可直接上載圖片，也可貼圖片 URL。最多顯示 5 張。">
              <div className="md:col-span-2 rounded-3xl border border-purple-200 bg-purple-50 p-5">
                <h3 className="text-lg font-black text-purple-950">圖片上載</h3>
                <p className="mt-1 text-sm leading-6 text-purple-800">普通商戶可直接選擇電腦圖片，不需要自己找圖片 URL。支援 JPG、PNG、WebP，建議每張 8MB 以下。</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <UploadBox label="上載封面圖片" helper="主要顯示於活動卡及詳情頁" busy={uploadingKey === "cover"} onChange={(event) => handleFileChange(event, "cover")} />
                  {[0, 1, 2, 3, 4].map((index) => (
                    <UploadBox key={index} label={`上載 Gallery 圖片 ${index + 1}`} helper="補充活動海報、場地或詳情圖" busy={uploadingKey === `gallery-${index}`} onChange={(event) => handleFileChange(event, "gallery", index)} />
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-black text-slate-950">圖片 URL 備用欄位</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">如圖片來自商戶官網或系統匯入，可保留 URL。上載圖片後，系統會自動填入 URL。</p>
              </div>

              <Input label="封面圖片 URL" value={form.cover_image_url} onChange={(value) => updateField("cover_image_url", value)} />
              {form.gallery_image_urls.map((image, index) => (
                <Input key={index} label={`Gallery 圖片 ${index + 1}`} value={image} onChange={(value) => updateField("gallery_image_urls", updateImageItem(form.gallery_image_urls, index, value))} />
              ))}

              {galleryImages.length ? (
                <div className="md:col-span-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {galleryImages.map((image, index) => (
                    <div key={`${image}-${index}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                      <div className="aspect-video flex items-center justify-center bg-slate-50 p-2"><img src={image} alt={`活動圖片 ${index + 1}`} className="max-h-full max-w-full rounded-2xl object-contain" /></div>
                      <p className="border-t border-slate-100 px-3 py-2 text-xs font-bold text-slate-500">圖片 {index + 1}</p>
                    </div>
                  ))}
                </div>
              ) : <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">暫時未有圖片。請上載封面或 Gallery 圖片。</div>}
            </Section>
          ) : null}

          {step === 3 ? (
            <Section title="Step 4：收費、優惠、票種及名額" desc="選擇收費模式後，不需要填的欄位會變灰，避免商戶混淆。">
              <div className="md:col-span-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {priceModes.map((mode) => (
                  <button key={mode.key} type="button" onClick={() => updateField("price_display_mode", mode.key)} className={["rounded-3xl border p-4 text-left transition", form.price_display_mode === mode.key ? "border-purple-500 bg-purple-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"].join(" ")}>
                    <p className="text-base font-black text-slate-950">{mode.title}</p><p className="mt-2 text-xs leading-5 text-slate-500">{mode.desc}</p>
                  </button>
                ))}
              </div>
              <div className="md:col-span-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><span className="font-black">即時公開顯示：</span>{formatPricePreview(form)}</div>
              <Input label="公開價錢摘要" value={form.price_label} disabled={isDisabledPriceField(form.price_display_mode, "price_label")} onChange={(value) => updateField("price_label", value)} placeholder="例如：早鳥優惠價 HK$50（原價 HK$90）" />
              <Input label="最低 / 固定收費 HK$" value={form.min_price} disabled={isDisabledPriceField(form.price_display_mode, "min_price")} onChange={(value) => updateField("min_price", value)} />
              <Input label="最高收費 HK$" value={form.max_price} disabled={isDisabledPriceField(form.price_display_mode, "max_price")} onChange={(value) => updateField("max_price", value)} />
              <Input label="優惠價 HK$" value={form.offer_price} disabled={isDisabledPriceField(form.price_display_mode, "offer_price")} onChange={(value) => updateField("offer_price", value)} />
              <Input label="原價 HK$" value={form.original_price} disabled={isDisabledPriceField(form.price_display_mode, "original_price")} onChange={(value) => updateField("original_price", value)} />
              <Input label="名額 / quota 摘要" value={form.quota_label} disabled={isDisabledPriceField(form.price_display_mode, "quota_label")} onChange={(value) => updateField("quota_label", value)} placeholder="例如：名額有限，先到先得，額滿即止" />
            </Section>
          ) : null}

          {step === 4 ? (
            <Section title="Step 5：報名 CTA" desc="CTA 會影響家長下一步行動。">
              <div className="md:col-span-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {ctaTypes.map((type) => (
                  <button key={type.key} type="button" onClick={() => { updateField("cta_type", type.key); updateField("cta_label", type.label); }} className={["rounded-3xl border p-4 text-left transition", form.cta_type === type.key ? "border-purple-500 bg-purple-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"].join(" ")}>
                    <p className="font-black text-slate-950">{type.title}</p><p className="mt-2 text-xs leading-5 text-slate-500">{type.desc}</p>
                  </button>
                ))}
              </div>
              <div className="md:col-span-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><span className="font-black">即時 CTA 顯示：</span>{getCtaPreview(form)}</div>
              <Input label="CTA 按鈕文字" value={form.cta_label} onChange={(value) => updateField("cta_label", value)} />
              <Input label="報名 URL" value={form.registration_url} disabled={form.cta_type === "none" || form.cta_type === "contact"} onChange={(value) => updateField("registration_url", value)} />
              <Input label="Booking URL" value={form.booking_url} disabled={form.cta_type === "none" || form.cta_type === "contact"} onChange={(value) => updateField("booking_url", value)} />
              <Input label="官方活動頁" value={form.official_url} disabled={form.cta_type === "none"} onChange={(value) => updateField("official_url", value)} />
              <Input label="來源 URL" value={form.source_url} onChange={(value) => updateField("source_url", value)} />
              <Input label="聯絡電話" value={form.contact_phone} disabled={form.cta_type !== "contact"} onChange={(value) => updateField("contact_phone", value)} />
              <Input label="聯絡 Email" value={form.contact_email} disabled={form.cta_type !== "contact"} onChange={(value) => updateField("contact_email", value)} />
              <Input label="WhatsApp" value={form.whatsapp} disabled={form.cta_type !== "whatsapp" && form.cta_type !== "contact"} onChange={(value) => updateField("whatsapp", value)} />
            </Section>
          ) : null}

          {step === 5 ? (
            <Section title="Step 6：內容細節及提交" desc="最後檢查活動內容、注意事項、主辦資料及完整度。">
              <Textarea label="詳細介紹" value={form.description_tc} onChange={(value) => updateField("description_tc", value)} />
              <Textarea label="活動亮點（一行一項）" value={form.highlights} onChange={(value) => updateField("highlights", value)} />
              <Textarea label="注意事項（一行一項）" value={form.terms} onChange={(value) => updateField("terms", value)} />
              <Textarea label="備註" value={form.remarks} onChange={(value) => updateField("remarks", value)} />
              <Input label="主辦方" value={form.organizer_name} onChange={(value) => updateField("organizer_name", value)} />
            </Section>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">上一步</button>
              <p className="text-sm font-black text-slate-500">Step {step + 1} / {steps.length}</p>
              {step < steps.length - 1 ? <button type="button" onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))} className="rounded-full bg-purple-700 px-5 py-2 text-sm font-black text-white hover:bg-purple-800">下一步</button> : <button type="button" onClick={() => persist()} disabled={saving} className="rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">儲存草稿</button>}
            </div>
          </div>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div><p className="text-xs font-black text-purple-700">即時 Preview</p><p className="mt-1 text-sm font-bold text-slate-500">狀態：{statusLabel(eventRecord.status)}</p></div>
              <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">家長看到的大約效果</div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPreviewMode("card")} className={["rounded-full px-3 py-2 text-xs font-black", previewMode === "card" ? "bg-purple-700 text-white" : "bg-slate-100 text-slate-600"].join(" ")}>Card</button>
              <button type="button" onClick={() => setPreviewMode("detail")} className={["rounded-full px-3 py-2 text-xs font-black", previewMode === "detail" ? "bg-purple-700 text-white" : "bg-slate-100 text-slate-600"].join(" ")}>Detail</button>
            </div>
            <PreviewCard form={form} images={galleryImages} mode={previewMode} />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><h2 className="text-lg font-black text-slate-950">公開頁關鍵資料</h2><span className={["rounded-full px-3 py-1 text-xs font-black", ready.score >= 80 ? "bg-emerald-50 text-emerald-700" : ready.score >= 60 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"].join(" ")}>{ready.score}%</span></div>
            <div className="mt-4 space-y-2">
              {ready.checks.map((item) => <div key={item.key} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"><span className="font-black text-slate-500">{item.key}</span><span className={["font-black", item.done ? "text-emerald-700" : "text-rose-700"].join(" ")}>{item.done ? "已完成" : "未完成"}</span></div>)}
            </div>
            {ready.missing.length ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800"><p className="font-black">提交前要補齊：</p><p>{ready.missing.join("、")}</p></div> : <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">主要資料已齊，可以提交審批。</div>}
          </div>
        </aside>
      </section>
    </main>
  );
}

function PreviewCard({ form, images, mode }: { form: FormState; images: string[]; mode: "card" | "detail" }) {
  const hero = form.cover_image_url || images[0] || "";
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className={mode === "detail" ? "aspect-video bg-slate-50" : "aspect-[4/3] bg-slate-50"}>{hero ? <div className="flex h-full w-full items-center justify-center p-2"><img src={hero} alt={form.title_tc || "活動圖片"} className="max-h-full max-w-full rounded-2xl object-contain" /></div> : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 text-5xl">親</div>}</div>
      <div className="p-5">
        <div className="mb-3 flex flex-wrap gap-2"><span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">{form.activity_category || "親子活動"}</span><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">草稿</span></div>
        <h3 className="text-xl font-black leading-snug text-slate-950">{form.title_tc || "未命名活動"}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{form.short_description_tc || form.description_tc || "活動簡介會顯示在這裡。"}</p>
        <div className="mt-4 grid gap-2 text-xs text-slate-600">
          <PreviewRow label="日期" value={`${form.start_date || "未填"}${form.end_date ? ` 至 ${form.end_date}` : ""}`} />
          <PreviewRow label="地點" value={form.venue_name || form.address || "未填"} />
          <PreviewRow label="收費" value={formatPricePreview(form)} />
          <PreviewRow label="報名方式" value={getCtaPreview(form)} />
        </div>
        {mode === "detail" && images.length ? <div className="mt-4 grid grid-cols-3 gap-2">{images.slice(0, 5).map((image, index) => <div key={`${image}-${index}`} className="aspect-video overflow-hidden rounded-xl bg-slate-50"><img src={image} alt={`Gallery ${index + 1}`} className="h-full w-full object-contain" /></div>)}</div> : null}
        <button type="button" className="mt-5 w-full rounded-2xl bg-purple-700 px-4 py-3 text-sm font-black text-white">{getCtaPreview(form)}</button>
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p><div className="mt-6 grid gap-4 md:grid-cols-2">{children}</div></section>;
}

function Input({ label, value, onChange, type = "text", disabled = false, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean; placeholder?: string }) {
  return <label className={disabled ? "opacity-45" : ""}><span className="text-xs font-black text-slate-600">{label}</span><input type={type} value={value} disabled={disabled} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={["mt-1 w-full rounded-2xl border px-4 py-3 text-sm outline-none", disabled ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400" : "border-slate-300 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100"].join(" ")} />{disabled ? <span className="mt-1 block text-xs font-bold text-slate-400">目前模式不需要填此欄。</span> : null}</label>;
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="md:col-span-2"><span className="text-xs font-black text-slate-600">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" /></label>;
}

function UploadBox({ label, helper, busy, onChange }: { label: string; helper: string; busy: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <label className="block cursor-pointer rounded-3xl border border-dashed border-purple-300 bg-white p-4 transition hover:bg-purple-50"><span className="block text-sm font-black text-slate-950">{busy ? "上載中..." : label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{helper}</span><span className="mt-3 inline-flex rounded-full bg-purple-700 px-4 py-2 text-xs font-black text-white">選擇圖片</span><input type="file" accept="image/*" className="hidden" disabled={busy} onChange={onChange} /></label>;
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[80px_1fr] gap-2 rounded-2xl bg-slate-50 px-3 py-2"><span className="font-black text-slate-400">{label}</span><span className="font-bold text-slate-800">{value}</span></div>;
}