"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type EventRecord = {
  id: string;
  merchant_id?: string | null;
  title_tc?: string | null;
  title?: string | null;
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

  cover_image_offset_x?: string | number | null;
  cover_image_offset_y?: string | number | null;
  cover_image_zoom?: string | number | null;

  organizer_name?: string | null;
  merchant_name?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

type MerchantRecord = {
  id: string;
  business_name?: string | null;
  contact_email?: string | null;
  status?: string | null;
};

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
  cover_image_offset_x: number;
  cover_image_offset_y: number;
  cover_image_zoom: number;

  organizer_name: string;
};

const STORAGE_BUCKET = "event-images";
const MAX_IMAGES = 5;

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
  gallery_image_urls: ["", "", "", ""],
  cover_image_offset_x: 0,
  cover_image_offset_y: 0,
  cover_image_zoom: 1,

  organizer_name: "",
};

const steps = [
  "基本資料",
  "時間地點",
  "圖片",
  "收費名額",
  "報名 CTA",
  "內容提交",
];

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
  {
    key: "official",
    title: "官方活動頁",
    desc: "家長前往主辦方活動頁。",
    label: "查看官方活動頁",
  },
  {
    key: "external",
    title: "外部連結報名",
    desc: "Klook / Eventbrite / Ticketing Partner。",
    label: "前往報名",
  },
  {
    key: "google_form",
    title: "Google Form",
    desc: "直接填寫 Google Form。",
    label: "Google Form 報名",
  },
  {
    key: "whatsapp",
    title: "WhatsApp",
    desc: "以 WhatsApp 查詢或報名。",
    label: "WhatsApp 報名",
  },
  {
    key: "contact",
    title: "向主辦查詢",
    desc: "電話、Email 或 WhatsApp 查詢。",
    label: "請向主辦查詢",
  },
  {
    key: "none",
    title: "無需報名",
    desc: "活動可直接到場。",
    label: "無需報名",
  },
];

const SCHEMA_UNSAFE_FIELDS = new Set(["category"]);

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

function toInputValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function toNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

function normalizeImages(images: string[]) {
  return Array.from(new Set(images.map((item) => item.trim()).filter(Boolean))).slice(
    0,
    MAX_IMAGES
  );
}

function ensureGalleryFields(images: string[]) {
  const next = [...images].slice(0, MAX_IMAGES - 1);
  while (next.length < MAX_IMAGES - 1) next.push("");
  return next;
}

function updateGalleryItem(images: string[], index: number, value: string) {
  const next = [...images];
  next[index] = value;
  return ensureGalleryFields(next);
}

function getAllImagesFromForm(form: FormState) {
  return normalizeImages([form.cover_image_url, ...form.gallery_image_urls]);
}

function applyImageOrderToForm(images: string[], previous: FormState) {
  const cleanImages = normalizeImages(images);

  return {
    ...previous,
    cover_image_url: cleanImages[0] || "",
    gallery_image_urls: ensureGalleryFields(cleanImages.slice(1)),
  };
}

function formatPricePreview(form: FormState) {
  const mode = form.price_display_mode;

  if (mode === "hidden") return "不顯示價錢";
  if (mode === "free") return "免費";
  if (mode === "quota") return form.quota_label || "名額有限，詳情請向主辦查詢";

  if (mode === "early_bird") {
    if (form.offer_price && form.original_price) {
      return `早鳥優惠價 HK$${form.offer_price}（原價 HK$${form.original_price}）`;
    }
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
  const selected = ctaTypes.find((item) => item.key === form.cta_type);
  return selected?.label || "查看詳情";
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
    {
      key: "CTA",
      done:
        form.cta_type === "none" ||
        form.cta_type === "contact" ||
        !!safeText(activeCtaUrl(form)),
    },
    {
      key: "圖片",
      done: getAllImagesFromForm(form).length > 0,
    },
    {
      key: "Google Map",
      done: !!safeText(form.google_map_url) || !!safeText(form.google_map_embed_url),
    },
  ];

  const score = Math.round((checks.filter((item) => item.done).length / checks.length) * 100);
  const missing = checks.filter((item) => !item.done).map((item) => item.key);

  return { score, missing, checks };
}

function isDisabledPriceField(mode: string, field: string) {
  if (mode === "hidden" || mode === "free") {
    return [
      "price_label",
      "min_price",
      "max_price",
      "original_price",
      "offer_price",
      "quota_label",
    ].includes(field);
  }

  if (mode === "fixed") {
    return ["max_price", "original_price", "offer_price", "quota_label"].includes(field);
  }

  if (mode === "early_bird") return ["max_price"].includes(field);

  if (mode === "range") {
    return ["original_price", "offer_price", "quota_label"].includes(field);
  }

  if (mode === "from") {
    return ["max_price", "original_price", "offer_price", "quota_label"].includes(field);
  }

  if (mode === "quota") {
    return ["price_label", "min_price", "max_price", "original_price", "offer_price"].includes(
      field
    );
  }

  return false;
}

function statusLabel(status?: string | null) {
  const text = safeText(status, "draft").toLowerCase();

  if (["submitted", "pending", "review", "pending_review"].includes(text)) return "審批中";
  if (["published", "approved", "live"].includes(text)) return "已發布";
  if (["rejected", "declined"].includes(text)) return "已拒絕";
  if (["archived", "hidden", "offline"].includes(text)) return "已封存";
  return "草稿";
}

function readActivityCategory(event: EventRecord) {
  const direct = safeText(event.activity_category);
  if (direct) return direct;

  const legacy = event.category;
  if (Array.isArray(legacy)) return safeText(legacy[0], "親子活動");

  return safeText(legacy, "親子活動");
}

function formFromEvent(event: EventRecord): FormState {
  const images = normalizeImages([
    safeText(event.cover_image_url),
    ...getGalleryArray(event.gallery_image_urls),
  ]);

  return {
    title_tc: safeText(event.title_tc || event.title),
    short_description_tc: safeText(event.short_description_tc),
    description_tc: safeText(event.description_tc),
    activity_category: readActivityCategory(event),
    highlights: safeText(event.highlights),
    terms: safeText(event.terms),
    remarks: safeText(event.remarks),
    tags: safeText(event.tags),

    start_date: safeText(event.start_date),
    end_date: safeText(event.end_date),
    start_time: safeText(event.start_time),
    end_time: safeText(event.end_time),

    venue_name: safeText(event.venue_name),
    address: safeText(event.address),
    area: safeText(event.area),
    district: safeText(event.district),
    mtr_station: safeText(event.mtr_station),
    google_map_url: safeText(event.google_map_url),
    google_map_embed_url: safeText(event.google_map_embed_url),

    price_display_mode: safeText(event.price_display_mode, "unknown"),
    price_label: safeText(event.price_label),
    min_price: toInputValue(event.min_price),
    max_price: toInputValue(event.max_price),
    original_price: toInputValue(event.original_price),
    offer_price: toInputValue(event.offer_price),
    quota_label: safeText(event.quota_label),

    cta_type: safeText(event.cta_type, "official"),
    cta_label: safeText(event.cta_label, "查看官方活動頁"),
    registration_url: safeText(event.registration_url),
    booking_url: safeText(event.booking_url),
    official_url: safeText(event.official_url),
    source_url: safeText(event.source_url),
    contact_phone: safeText(event.contact_phone),
    contact_email: safeText(event.contact_email),
    whatsapp: safeText(event.whatsapp),

    cover_image_url: images[0] || safeText(event.cover_image_url),
    gallery_image_urls: ensureGalleryFields(images.slice(1)),
    cover_image_offset_x: clamp(toNumber(event.cover_image_offset_x, 0), -50, 50),
    cover_image_offset_y: clamp(toNumber(event.cover_image_offset_y, 0), -50, 50),
    cover_image_zoom: clamp(toNumber(event.cover_image_zoom, 1), 1, 2.5),

    organizer_name: safeText(event.organizer_name || event.merchant_name),
  };
}

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
}

function removeUnsafePayloadFields(payload: Record<string, unknown>) {
  const next = { ...payload };
  SCHEMA_UNSAFE_FIELDS.forEach((field) => {
    delete next[field];
  });
  return next;
}

function extractMissingColumn(errorMessage: string) {
  const match = errorMessage.match(/Could not find the '([^']+)' column/);
  return match?.[1] || "";
}

function coverCropStyle(form: FormState) {
  return {
    transform: `translate(${form.cover_image_offset_x}%, ${form.cover_image_offset_y}%) scale(${form.cover_image_zoom})`,
  };
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export default function MerchantEventEditPage() {
  const params = useParams();
  const eventId = String(params?.id || "");

  const [eventRecord, setEventRecord] = useState<EventRecord | null>(null);
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewMode, setPreviewMode] = useState<"card" | "detail">("card");
  const [uploading, setUploading] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [showAdvancedUrls, setShowAdvancedUrls] = useState(false);

  const loadedRef = useRef(false);
  const lastSerializedFormRef = useRef("");

  const ready = useMemo(() => readiness(form), [form]);
  const orderedImages = useMemo(() => getAllImagesFromForm(form), [form]);
  const remainingSlots = Math.max(0, MAX_IMAGES - orderedImages.length);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function setImageOrder(images: string[]) {
    setForm((previous) => applyImageOrderToForm(images, previous));
  }

  function moveImage(index: number, direction: "up" | "down") {
    const images = [...orderedImages];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= images.length) return;

    const current = images[index];
    images[index] = images[targetIndex];
    images[targetIndex] = current;

    setImageOrder(images);
  }

  function setAsCover(image: string) {
    const images = [image, ...orderedImages.filter((item) => item !== image)];
    setImageOrder(images);
    resetCoverCrop();
  }

  function removeImage(image: string) {
    const images = orderedImages.filter((item) => item !== image);
    setImageOrder(images);
  }

  function resetCoverCrop() {
    updateField("cover_image_offset_x", 0);
    updateField("cover_image_offset_y", 0);
    updateField("cover_image_zoom", 1);
  }

  async function uploadFiles(files: FileList | File[]) {
    const client = supabase;

    if (!client) {
      setMessage("Supabase client 未能初始化，暫時不能上載圖片。");
      return;
    }

    const selectedFiles = Array.from(files).filter(Boolean);

    if (!selectedFiles.length) return;

    if (orderedImages.length >= MAX_IMAGES) {
      setMessage(`圖片已達上限 ${MAX_IMAGES} 張，請先移除舊圖片。`);
      return;
    }

    const validFiles = selectedFiles.filter(isImageFile);
    const invalidCount = selectedFiles.length - validFiles.length;

    if (!validFiles.length) {
      setMessage("請上載圖片檔案，例如 JPG、PNG 或 WebP。");
      return;
    }

    const allowedFiles = validFiles.slice(0, remainingSlots);
    const skippedByLimit = validFiles.length - allowedFiles.length;
    const oversized = allowedFiles.filter((file) => file.size > 8 * 1024 * 1024);

    if (oversized.length) {
      setMessage("有圖片超過 8MB，請壓縮後再上載。");
      return;
    }

    setUploading(true);
    setMessage("");

    const uploadedUrls: string[] = [];

    for (const [index, file] of allowedFiles.entries()) {
      const extension = file.name.split(".").pop() || "jpg";
      const safeName = sanitizeFileName(file.name || `image.${extension}`);
      const path = `${eventId}/${Date.now()}-${index}-${safeName}`;

      const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

      if (error) {
        setMessage(
          `圖片上載失敗：${error.message}。請確認 Supabase Storage 已建立 public bucket：${STORAGE_BUCKET}`
        );
        setUploading(false);
        return;
      }

      const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
    }

    const nextImages = normalizeImages([...orderedImages, ...uploadedUrls]);
    setImageOrder(nextImages);

    if (!form.cover_image_url && nextImages[0]) {
      resetCoverCrop();
    }

    const notes = [
      `已加入 ${uploadedUrls.length} 張圖片。`,
      invalidCount ? `${invalidCount} 個檔案不是圖片，已略過。` : "",
      skippedByLimit ? `因最多只可 ${MAX_IMAGES} 張，已略過 ${skippedByLimit} 張。` : "",
      "系統會自動儲存。",
    ]
      .filter(Boolean)
      .join(" ");

    setMessage(notes);
    setUploading(false);
  }

  async function handleMultipleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    event.target.value = "";
    if (!files) return;
    await uploadFiles(files);
  }

  function addImageFromUrl(url: string, index: number) {
    const nextGallery = updateGalleryItem(form.gallery_image_urls, index, url);
    const nextImages = normalizeImages([form.cover_image_url, ...nextGallery]);
    setImageOrder(nextImages);
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

      if (!eventId) {
        setMessage("找不到活動 ID。");
        setLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();

      if (userError || !user) {
        setMessage("請先登入商戶帳戶。");
        setLoading(false);
        return;
      }

      const { data: merchantData, error: merchantError } = await client
        .from("merchants")
        .select("*")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (merchantError) {
        setMessage(`讀取商戶資料失敗：${merchantError.message}`);
        setLoading(false);
        return;
      }

      const currentMerchant = merchantData as MerchantRecord | null;
      setMerchant(currentMerchant);

      const { data: eventData, error: eventError } = await client
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

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
      const nextForm = formFromEvent(currentEvent);

      setEventRecord(currentEvent);
      setForm(nextForm);
      lastSerializedFormRef.current = JSON.stringify(nextForm);
      loadedRef.current = true;
      setLoading(false);
    }

    loadEvent();
  }, [eventId]);

  function buildPayload(nextStatus?: string) {
    const finalImages = getAllImagesFromForm(form);
    const priceSummary = formatPricePreview(form);
    const ctaSummary = getCtaPreview(form);
    const now = new Date().toISOString();

    const payload: Record<string, unknown> = {
      title_tc: form.title_tc || "未命名活動草稿",
      title: form.title_tc || "Untitled event",
      short_description_tc: form.short_description_tc,
      description_tc: form.description_tc,
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
      min_price:
        form.price_display_mode === "hidden" ||
        form.price_display_mode === "free" ||
        form.price_display_mode === "quota"
          ? null
          : form.min_price || null,
      max_price: form.price_display_mode === "range" && form.max_price ? form.max_price : null,
      original_price:
        form.price_display_mode === "early_bird" && form.original_price
          ? form.original_price
          : null,
      offer_price:
        form.price_display_mode === "early_bird" && form.offer_price ? form.offer_price : null,
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

      cover_image_url: finalImages[0] || "",
      gallery_image_urls: finalImages.slice(1),
      cover_image_offset_x: form.cover_image_offset_x,
      cover_image_offset_y: form.cover_image_offset_y,
      cover_image_zoom: form.cover_image_zoom,

      organizer_name: form.organizer_name || merchant?.business_name || "",
      merchant_name: merchant?.business_name || eventRecord?.merchant_name || "",

      status: nextStatus || eventRecord?.status || "draft",
      updated_at: now,
    };

    return removeUnsafePayloadFields(payload);
  }

  async function updateEventWithSchemaFallback(payload: Record<string, unknown>) {
    const client = supabase;

    if (!client) {
      return { data: null, errorMessage: "Supabase client 未能初始化。" };
    }

    let safePayload = { ...payload };

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { data, error } = await client
        .from("events")
        .update(safePayload)
        .eq("id", eventId)
        .select("*")
        .maybeSingle();

      if (!error) {
        return { data: data as EventRecord | null, errorMessage: "" };
      }

      const messageText = error.message || "";
      const missingColumn = extractMissingColumn(messageText);

      if (missingColumn && Object.prototype.hasOwnProperty.call(safePayload, missingColumn)) {
        delete safePayload[missingColumn];
        continue;
      }

      if (messageText.includes("malformed array literal")) {
        delete safePayload.category;
        delete safePayload.tags;
        delete safePayload.activity_category;
        continue;
      }

      return { data: null, errorMessage: messageText };
    }

    return { data: null, errorMessage: "儲存失敗：資料庫欄位不一致，已重試多次仍未成功。" };
  }

  async function saveEvent(nextStatus?: string, silent = false) {
    if (!eventId) {
      setMessage("找不到活動 ID，不能儲存。");
      return false;
    }

    if (nextStatus === "submitted" && ready.missing.length) {
      setMessage(`提交前請先補齊：${ready.missing.join("、")}。`);
      return false;
    }

    if (!silent) {
      setSaving(true);
      setMessage("");
    } else {
      setAutosaveState("saving");
    }

    const payload = buildPayload(nextStatus);
    const result = await updateEventWithSchemaFallback(payload);

    if (result.errorMessage) {
      if (silent) setAutosaveState("error");
      setMessage(`儲存失敗：${result.errorMessage}`);
      setSaving(false);
      return false;
    }

    if (result.data) {
      const updated = result.data;
      setEventRecord(updated);
      const nextForm = formFromEvent(updated);
      setForm(nextForm);
      lastSerializedFormRef.current = JSON.stringify(nextForm);
    } else {
      lastSerializedFormRef.current = JSON.stringify(form);
    }

    const timeText = new Date().toLocaleTimeString("zh-HK", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    setLastSavedAt(timeText);
    setAutosaveState("saved");

    if (nextStatus === "submitted") {
      setMessage("已提交 HK Family Fun 審批。");
    } else if (!silent) {
      setMessage("已儲存草稿。");
    }

    setSaving(false);
    return true;
  }

  useEffect(() => {
    if (!loadedRef.current || loading || !eventRecord) return;

    const serialized = JSON.stringify(form);
    if (serialized === lastSerializedFormRef.current) return;

    const timer = window.setTimeout(() => {
      saveEvent(undefined, true);
    }, 1300);

    return () => window.clearTimeout(timer);
  }, [form, loading, eventRecord]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1500px] px-4 py-16">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-50 text-3xl">
              親
            </div>
            <p className="font-black text-slate-700">正在讀取活動資料...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!eventRecord) {
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

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                href="/merchant/dashboard"
                className="text-sm font-black text-purple-700 hover:text-purple-900"
              >
                ← 返回 Merchant Dashboard
              </Link>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                編輯活動資料
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Smart Image Manager：一次上載、去重、最多 5 張、第一張封面、排序、裁切及即時 Preview。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/merchant/events/${eventId}/preview`}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Preview
              </Link>
              <button
                type="button"
                onClick={() => saveEvent()}
                disabled={saving}
                className="rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "儲存中..." : "儲存草稿"}
              </button>
              <button
                type="button"
                onClick={() => saveEvent("submitted")}
                disabled={saving || ready.missing.length > 0}
                className="rounded-full bg-purple-700 px-5 py-2 text-sm font-black text-white hover:bg-purple-800 disabled:bg-slate-300"
              >
                提交審批
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              狀態：{statusLabel(eventRecord.status)}
            </span>
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-black",
                autosaveState === "saving"
                  ? "bg-amber-50 text-amber-700"
                  : autosaveState === "saved"
                  ? "bg-emerald-50 text-emerald-700"
                  : autosaveState === "error"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-slate-100 text-slate-600",
              ].join(" ")}
            >
              {autosaveState === "saving"
                ? "自動儲存中..."
                : autosaveState === "saved"
                ? `已自動儲存${lastSavedAt ? ` ${lastSavedAt}` : ""}`
                : autosaveState === "error"
                ? "自動儲存失敗"
                : "Auto Save 準備中"}
            </span>
          </div>

          {message ? (
            <div
              className={[
                "mt-5 rounded-2xl border px-4 py-3 text-sm font-bold",
                message.includes("失敗")
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800",
              ].join(" ")}
            >
              {message}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 xl:grid-cols-[1fr_390px]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {steps.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(index)}
                  className={[
                    "rounded-2xl px-4 py-3 text-sm font-black transition",
                    step === index
                      ? "bg-purple-700 text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {index + 1}. {label}
                </button>
              ))}
            </div>
          </div>

          {step === 0 ? (
            <Section title="Step 1：基本資料" desc="先確認活動名稱、分類及簡介。">
              <Input
                label="活動名稱"
                value={form.title_tc}
                onChange={(value) => updateField("title_tc", value)}
              />
              <Input
                label="活動分類"
                value={form.activity_category}
                onChange={(value) => updateField("activity_category", value)}
              />
              <Textarea
                label="短簡介"
                value={form.short_description_tc}
                onChange={(value) => updateField("short_description_tc", value)}
              />
              <Input
                label="標籤"
                value={form.tags}
                onChange={(value) => updateField("tags", value)}
                placeholder="AIRSIDE, 親子活動, 健康活動"
              />
            </Section>
          ) : null}

          {step === 1 ? (
            <Section title="Step 2：時間及地點" desc="日期、時間、地點和 Google Map 會直接影響家長搜尋。">
              <Input
                label="開始日期"
                type="date"
                value={form.start_date}
                onChange={(value) => updateField("start_date", value)}
              />
              <Input
                label="結束日期"
                type="date"
                value={form.end_date}
                onChange={(value) => updateField("end_date", value)}
              />
              <Input
                label="開始時間"
                type="time"
                value={form.start_time}
                onChange={(value) => updateField("start_time", value)}
              />
              <Input
                label="結束時間"
                type="time"
                value={form.end_time}
                onChange={(value) => updateField("end_time", value)}
              />
              <Input
                label="場地名稱"
                value={form.venue_name}
                onChange={(value) => updateField("venue_name", value)}
              />
              <Input
                label="詳細地址"
                value={form.address}
                onChange={(value) => updateField("address", value)}
              />
              <Input
                label="地區"
                value={form.area}
                onChange={(value) => updateField("area", value)}
              />
              <Input
                label="分區"
                value={form.district}
                onChange={(value) => updateField("district", value)}
              />
              <Input
                label="港鐵站"
                value={form.mtr_station}
                onChange={(value) => updateField("mtr_station", value)}
              />
              <Input
                label="Google Map URL"
                value={form.google_map_url}
                onChange={(value) => updateField("google_map_url", value)}
              />
              <Input
                label="Google Map Embed URL"
                value={form.google_map_embed_url}
                onChange={(value) => updateField("google_map_embed_url", value)}
              />
            </Section>
          ) : null}

          {step === 2 ? (
            <Section
              title="Step 3：Smart Image Manager"
              desc="一個入口管理所有圖片。第一張自動成為封面，最多 5 張，重複圖片會自動去除。"
            >
              <div className="md:col-span-2 rounded-3xl border border-purple-200 bg-purple-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-purple-950">一次上載圖片</h3>
                    <p className="mt-1 text-sm leading-6 text-purple-800">
                      可一次選擇多張圖片。最多 {MAX_IMAGES} 張，目前已有{" "}
                      {orderedImages.length} 張，仍可新增 {remainingSlots} 張。
                    </p>
                  </div>

                  <label
                    className={[
                      "inline-flex cursor-pointer items-center justify-center rounded-full px-5 py-3 text-sm font-black text-white",
                      remainingSlots > 0 && !uploading
                        ? "bg-purple-700 hover:bg-purple-800"
                        : "cursor-not-allowed bg-slate-300",
                    ].join(" ")}
                  >
                    {uploading ? "上載中..." : "選擇圖片"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={remainingSlots === 0 || uploading}
                      className="hidden"
                      onChange={handleMultipleFileChange}
                    />
                  </label>
                </div>

                <div className="mt-4 rounded-2xl border border-purple-200 bg-white/70 p-4 text-sm leading-6 text-purple-900">
                  <p className="font-black">圖片規則</p>
                  <p>
                    第一張 = 封面；其餘 = Gallery。系統會自動去重。建議 JPG / PNG /
                    WebP，單張 8MB 以下。
                  </p>
                </div>
              </div>

              {form.cover_image_url ? (
                <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-5 xl:flex-row">
                    <div className="xl:w-[58%]">
                      <h3 className="text-lg font-black text-slate-950">封面裁切預覽</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        只影響活動卡及 Hero 封面顯示，不會破壞原圖。Gallery
                        會保留完整圖片。
                      </p>

                      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                        <div className="relative aspect-video overflow-hidden bg-slate-200">
                          <img
                            src={form.cover_image_url}
                            alt="封面裁切預覽"
                            className="h-full w-full object-cover transition-transform duration-200"
                            style={coverCropStyle(form)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <h3 className="text-lg font-black text-slate-950">調整封面位置</h3>

                      <Slider
                        label={`放大 ${form.cover_image_zoom.toFixed(2)}x`}
                        min={1}
                        max={2.5}
                        step={0.05}
                        value={form.cover_image_zoom}
                        onChange={(value) => updateField("cover_image_zoom", value)}
                      />
                      <Slider
                        label={`左右 ${form.cover_image_offset_x}%`}
                        min={-50}
                        max={50}
                        step={1}
                        value={form.cover_image_offset_x}
                        onChange={(value) => updateField("cover_image_offset_x", value)}
                      />
                      <Slider
                        label={`上下 ${form.cover_image_offset_y}%`}
                        min={-50}
                        max={50}
                        step={1}
                        value={form.cover_image_offset_y}
                        onChange={(value) => updateField("cover_image_offset_y", value)}
                      />

                      <button
                        type="button"
                        onClick={resetCoverCrop}
                        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                      >
                        重設裁切
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-950">
                      圖片庫 {orderedImages.length} / {MAX_IMAGES}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      第一張會成為封面。用上移 / 下移控制順序，或直接設為封面。
                    </p>
                  </div>

                  {orderedImages.length ? (
                    <button
                      type="button"
                      onClick={() => setImageOrder([])}
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-black text-rose-700 hover:bg-rose-100"
                    >
                      清空全部圖片
                    </button>
                  ) : null}
                </div>

                {orderedImages.length ? (
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {orderedImages.map((image, index) => (
                      <div
                        key={`${image}-${index}`}
                        className="rounded-3xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-white p-2 sm:w-52">
                            <img
                              src={image}
                              alt={`活動圖片 ${index + 1}`}
                              className="max-h-full max-w-full rounded-xl object-contain"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={
                                  index === 0
                                    ? "rounded-full bg-purple-700 px-3 py-1 text-xs font-black text-white"
                                    : "rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"
                                }
                              >
                                {index === 0 ? "封面" : `圖片 ${index + 1}`}
                              </span>
                              {index === 0 ? (
                                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                                  用於活動卡
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-3 truncate text-xs font-bold text-slate-400">
                              {image}
                            </p>

                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => moveImage(index, "up")}
                                disabled={index === 0}
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-30"
                              >
                                上移
                              </button>
                              <button
                                type="button"
                                onClick={() => moveImage(index, "down")}
                                disabled={index === orderedImages.length - 1}
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-30"
                              >
                                下移
                              </button>
                              <button
                                type="button"
                                onClick={() => setAsCover(image)}
                                disabled={index === 0}
                                className="rounded-xl bg-purple-700 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300"
                              >
                                設為封面
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(image)}
                                className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white hover:bg-rose-700"
                              >
                                移除
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <p className="text-lg font-black text-slate-800">暫時未有圖片</p>
                    <p className="mt-2 text-sm text-slate-500">
                      請按上方「選擇圖片」上載。第一張會自動成為封面。
                    </p>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-white p-5">
                <button
                  type="button"
                  onClick={() => setShowAdvancedUrls((value) => !value)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      進階：圖片 URL 備用欄位
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      一般商戶不需要填。只在圖片由外部網站或 server-side import
                      帶入時使用。
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {showAdvancedUrls ? "收起" : "展開"}
                  </span>
                </button>

                {showAdvancedUrls ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Input
                      label="封面圖片 URL"
                      value={form.cover_image_url}
                      onChange={(value) => {
                        const nextImages = normalizeImages([value, ...form.gallery_image_urls]);
                        setImageOrder(nextImages);
                      }}
                    />

                    {form.gallery_image_urls.map((image, index) => (
                      <Input
                        key={index}
                        label={`Gallery 圖片 URL ${index + 1}`}
                        value={image}
                        onChange={(value) => addImageFromUrl(value, index)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </Section>
          ) : null}

          {step === 3 ? (
            <Section
              title="Step 4：收費、優惠、票種及名額"
              desc="選擇收費模式後，不需要填的欄位會變灰，避免商戶混淆。"
            >
              <div className="md:col-span-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {priceModes.map((mode) => (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => updateField("price_display_mode", mode.key)}
                    className={[
                      "rounded-3xl border p-4 text-left transition",
                      form.price_display_mode === mode.key
                        ? "border-purple-500 bg-purple-50 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <p className="text-base font-black text-slate-950">{mode.title}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{mode.desc}</p>
                  </button>
                ))}
              </div>

              <div className="md:col-span-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                <span className="font-black">即時公開顯示：</span>
                {formatPricePreview(form)}
              </div>

              <Input
                label="公開價錢摘要"
                value={form.price_label}
                disabled={isDisabledPriceField(form.price_display_mode, "price_label")}
                onChange={(value) => updateField("price_label", value)}
                placeholder="例如：早鳥優惠價 HK$50（原價 HK$90）"
              />
              <Input
                label="最低 / 固定收費 HK$"
                value={form.min_price}
                disabled={isDisabledPriceField(form.price_display_mode, "min_price")}
                onChange={(value) => updateField("min_price", value)}
              />
              <Input
                label="最高收費 HK$"
                value={form.max_price}
                disabled={isDisabledPriceField(form.price_display_mode, "max_price")}
                onChange={(value) => updateField("max_price", value)}
              />
              <Input
                label="優惠價 HK$"
                value={form.offer_price}
                disabled={isDisabledPriceField(form.price_display_mode, "offer_price")}
                onChange={(value) => updateField("offer_price", value)}
              />
              <Input
                label="原價 HK$"
                value={form.original_price}
                disabled={isDisabledPriceField(form.price_display_mode, "original_price")}
                onChange={(value) => updateField("original_price", value)}
              />
              <Input
                label="名額 / quota 摘要"
                value={form.quota_label}
                disabled={isDisabledPriceField(form.price_display_mode, "quota_label")}
                onChange={(value) => updateField("quota_label", value)}
                placeholder="例如：名額有限，先到先得，額滿即止"
              />
            </Section>
          ) : null}

          {step === 4 ? (
            <Section
              title="Step 5：報名 CTA"
              desc="CTA 會影響家長下一步行動，要清楚分辨官方頁、報名頁、WhatsApp 或無需報名。"
            >
              <div className="md:col-span-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {ctaTypes.map((type) => (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => {
                      updateField("cta_type", type.key);
                      updateField("cta_label", type.label);
                    }}
                    className={[
                      "rounded-3xl border p-4 text-left transition",
                      form.cta_type === type.key
                        ? "border-purple-500 bg-purple-50 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <p className="font-black text-slate-950">{type.title}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{type.desc}</p>
                  </button>
                ))}
              </div>

              <div className="md:col-span-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                <span className="font-black">即時 CTA 顯示：</span>
                {getCtaPreview(form)}
              </div>

              <Input
                label="CTA 按鈕文字"
                value={form.cta_label}
                onChange={(value) => updateField("cta_label", value)}
              />
              <Input
                label="報名 URL"
                value={form.registration_url}
                disabled={form.cta_type === "none" || form.cta_type === "contact"}
                onChange={(value) => updateField("registration_url", value)}
              />
              <Input
                label="Booking URL"
                value={form.booking_url}
                disabled={form.cta_type === "none" || form.cta_type === "contact"}
                onChange={(value) => updateField("booking_url", value)}
              />
              <Input
                label="官方活動頁"
                value={form.official_url}
                disabled={form.cta_type === "none"}
                onChange={(value) => updateField("official_url", value)}
              />
              <Input
                label="來源 URL"
                value={form.source_url}
                onChange={(value) => updateField("source_url", value)}
              />
              <Input
                label="聯絡電話"
                value={form.contact_phone}
                disabled={form.cta_type !== "contact"}
                onChange={(value) => updateField("contact_phone", value)}
              />
              <Input
                label="聯絡 Email"
                value={form.contact_email}
                disabled={form.cta_type !== "contact"}
                onChange={(value) => updateField("contact_email", value)}
              />
              <Input
                label="WhatsApp"
                value={form.whatsapp}
                disabled={form.cta_type !== "whatsapp" && form.cta_type !== "contact"}
                onChange={(value) => updateField("whatsapp", value)}
              />
            </Section>
          ) : null}

          {step === 5 ? (
            <Section
              title="Step 6：內容細節及提交"
              desc="最後檢查活動內容、注意事項、主辦資料及完整度。"
            >
              <Textarea
                label="詳細介紹"
                value={form.description_tc}
                onChange={(value) => updateField("description_tc", value)}
              />
              <Textarea
                label="活動亮點（一行一項）"
                value={form.highlights}
                onChange={(value) => updateField("highlights", value)}
              />
              <Textarea
                label="注意事項（一行一項）"
                value={form.terms}
                onChange={(value) => updateField("terms", value)}
              />
              <Textarea
                label="備註"
                value={form.remarks}
                onChange={(value) => updateField("remarks", value)}
              />
              <Input
                label="主辦方"
                value={form.organizer_name}
                onChange={(value) => updateField("organizer_name", value)}
              />
            </Section>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                上一步
              </button>

              <p className="text-sm font-black text-slate-500">
                Step {step + 1} / {steps.length}
              </p>

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
                  className="rounded-full bg-purple-700 px-5 py-2 text-sm font-black text-white hover:bg-purple-800"
                >
                  下一步
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => saveEvent()}
                  disabled={saving}
                  className="rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  儲存草稿
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black text-purple-700">即時 Preview</p>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  狀態：{statusLabel(eventRecord.status)}
                </p>
              </div>
              <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                家長看到的大約效果
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode("card")}
                className={[
                  "rounded-full px-3 py-2 text-xs font-black",
                  previewMode === "card" ? "bg-purple-700 text-white" : "bg-slate-100 text-slate-600",
                ].join(" ")}
              >
                Card
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("detail")}
                className={[
                  "rounded-full px-3 py-2 text-xs font-black",
                  previewMode === "detail"
                    ? "bg-purple-700 text-white"
                    : "bg-slate-100 text-slate-600",
                ].join(" ")}
              >
                Detail
              </button>
            </div>

            <PreviewCard form={form} images={orderedImages} mode={previewMode} />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">公開頁關鍵資料</h2>
              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-black",
                  ready.score >= 80
                    ? "bg-emerald-50 text-emerald-700"
                    : ready.score >= 60
                    ? "bg-amber-50 text-amber-700"
                    : "bg-rose-50 text-rose-700",
                ].join(" ")}
              >
                {ready.score}%
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {ready.checks.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                >
                  <span className="font-black text-slate-500">{item.key}</span>
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

            {ready.missing.length ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                <p className="font-black">提交前要補齊：</p>
                <p>{ready.missing.join("、")}</p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                主要資料已齊，可以提交審批。
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-purple-200 bg-purple-50 p-5 text-sm leading-6 text-purple-900">
            <p className="font-black">Smart Image Manager</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>一個上載入口，避免商戶搞錯欄位。</li>
              <li>第一張圖片自動成為封面。</li>
              <li>系統自動去重，最多保留 5 張。</li>
              <li>URL 欄位已收起，減少非技術商戶混亂。</li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}

function PreviewCard({
  form,
  images,
  mode,
}: {
  form: FormState;
  images: string[];
  mode: "card" | "detail";
}) {
  const hero = form.cover_image_url || images[0] || "";

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className={mode === "detail" ? "aspect-video bg-slate-50" : "aspect-[4/3] bg-slate-50"}>
        {hero ? (
          <div className="relative h-full w-full overflow-hidden bg-slate-100">
            <img
              src={hero}
              alt={form.title_tc || "活動圖片"}
              className="h-full w-full object-cover transition-transform duration-200"
              style={coverCropStyle(form)}
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 text-5xl">
            親
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
            {form.activity_category || "親子活動"}
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
            {statusLabel("draft")}
          </span>
        </div>

        <h3 className="text-xl font-black leading-snug text-slate-950">
          {form.title_tc || "未命名活動"}
        </h3>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
          {form.short_description_tc || form.description_tc || "活動簡介會顯示在這裡。"}
        </p>

        <div className="mt-4 grid gap-2 text-xs text-slate-600">
          <PreviewRow
            label="日期"
            value={`${form.start_date || "未填"}${form.end_date ? ` 至 ${form.end_date}` : ""}`}
          />
          <PreviewRow label="地點" value={form.venue_name || form.address || "未填"} />
          <PreviewRow label="收費" value={formatPricePreview(form)} />
          <PreviewRow label="報名方式" value={getCtaPreview(form)} />
        </div>

        {mode === "detail" && images.length ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {images.slice(0, 5).map((image, index) => (
              <div key={`${image}-${index}`} className="aspect-video overflow-hidden rounded-xl bg-slate-50">
                <img
                  src={image}
                  alt={`Gallery ${index + 1}`}
                  className="h-full w-full object-contain"
                />
              </div>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          className="mt-5 w-full rounded-2xl bg-purple-700 px-4 py-3 text-sm font-black text-white"
        >
          {getCtaPreview(form)}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className={disabled ? "opacity-45" : ""}>
      <span className="text-xs font-black text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={[
          "mt-1 w-full rounded-2xl border px-4 py-3 text-sm outline-none",
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : "border-slate-300 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100",
        ].join(" ")}
      />
      {disabled ? (
        <span className="mt-1 block text-xs font-bold text-slate-400">
          目前模式不需要填此欄。
        </span>
      ) : null}
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="md:col-span-2">
      <span className="text-xs font-black text-slate-600">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
      />
    </label>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-600">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-purple-700"
      />
    </label>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2 rounded-2xl bg-slate-50 px-3 py-2">
      <span className="font-black text-slate-400">{label}</span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  );
}