"use client";

import type {
  ChangeEvent,
  CSSProperties,
  Dispatch,
  FormEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  SetStateAction,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crop,
  Eye,
  ImageIcon,
  Languages,
  Loader2,
  MapPin,
  Move,
  Phone,
  RotateCcw,
  RotateCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Ticket,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  AREA_SELECT_OPTIONS,
  DISTRICT_SELECT_OPTIONS,
  getAreaByZh,
} from "@/lib/locationOptions";

type MerchantProfile = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: string | null;
};

type EditableEvent = {
  id: string;
  merchant_id: string | null;
  title_tc: string | null;
  short_description_tc: string | null;
  description_tc: string | null;
  organizer_name: string | null;
  category: string | null;
  tags: string[] | null;

  cover_image_url: string | null;
  cover_image_focus_x: number | string | null;
  cover_image_focus_y: number | string | null;
  cover_image_zoom: number | string | null;
  cover_image_offset_x: number | string | null;
  cover_image_offset_y: number | string | null;
  cover_image_rotate: number | string | null;
  cover_image_flip_x: boolean | null;
  cover_image_flip_y: boolean | null;
  cover_image_filter: string | null;
  cover_image_brightness: number | string | null;
  cover_image_contrast: number | string | null;
  cover_image_saturation: number | string | null;
  cover_image_vignette: number | string | null;
  gallery_image_urls: string[] | null;

  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  address: string | null;
  district: string | null;
  mtr_station: string | null;
  google_map_url: string | null;

  price_type: string | null;
  price_min: number | null;
  price_max: number | null;
  registration_required: boolean | null;
  registration_url: string | null;
  booking_method: string | null;
  booking_note: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;

  age_groups: string[] | null;
  risk_level: string | null;
  parent_requirement: string | null;
  is_indoor: boolean | null;
  is_outdoor: boolean | null;
  is_water_activity: boolean | null;
  is_physical_activity: boolean | null;
  is_sen_friendly: boolean | null;
  refund_policy: string | null;
  reschedule_policy: string | null;
  weather_policy: string | null;

  show_on_calendar: boolean | null;
  hidden_pending_confirmation: boolean | null;
  is_free: boolean | null;
  language_available: string[] | null;

  source_type: string | null;
  source_url: string | null;
  source_file_url: string | null;
  status: string | null;
  admin_review_note: string | null;
};

type FormState = {
  title_tc: string;
  short_description_tc: string;
  description_tc: string;
  organizer_name: string;
  category: string;
  tagsText: string;

  cover_image_url: string;
  cover_image_focus_x: number;
  cover_image_focus_y: number;
  cover_image_zoom: number;
  cover_image_offset_x: number;
  cover_image_offset_y: number;
  cover_image_rotate: number;
  cover_image_flip_x: boolean;
  cover_image_flip_y: boolean;
  cover_image_filter: string;
  cover_image_brightness: number;
  cover_image_contrast: number;
  cover_image_saturation: number;
  cover_image_vignette: number;
  gallery_image_urls: string[];

  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  address: string;
  district: string;
  mtr_station: string;
  google_map_url: string;

  price_type: string;
  price_min: string;
  price_max: string;
  registration_required: boolean;
  registration_url: string;
  booking_method: string;
  booking_note: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_email: string;

  age_groups: string[];
  risk_level: string;
  parent_requirement: string;
  is_indoor: boolean;
  is_outdoor: boolean;
  is_water_activity: boolean;
  is_physical_activity: boolean;
  is_sen_friendly: boolean;
  refund_policy: string;
  reschedule_policy: string;
  weather_policy: string;

  show_on_calendar: boolean;
  hidden_pending_confirmation: boolean;
  language_available: string[];
};

type ImageEditorDraft = {
  offsetX: number;
  offsetY: number;
  zoom: number;
  rotate: number;
  flipX: boolean;
  flipY: boolean;
  filter: string;
  brightness: number;
  contrast: number;
  saturation: number;
  vignette: number;
};

type EditorTab = "crop" | "filter" | "adjust";

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80";

const MIN_ZOOM = 1.15;
const MAX_ZOOM = 3;
const MAX_GALLERY_IMAGES = 7;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const CATEGORIES = [
  "親子活動",
  "商場活動",
  "免費活動",
  "親子閱讀",
  "室內活動",
  "戶外探索",
  "藝術手作",
  "STEM",
  "運動體驗",
  "音樂表演",
  "節日市集",
  "展覽",
  "親子工作坊",
];

const PRICE_TYPES = [
  { value: "unknown", label: "收費待確認", hint: "適合 URL 匯入後未確認價格" },
  { value: "free", label: "免費", hint: "商場、圖書館、社區免費活動" },
  { value: "paid", label: "收費", hint: "需要填最低及最高收費" },
  { value: "mixed", label: "免費及收費", hint: "部分免費、部分需付費" },
];

const BOOKING_METHODS = [
  { value: "none", label: "無需報名", hint: "活動可直接到場或只作資訊展示" },
  { value: "platform", label: "本平台報名", hint: "未來可接 HK Family Fun booking" },
  { value: "external", label: "外部連結報名", hint: "Google Form / Klook / Eventbrite" },
  { value: "contact", label: "聯絡商戶報名", hint: "WhatsApp / 電話 / Email" },
];

const RISK_LEVELS = [
  { value: "low", label: "低風險" },
  { value: "medium", label: "中風險" },
  { value: "high", label: "高風險" },
];

const PARENT_REQUIREMENTS = [
  { value: "not_specified", label: "未指定" },
  { value: "parent_required", label: "必須家長陪同" },
  { value: "parent_optional", label: "建議家長陪同" },
  { value: "drop_off_allowed", label: "可獨立參加 / Drop-off" },
];

const AGE_GROUPS = ["0-2歲", "3-5歲", "6-8歲", "9-12歲", "13-17歲", "全年齡"];

const LANGUAGE_OPTIONS = [
  { value: "tc", label: "繁中" },
  { value: "sc", label: "簡中" },
  { value: "en", label: "English" },
];

const STEPS = [
  { id: 1, title: "基本資料", subtitle: "內容、分類、圖片" },
  { id: 2, title: "日期地點", subtitle: "時間、地址、地區" },
  { id: 3, title: "安全政策", subtitle: "年齡、風險、政策" },
  { id: 4, title: "報名發布", subtitle: "收費、報名、提交" },
];

const FILTER_PRESETS = [
  { value: "original", label: "原圖", brightness: 100, contrast: 100, saturation: 100 },
  { value: "studio", label: "柔和", brightness: 108, contrast: 108, saturation: 105 },
  { value: "spotlight", label: "明亮", brightness: 112, contrast: 115, saturation: 100 },
  { value: "prime", label: "鮮明", brightness: 104, contrast: 106, saturation: 112 },
  { value: "classic", label: "經典", brightness: 98, contrast: 108, saturation: 88 },
  { value: "edge", label: "高對比", brightness: 100, contrast: 125, saturation: 105 },
  { value: "luminate", label: "亮彩", brightness: 116, contrast: 100, saturation: 108 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: number | string | null | undefined, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function toStringNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function getSafeArray(value: string[] | null | undefined) {
  if (!Array.isArray(value)) return [];
  return value.filter(Boolean);
}

function normalizeTags(tagsText: string) {
  return tagsText
    .split(/[,，、#\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function tagsToText(tags: string[] | null | undefined) {
  if (!Array.isArray(tags)) return "";
  return tags.join("、");
}

function getMaxOffset(zoom: number, boxWidth = 900, boxHeight = 506) {
  const safeZoom = Math.max(MIN_ZOOM, zoom);
  return {
    x: Math.round(((safeZoom - 1) * boxWidth) / 2),
    y: Math.round(((safeZoom - 1) * boxHeight) / 2),
  };
}

function clampOffset(offsetX: number, offsetY: number, zoom: number) {
  const maxOffset = getMaxOffset(zoom);
  return {
    offsetX: Math.round(clamp(offsetX, -maxOffset.x, maxOffset.x)),
    offsetY: Math.round(clamp(offsetY, -maxOffset.y, maxOffset.y)),
  };
}

function getImageEditorStyle(draft: Pick<
  ImageEditorDraft,
  | "offsetX"
  | "offsetY"
  | "zoom"
  | "rotate"
  | "flipX"
  | "flipY"
  | "brightness"
  | "contrast"
  | "saturation"
>): CSSProperties {
  const scaleX = draft.flipX ? -1 : 1;
  const scaleY = draft.flipY ? -1 : 1;

  return {
    transform: `translate3d(${draft.offsetX}px, ${draft.offsetY}px, 0) rotate(${draft.rotate}deg) scale(${draft.zoom * scaleX}, ${draft.zoom * scaleY})`,
    transformOrigin: "center center",
    filter: `brightness(${draft.brightness}%) contrast(${draft.contrast}%) saturate(${draft.saturation}%)`,
  };
}

function buildInitialFormState(event: EditableEvent): FormState {
  const zoom = Math.max(MIN_ZOOM, toNumber(event.cover_image_zoom, MIN_ZOOM));
  const offsetX = toNumber(event.cover_image_offset_x, 0);
  const offsetY = toNumber(event.cover_image_offset_y, 0);
  const safeOffset = clampOffset(offsetX, offsetY, zoom);
  const languages = getSafeArray(event.language_available);

  return {
    title_tc: cleanString(event.title_tc),
    short_description_tc: cleanString(event.short_description_tc),
    description_tc: cleanString(event.description_tc),
    organizer_name: cleanString(event.organizer_name),
    category: cleanString(event.category, "親子活動"),
    tagsText: tagsToText(event.tags),

    cover_image_url: cleanString(event.cover_image_url, DEFAULT_COVER_IMAGE),
    cover_image_focus_x: toNumber(event.cover_image_focus_x, 50),
    cover_image_focus_y: toNumber(event.cover_image_focus_y, 50),
    cover_image_zoom: zoom,
    cover_image_offset_x: safeOffset.offsetX,
    cover_image_offset_y: safeOffset.offsetY,
    cover_image_rotate: toNumber(event.cover_image_rotate, 0),
    cover_image_flip_x: Boolean(event.cover_image_flip_x),
    cover_image_flip_y: Boolean(event.cover_image_flip_y),
    cover_image_filter: cleanString(event.cover_image_filter, "original"),
    cover_image_brightness: toNumber(event.cover_image_brightness, 100),
    cover_image_contrast: toNumber(event.cover_image_contrast, 100),
    cover_image_saturation: toNumber(event.cover_image_saturation, 100),
    cover_image_vignette: toNumber(event.cover_image_vignette, 0),
    gallery_image_urls: getSafeArray(event.gallery_image_urls),

    start_date: toDateInput(event.start_date),
    end_date: toDateInput(event.end_date),
    start_time: cleanString(event.start_time),
    end_time: cleanString(event.end_time),
    venue_name: cleanString(event.venue_name),
    address: cleanString(event.address),
    district: cleanString(event.district, "待確認"),
    mtr_station: cleanString(event.mtr_station, "待確認"),
    google_map_url: cleanString(event.google_map_url),

    price_type: cleanString(event.price_type, "unknown"),
    price_min: toStringNumber(event.price_min),
    price_max: toStringNumber(event.price_max),
    registration_required: Boolean(event.registration_required),
    registration_url: cleanString(event.registration_url),
    booking_method: cleanString(event.booking_method, "none"),
    booking_note: cleanString(event.booking_note),
    contact_phone: cleanString(event.contact_phone),
    contact_whatsapp: cleanString(event.contact_whatsapp),
    contact_email: cleanString(event.contact_email),

    age_groups: getSafeArray(event.age_groups),
    risk_level: cleanString(event.risk_level, "low"),
    parent_requirement: cleanString(event.parent_requirement, "not_specified"),
    is_indoor: Boolean(event.is_indoor),
    is_outdoor: Boolean(event.is_outdoor),
    is_water_activity: Boolean(event.is_water_activity),
    is_physical_activity: Boolean(event.is_physical_activity),
    is_sen_friendly: Boolean(event.is_sen_friendly),
    refund_policy: cleanString(event.refund_policy),
    reschedule_policy: cleanString(event.reschedule_policy),
    weather_policy: cleanString(event.weather_policy),

    show_on_calendar: event.show_on_calendar !== false,
    hidden_pending_confirmation: Boolean(event.hidden_pending_confirmation),
    language_available: languages.length ? languages : ["tc"],
  };
}

function getStatusLabel(status: string | null | undefined) {
  if (status === "draft") return "草稿";
  if (status === "submitted") return "審批中";
  if (status === "published") return "已發布";
  if (status === "rejected") return "待修改";
  if (status === "archived") return "已封存";
  return "待確認";
}

function getStatusClass(status: string | null | undefined) {
  if (status === "published") return "bg-green-100 text-green-700";
  if (status === "submitted") return "bg-blue-100 text-blue-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "archived") return "bg-slate-100 text-slate-600";
  return "bg-amber-100 text-amber-700";
}

function getPriceLabel(form: FormState) {
  if (form.price_type === "free") return "免費";
  if (form.price_type === "paid") {
    if (form.price_min && form.price_max) return `HK$${form.price_min} - HK$${form.price_max}`;
    if (form.price_min) return `HK$${form.price_min} 起`;
    if (form.price_max) return `最高 HK$${form.price_max}`;
    return "收費";
  }
  if (form.price_type === "mixed") {
    if (form.price_min || form.price_max) {
      return `免費及收費 HK$${form.price_min || "0"} - HK$${form.price_max || "待確認"}`;
    }
    return "免費及收費";
  }
  return "收費待確認";
}

function getBookingMethodLabel(value: string) {
  return BOOKING_METHODS.find((item) => item.value === value)?.label || "未指定";
}

function validateBeforeSubmit(form: FormState) {
  const missing: string[] = [];
  if (!form.title_tc.trim()) missing.push("活動標題");
  if (!form.short_description_tc.trim()) missing.push("活動簡介");
  if (!form.start_date.trim()) missing.push("開始日期");
  if (!form.venue_name.trim()) missing.push("場地名稱");
  if (!form.district.trim() || form.district === "待確認") missing.push("地區");
  if (!form.price_type || form.price_type === "unknown") missing.push("收費類型");
  if (form.booking_method === "external" && !form.registration_url.trim()) missing.push("外部報名 URL");
  if (
    form.booking_method === "contact" &&
    !form.contact_phone.trim() &&
    !form.contact_whatsapp.trim() &&
    !form.contact_email.trim()
  ) {
    missing.push("聯絡商戶報名方式");
  }
  return missing;
}

function getFileExtension(file: File) {
  const nameParts = file.name.split(".");
  const extensionFromName = nameParts.length > 1 ? nameParts.pop() : "";
  if (extensionFromName) return extensionFromName.toLowerCase();
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "file";
}

function isImageFile(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

function formToEditorDraft(form: FormState): ImageEditorDraft {
  return {
    offsetX: form.cover_image_offset_x,
    offsetY: form.cover_image_offset_y,
    zoom: Math.max(MIN_ZOOM, form.cover_image_zoom),
    rotate: form.cover_image_rotate,
    flipX: form.cover_image_flip_x,
    flipY: form.cover_image_flip_y,
    filter: form.cover_image_filter || "original",
    brightness: form.cover_image_brightness,
    contrast: form.cover_image_contrast,
    saturation: form.cover_image_saturation,
    vignette: form.cover_image_vignette,
  };
}

export default function MerchantEventEditPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = typeof params?.id === "string" ? params.id : "";

  const [step, setStep] = useState(1);
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [event, setEvent] = useState<EditableEvent | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<ImageEditorDraft | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedAreaDetail = useMemo(() => {
    if (!form?.mtr_station || form.mtr_station === "待確認") return null;
    return getAreaByZh(form.mtr_station);
  }, [form?.mtr_station]);

  const completion = useMemo(() => {
    if (!form) return 0;
    const checks = [
      Boolean(form.title_tc.trim()),
      Boolean(form.short_description_tc.trim()),
      Boolean(form.cover_image_url.trim()),
      Boolean(form.start_date.trim()),
      Boolean(form.venue_name.trim()),
      Boolean(form.district.trim() && form.district !== "待確認"),
      Boolean(form.price_type && form.price_type !== "unknown"),
      Boolean(form.booking_method),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form]);

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function loadPage() {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!supabase) {
        setErrorMessage("Supabase client 未能初始化。請檢查 .env.local。");
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/merchant/login");
        return;
      }

      const { data: merchantData, error: merchantError } = await supabase
        .from("merchants")
        .select("id, business_name, contact_name, contact_email, status")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (merchantError) {
        setErrorMessage(merchantError.message);
        setIsLoading(false);
        return;
      }

      if (!merchantData) {
        router.replace("/merchant/register");
        return;
      }

      const merchantRecord = merchantData as MerchantProfile;
      setMerchant(merchantRecord);

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .eq("merchant_id", merchantRecord.id)
        .maybeSingle();

      if (eventError) {
        setErrorMessage(eventError.message);
        setIsLoading(false);
        return;
      }

      if (!eventData) {
        setErrorMessage("找不到活動，或此活動不屬於你的商戶帳戶。");
        setIsLoading(false);
        return;
      }

      const loadedEvent = eventData as EditableEvent;
      const initialForm = buildInitialFormState(loadedEvent);
      setEvent(loadedEvent);
      setForm(initialForm);
      setEditorDraft(formToEditorDraft(initialForm));
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "載入活動資料時發生未知錯誤。");
      setIsLoading(false);
    }
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      if (!current) return current;
      return { ...current, [key]: value };
    });
  }

  function openImageEditor() {
    if (!form) return;
    setEditorDraft(formToEditorDraft(form));
    setIsImageEditorOpen(true);
  }

  function applyImageEditorDraft() {
    if (!editorDraft) return;

    const safeZoom = Math.max(MIN_ZOOM, editorDraft.zoom);
    const safeOffset = clampOffset(editorDraft.offsetX, editorDraft.offsetY, safeZoom);

    updateForm("cover_image_offset_x", safeOffset.offsetX);
    updateForm("cover_image_offset_y", safeOffset.offsetY);
    updateForm("cover_image_zoom", safeZoom);
    updateForm("cover_image_rotate", editorDraft.rotate);
    updateForm("cover_image_flip_x", editorDraft.flipX);
    updateForm("cover_image_flip_y", editorDraft.flipY);
    updateForm("cover_image_filter", editorDraft.filter);
    updateForm("cover_image_brightness", editorDraft.brightness);
    updateForm("cover_image_contrast", editorDraft.contrast);
    updateForm("cover_image_saturation", editorDraft.saturation);
    updateForm("cover_image_vignette", editorDraft.vignette);

    setIsImageEditorOpen(false);
    setSuccessMessage("圖片設定已更新。請按「儲存草稿」保存到資料庫。");
  }

  function resetEditorDraft() {
    setEditorDraft({
      offsetX: 0,
      offsetY: 0,
      zoom: MIN_ZOOM,
      rotate: 0,
      flipX: false,
      flipY: false,
      filter: "original",
      brightness: 100,
      contrast: 100,
      saturation: 100,
      vignette: 0,
    });
  }

  function handleAreaChange(nextArea: string) {
    updateForm("mtr_station", nextArea);

    if (nextArea === "待確認") {
      updateForm("district", "待確認");
      return;
    }

    if (nextArea === "全港" || nextArea === "多區" || nextArea === "網上") {
      updateForm("district", nextArea);
      return;
    }

    const matchedArea = getAreaByZh(nextArea);
    if (matchedArea) updateForm("district", matchedArea.districtZh);
  }

  function handleDistrictChange(nextDistrict: string) {
    if (!form) return;
    updateForm("district", nextDistrict);

    const matchedArea = getAreaByZh(form.mtr_station);
    if (matchedArea && matchedArea.districtZh !== nextDistrict) {
      updateForm("mtr_station", "待確認");
    }
  }

  function toggleArrayValue<K extends "age_groups" | "language_available">(
    key: K,
    value: string
  ) {
    if (!form) return;
    const current = form[key];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

    updateForm(key, next as FormState[K]);
  }

  async function uploadImageFile(file: File, folder: "cover" | "gallery") {
    if (!supabase) throw new Error("Supabase client 未能初始化。");
    if (!merchant || !eventId) throw new Error("商戶或活動資料未載入。");

    if (!isImageFile(file)) throw new Error("只支援 JPG、PNG、WebP 圖片。");
    if (file.size > MAX_FILE_SIZE_BYTES) throw new Error(`圖片不可大於 ${MAX_FILE_SIZE_MB}MB。`);

    const extension = getFileExtension(file);
    const safeFileName = `${folder}-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const storagePath = `${merchant.id}/events/${eventId}/${safeFileName}`;

    const { error } = await supabase.storage
      .from("event-images")
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage.from("event-images").getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async function handleCoverUpload(eventInput: ChangeEvent<HTMLInputElement>) {
    const file = eventInput.target.files?.[0];
    if (!file) return;

    setErrorMessage("");
    setSuccessMessage("");
    setIsUploadingCover(true);

    try {
      const publicUrl = await uploadImageFile(file, "cover");
      updateForm("cover_image_url", publicUrl);
      updateForm("cover_image_focus_x", 50);
      updateForm("cover_image_focus_y", 50);
      updateForm("cover_image_zoom", MIN_ZOOM);
      updateForm("cover_image_offset_x", 0);
      updateForm("cover_image_offset_y", 0);
      updateForm("cover_image_rotate", 0);
      updateForm("cover_image_flip_x", false);
      updateForm("cover_image_flip_y", false);
      updateForm("cover_image_filter", "original");
      updateForm("cover_image_brightness", 100);
      updateForm("cover_image_contrast", 100);
      updateForm("cover_image_saturation", 100);
      updateForm("cover_image_vignette", 0);
      setSuccessMessage("封面圖片已上載。可按「Edit image」調整圖片。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "上載封面圖片時發生錯誤。");
    } finally {
      setIsUploadingCover(false);
      eventInput.target.value = "";
    }
  }

  async function handleGalleryUpload(eventInput: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(eventInput.target.files || []);
    if (!files.length || !form) return;

    setErrorMessage("");
    setSuccessMessage("");

    if (form.gallery_image_urls.length >= MAX_GALLERY_IMAGES) {
      setErrorMessage(`Gallery 最多只可上載 ${MAX_GALLERY_IMAGES} 張圖片。`);
      eventInput.target.value = "";
      return;
    }

    const remainingSlots = MAX_GALLERY_IMAGES - form.gallery_image_urls.length;
    const filesToUpload = files.slice(0, remainingSlots);
    setIsUploadingGallery(true);

    try {
      const uploadedUrls: string[] = [];
      for (const file of filesToUpload) {
        const publicUrl = await uploadImageFile(file, "gallery");
        uploadedUrls.push(publicUrl);
      }

      updateForm("gallery_image_urls", [...form.gallery_image_urls, ...uploadedUrls]);
      setSuccessMessage(`已上載 ${uploadedUrls.length} 張 Gallery 圖片。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "上載 Gallery 圖片時發生錯誤。");
    } finally {
      setIsUploadingGallery(false);
      eventInput.target.value = "";
    }
  }

  function removeGalleryImage(imageUrl: string) {
    if (!form) return;
    updateForm("gallery_image_urls", form.gallery_image_urls.filter((url) => url !== imageUrl));
  }

  function buildPayload(nextStatus?: string) {
    if (!form) return null;

    const priceMin = form.price_min.trim() === "" ? null : Number(form.price_min.trim());
    const priceMax = form.price_max.trim() === "" ? null : Number(form.price_max.trim());
    const finalPriceType = form.price_type || "unknown";
    const safeZoom = Math.max(MIN_ZOOM, form.cover_image_zoom);
    const safeOffset = clampOffset(form.cover_image_offset_x, form.cover_image_offset_y, safeZoom);

    const registrationRequired =
      form.booking_method === "external" ||
      form.booking_method === "platform" ||
      form.booking_method === "contact" ||
      form.registration_required;

    return {
      title_tc: form.title_tc.trim(),
      short_description_tc: form.short_description_tc.trim(),
      description_tc: form.description_tc.trim(),
      organizer_name: form.organizer_name.trim(),
      category: form.category,
      tags: normalizeTags(form.tagsText),

      cover_image_url: form.cover_image_url.trim() || DEFAULT_COVER_IMAGE,
      cover_image_focus_x: 50,
      cover_image_focus_y: 50,
      cover_image_zoom: safeZoom,
      cover_image_offset_x: safeOffset.offsetX,
      cover_image_offset_y: safeOffset.offsetY,
      cover_image_rotate: form.cover_image_rotate,
      cover_image_flip_x: form.cover_image_flip_x,
      cover_image_flip_y: form.cover_image_flip_y,
      cover_image_filter: form.cover_image_filter || "original",
      cover_image_brightness: form.cover_image_brightness,
      cover_image_contrast: form.cover_image_contrast,
      cover_image_saturation: form.cover_image_saturation,
      cover_image_vignette: form.cover_image_vignette,
      gallery_image_urls: form.gallery_image_urls,

      start_date: form.start_date || null,
      end_date: form.end_date || null,
      start_time: form.start_time.trim() || null,
      end_time: form.end_time.trim() || null,
      venue_name: form.venue_name.trim(),
      address: form.address.trim(),
      district: form.district,
      mtr_station: form.mtr_station,
      google_map_url: form.google_map_url.trim() || null,

      price_type: finalPriceType,
      price_min: Number.isFinite(priceMin) ? priceMin : null,
      price_max: Number.isFinite(priceMax) ? priceMax : null,
      is_free: finalPriceType === "free",
      registration_required: registrationRequired,
      registration_url: form.registration_url.trim() || null,
      booking_method: form.booking_method,
      booking_note: form.booking_note.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      contact_whatsapp: form.contact_whatsapp.trim() || null,
      contact_email: form.contact_email.trim() || null,

      age_groups: form.age_groups,
      risk_level: form.risk_level,
      parent_requirement: form.parent_requirement,
      is_indoor: form.is_indoor,
      is_outdoor: form.is_outdoor,
      is_water_activity: form.is_water_activity,
      is_physical_activity: form.is_physical_activity,
      is_sen_friendly: form.is_sen_friendly,
      refund_policy: form.refund_policy.trim() || null,
      reschedule_policy: form.reschedule_policy.trim() || null,
      weather_policy: form.weather_policy.trim() || null,

      show_on_calendar: form.show_on_calendar,
      hidden_pending_confirmation: form.hidden_pending_confirmation,
      language_available: form.language_available.length ? form.language_available : ["tc"],

      status: nextStatus || event?.status || "draft",
      submitted_at: nextStatus === "submitted" ? new Date().toISOString() : undefined,
      merchant_confirmed_at: nextStatus === "submitted" ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    };
  }

  async function saveEvent(nextStatus?: string, redirectTo預覽 = false) {
    if (!form || !eventId || !supabase) return false;

    setErrorMessage("");
    setSuccessMessage("");

    if (nextStatus === "submitted") {
      const missing = validateBeforeSubmit(form);
      if (missing.length) {
        setErrorMessage(`提交前必須補充：${missing.join("、")}。`);
        return false;
      }
    }

    const payload = buildPayload(nextStatus);
    if (!payload) return false;
    setIsSaving(true);

    try {
      const { error } = await supabase.from("events").update(payload).eq("id", eventId);

      if (error) {
        setErrorMessage(error.message);
        setIsSaving(false);
        return false;
      }

      setEvent((current) => {
        if (!current) return current;
        return { ...current, ...(payload as Partial<EditableEvent>), status: nextStatus || current.status };
      });

      setSuccessMessage(nextStatus === "submitted" ? "活動已提交 HK Family Fun 審批。" : "活動資料已儲存。");
      setIsSaving(false);

      if (redirectTo預覽) router.push(`/merchant/events/${eventId}/preview`);
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存活動資料時發生未知錯誤。");
      setIsSaving(false);
      return false;
    }
  }

  async function handleSubmit(eventInput: FormEvent<HTMLFormElement>) {
    eventInput.preventDefault();
    await saveEvent();
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
            正在載入活動編輯頁...
          </div>
        </div>
      </main>
    );
  }

  if (!form || !event) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
          {errorMessage || "未能載入活動資料。"}
        </div>
      </main>
    );
  }

  const statusLabel = getStatusLabel(event.status);
  const priceLabel = getPriceLabel(form);
  const bookingLabel = getBookingMethodLabel(form.booking_method);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={() => router.push("/merchant/dashboard")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            返回 商戶管理頁
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push(`/merchant/events/${eventId}/preview`)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <Eye className="h-4 w-4" />
              預覽
            </button>

            <button
              type="button"
              onClick={() => saveEvent()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              儲存草稿
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative p-6 md:p-8">
              <div className="absolute left-0 top-0 h-36 w-36 rounded-full bg-primary-100 blur-3xl" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-xs font-black text-primary-600">
                  <Sparkles className="h-4 w-4" />
                  HK Family Fun 商戶活動管理
                </div>

                <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h1 className="text-3xl font-black text-slate-950">修改活動資料</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      用 4 步完成活動資料。商戶可自行修改內容、上載圖片、使用 LinkedIn 式圖片編輯器、
                      補政策資料，再提交 HK Family Fun 審批。
                    </p>
                  </div>

                  <span className={`w-fit rounded-full px-4 py-2 text-sm font-black ${getStatusClass(event.status)}`}>
                    {statusLabel}
                  </span>
                </div>

                {event.admin_review_note ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                    <div className="font-black">Admin Review Note</div>
                    <div className="mt-1">{event.admin_review_note}</div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-950 p-6 text-white lg:border-l lg:border-t-0 md:p-8">
              <div className="text-sm font-bold text-slate-300">資料完成度</div>

              <div className="mt-3 flex items-end gap-3">
                <div className="text-5xl font-black">{completion}%</div>
                <div className="pb-2 text-sm text-slate-400">提交前建議達 80% 以上</div>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-primary-400" style={{ width: `${completion}%` }} />
              </div>

              <div className="mt-6 grid gap-2">
                <MiniCheck done={Boolean(form.title_tc.trim())} text="活動標題" />
                <MiniCheck done={Boolean(form.start_date.trim())} text="開始日期" />
                <MiniCheck done={Boolean(form.district && form.district !== "待確認")} text="District" />
                <MiniCheck done={Boolean(form.price_type && form.price_type !== "unknown")} text="收費類型" />
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <section className="flex gap-2 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </section>
        ) : null}

        {successMessage ? (
          <section className="flex gap-2 rounded-3xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            {STEPS.map((item) => {
              const active = step === item.id;
              const done = step > item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStep(item.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-primary-300 bg-primary-50"
                      : done
                      ? "border-green-200 bg-green-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                        active
                          ? "bg-primary-500 text-white"
                          : done
                          ? "bg-green-500 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.id}
                    </span>
                    <span className="text-sm font-black text-slate-950">{item.title}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{item.subtitle}</p>
                </button>
              );
            })}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <section className="space-y-6">
            {step === 1 ? (
              <StepOneBasic
                form={form}
                updateForm={updateForm}
                handleCoverUpload={handleCoverUpload}
                handleGalleryUpload={handleGalleryUpload}
                removeGalleryImage={removeGalleryImage}
                isUploadingCover={isUploadingCover}
                isUploadingGallery={isUploadingGallery}
                openImageEditor={openImageEditor}
              />
            ) : null}

            {step === 2 ? (
              <StepTwoLocation
                form={form}
                updateForm={updateForm}
                handleAreaChange={handleAreaChange}
                handleDistrictChange={handleDistrictChange}
                selectedAreaDetail={selectedAreaDetail}
              />
            ) : null}

            {step === 3 ? (
              <StepThreePolicy form={form} updateForm={updateForm} toggleArrayValue={toggleArrayValue} />
            ) : null}

            {step === 4 ? (
              <StepFourBooking form={form} updateForm={updateForm} toggleArrayValue={toggleArrayValue} />
            ) : null}

            <div className="flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={step === 1}
                onClick={() => setStep((current) => Math.max(1, current - 1))}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                上一步
              </button>

              <div className="text-center text-sm font-bold text-slate-500">步驟 {step} / 4</div>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.min(4, current + 1))}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-black text-white hover:bg-primary-600"
                >
                  下一步
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => saveEvent("submitted", true)}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-black text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  儲存並提交審批
                </button>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <Live預覽Card form={form} statusLabel={statusLabel} priceLabel={priceLabel} bookingLabel={bookingLabel} />

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                <Sparkles className="h-5 w-5 text-primary-500" />
                商戶提示
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>1. 封面圖片建議使用橫圖，重要文字不要太貼邊。</p>
                <p>2. 按「Edit image」可像 LinkedIn 一樣 crop、filter、adjust。</p>
                <p>3. 調整後要按「儲存草稿」，設定才會寫入 Supabase。</p>
              </div>
            </section>

            <section className="rounded-[2rem] border border-primary-200 bg-primary-50 p-5">
              <h2 className="text-lg font-black text-primary-700">SaaS 付費價值</h2>
              <div className="mt-4 space-y-2 text-sm leading-6 text-primary-800">
                <p>• 自主更新活動資料</p>
                <p>• 一個活動可由草稿、審批、發布全流程管理</p>
                <p>• LinkedIn 式圖片編輯器</p>
                <p>• 支援外部報名 link，減少重複輸入</p>
                <p>• 下一階段可加入 featured placement 及數據報表</p>
              </div>
            </section>
          </aside>
        </form>

        {isImageEditorOpen && editorDraft ? (
          <ImageEditorModal
            imageUrl={form.cover_image_url || DEFAULT_COVER_IMAGE}
            draft={editorDraft}
            setDraft={setEditorDraft}
            onClose={() => setIsImageEditorOpen(false)}
            onApply={applyImageEditorDraft}
            onReset={resetEditorDraft}
          />
        ) : null}
      </div>
    </main>
  );
}

function StepOneBasic({
  form,
  updateForm,
  handleCoverUpload,
  handleGalleryUpload,
  removeGalleryImage,
  isUploadingCover,
  isUploadingGallery,
  openImageEditor,
}: {
  form: FormState;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  handleCoverUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  handleGalleryUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  removeGalleryImage: (url: string) => void;
  isUploadingCover: boolean;
  isUploadingGallery: boolean;
  openImageEditor: () => void;
}) {
  return (
    <Panel icon={<ImageIcon className="h-5 w-5" />} title="Step 1：基本資料" subtitle="活動內容、圖片、分類及 Tags">
      <div className="grid gap-5">
        <TextField label="活動標題" required value={form.title_tc} onChange={(value) => updateForm("title_tc", value)} />

        <TextAreaField label="活動簡介" required rows={3} value={form.short_description_tc} onChange={(value) => updateForm("short_description_tc", value)} />

        <TextAreaField label="活動詳情" rows={7} value={form.description_tc} onChange={(value) => updateForm("description_tc", value)} />

        <TextField label="主辦單位" value={form.organizer_name} onChange={(value) => updateForm("organizer_name", value)} />

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-black text-slate-800">活動分類</span>
            <select
              value={form.category}
              onChange={(event) => updateForm("category", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <TextField
            label="標籤 Tags"
            value={form.tagsText}
            onChange={(value) => updateForm("tagsText", value)}
            help="可用逗號、# 或頓號分開。"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="flex-1">
              <div className="text-sm font-black text-slate-800">封面圖片 Cover Image</div>

              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-4 py-5 text-sm font-bold text-slate-600 hover:border-primary-300 hover:bg-primary-50/40">
                {isUploadingCover ? <Loader2 className="h-5 w-5 animate-spin text-primary-500" /> : <UploadCloud className="h-5 w-5 text-primary-500" />}
                {isUploadingCover ? "正在上載封面..." : "上載封面圖片"}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverUpload} className="hidden" />
              </label>

              <TextField
                label="或貼上封面圖片 URL"
                value={form.cover_image_url}
                onChange={(value) => updateForm("cover_image_url", value)}
                placeholder="https://..."
                help="支援外部圖片 URL 或 Supabase Storage 圖片 URL。"
              />

              <button
                type="button"
                onClick={openImageEditor}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
              >
                <Crop className="h-4 w-4" />
                Edit image
              </button>
            </div>

            <div className="w-full lg:w-80">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.cover_image_url || DEFAULT_COVER_IMAGE}
                    alt="Cover preview"
                    className="h-full w-full select-none object-cover"
                    style={getImageEditorStyle(formToEditorDraft(form))}
                  />
                  {form.cover_image_vignette > 0 ? (
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: `radial-gradient(circle, transparent 45%, rgba(0,0,0,${form.cover_image_vignette / 120}) 100%)`,
                      }}
                    />
                  ) : null}
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-primary-600">
                    Cover 預覽
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500">
                X: {form.cover_image_offset_x}px・Y: {form.cover_image_offset_y}px・Zoom: {form.cover_image_zoom.toFixed(2)}x
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-black text-slate-800">相片集</div>
              <div className="mt-1 text-xs text-slate-500">最多 {MAX_GALLERY_IMAGES} 張。</div>
            </div>

            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
              {isUploadingGallery ? <Loader2 className="h-4 w-4 animate-spin text-primary-500" /> : <UploadCloud className="h-4 w-4 text-primary-500" />}
              {isUploadingGallery ? "上載中..." : "上載 Gallery"}
              <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleGalleryUpload} className="hidden" />
            </label>
          </div>

          {form.gallery_image_urls.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {form.gallery_image_urls.map((url) => (
                <div key={url} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Gallery" className="h-28 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(url)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
              暫未加入 Gallery 圖片。
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function ImageEditorModal({
  imageUrl,
  draft,
  setDraft,
  onClose,
  onApply,
  onReset,
}: {
  imageUrl: string;
  draft: ImageEditorDraft;
  setDraft: Dispatch<SetStateAction<ImageEditorDraft | null>>;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const [activeTab, setActiveTab] = useState<EditorTab>("crop");
  const dragRef = useRef({
    isDragging: false,
    startClientX: 0,
    startClientY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  function clampDraft(next: ImageEditorDraft) {
    const safeZoom = clamp(next.zoom, MIN_ZOOM, MAX_ZOOM);
    const safeOffset = clampOffset(next.offsetX, next.offsetY, safeZoom);
    return {
      ...next,
      zoom: safeZoom,
      offsetX: safeOffset.offsetX,
      offsetY: safeOffset.offsetY,
    };
  }

  function updateDraft(patch: Partial<ImageEditorDraft>) {
    setDraft((current) => {
      if (!current) return current;
      return clampDraft({
        ...current,
        ...patch,
      });
    });
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // no-op
    }

    dragRef.current = {
      isDragging: true,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: draft.offsetX,
      startOffsetY: draft.offsetY,
    };
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.isDragging) return;

    const deltaX = event.clientX - dragRef.current.startClientX;
    const deltaY = event.clientY - dragRef.current.startClientY;

    updateDraft({
      offsetX: dragRef.current.startOffsetX + deltaX,
      offsetY: dragRef.current.startOffsetY + deltaY,
    });
  }

  function stopDrag(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current.isDragging = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // no-op
    }
  }

  function nudge(direction: "left" | "right" | "up" | "down") {
    const step = 14;
    updateDraft({
      offsetX:
        direction === "left"
          ? draft.offsetX - step
          : direction === "right"
          ? draft.offsetX + step
          : draft.offsetX,
      offsetY:
        direction === "up"
          ? draft.offsetY - step
          : direction === "down"
          ? draft.offsetY + step
          : draft.offsetY,
    });
  }

  function rotate(delta: number) {
    updateDraft({
      rotate: (draft.rotate + delta + 360) % 360,
    });
  }

  function applyPreset(presetValue: string) {
    const preset = FILTER_PRESETS.find((item) => item.value === presetValue);
    if (!preset) return;

    updateDraft({
      filter: preset.value,
      brightness: preset.brightness,
      contrast: preset.contrast,
      saturation: preset.saturation,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-3 py-4">
      <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">編輯圖片</h2>
            <p className="mt-1 text-sm text-slate-500">
              裁剪、濾鏡及調整封面圖片。系統會儲存圖片顯示設定。
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1fr_360px]">
          <div className="min-h-0 bg-slate-300 p-4 md:p-8">
            <div
              role="button"
              tabIndex={0}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
              className="relative mx-auto aspect-[16/9] h-auto max-h-[68vh] w-full cursor-grab touch-none overflow-hidden bg-slate-200 shadow-2xl active:cursor-grabbing"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl || DEFAULT_COVER_IMAGE}
                alt="圖片編輯預覽"
                draggable={false}
                className="h-full w-full select-none object-cover"
                style={getImageEditorStyle(draft)}
              />

              {draft.vignette > 0 ? (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `radial-gradient(circle, transparent 45%, rgba(0,0,0,${draft.vignette / 120}) 100%)`,
                  }}
                />
              ) : null}

              <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-white/45" />
              <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-white/45" />

              <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-black text-slate-700 shadow-sm">
                <Move className="h-4 w-4" />
                Drag image
              </div>
            </div>
          </div>

          <aside className="overflow-y-auto border-t border-slate-200 p-5 lg:border-l lg:border-t-0">
            <div className="grid grid-cols-3 border-b border-slate-200 text-sm font-black text-slate-600">
              {(["crop", "filter", "adjust"] as EditorTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-3 capitalize ${
                    activeTab === tab
                      ? "border-b-2 border-slate-950 text-slate-950"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab === "crop" ? "裁剪" : tab === "filter" ? "濾鏡" : "調整"}
                </button>
              ))}
            </div>

            {activeTab === "crop" ? (
              <div className="mt-6 space-y-6">
                <div className="flex gap-3">
                  <IconToolButton label="向左旋轉" onClick={() => rotate(-90)}>
                    <RotateCcw className="h-5 w-5" />
                  </IconToolButton>
                  <IconToolButton label="向右旋轉" onClick={() => rotate(90)}>
                    <RotateCw className="h-5 w-5" />
                  </IconToolButton>
                  <IconToolButton label="水平翻轉" onClick={() => updateDraft({ flipX: !draft.flipX })}>
                    <span className="text-lg font-black">↔</span>
                  </IconToolButton>
                  <IconToolButton label="垂直翻轉" onClick={() => updateDraft({ flipY: !draft.flipY })}>
                    <span className="text-lg font-black">↕</span>
                  </IconToolButton>
                </div>

                <EditorSlider
                  label="縮放"
                  value={draft.zoom}
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  display={`${draft.zoom.toFixed(2)}x`}
                  onChange={(value) => updateDraft({ zoom: value })}
                  leftIcon={<ZoomOut className="h-4 w-4" />}
                  rightIcon={<ZoomIn className="h-4 w-4" />}
                />

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => nudge("left")} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">←向左</button>
                  <button type="button" onClick={() => nudge("right")} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">向右→</button>
                  <button type="button" onClick={() => nudge("up")} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">↑向上</button>
                  <button type="button" onClick={() => nudge("down")} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">向下↓</button>
                </div>
              </div>
            ) : null}

            {activeTab === "filter" ? (
              <div className="mt-6 grid grid-cols-3 gap-4">
                {FILTER_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => applyPreset(preset.value)}
                    className={`rounded-2xl border p-2 text-center text-xs font-bold ${
                      draft.filter === preset.value
                        ? "border-primary-400 bg-primary-50 text-primary-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl || DEFAULT_COVER_IMAGE}
                        alt={preset.label}
                        className="h-full w-full object-cover"
                        style={{
                          filter: `brightness(${preset.brightness}%) contrast(${preset.contrast}%) saturate(${preset.saturation}%)`,
                        }}
                      />
                    </div>
                    <div className="mt-2">{preset.label}</div>
                  </button>
                ))}
              </div>
            ) : null}

            {activeTab === "adjust" ? (
              <div className="mt-6 space-y-6">
                <EditorSlider label="亮度" value={draft.brightness} min={50} max={150} step={1} display={`${draft.brightness}%`} onChange={(value) => updateDraft({ brightness: value, filter: "custom" })} />
                <EditorSlider label="對比" value={draft.contrast} min={50} max={160} step={1} display={`${draft.contrast}%`} onChange={(value) => updateDraft({ contrast: value, filter: "custom" })} />
                <EditorSlider label="飽和度" value={draft.saturation} min={0} max={180} step={1} display={`${draft.saturation}%`} onChange={(value) => updateDraft({ saturation: value, filter: "custom" })} />
                <EditorSlider label="暗角" value={draft.vignette} min={0} max={80} step={1} display={`${draft.vignette}`} onChange={(value) => updateDraft({ vignette: value })} />
              </div>
            ) : null}

            <div className="mt-8 grid gap-3">
              <button type="button" onClick={onApply} className="rounded-2xl bg-primary-500 px-5 py-3 text-sm font-black text-white hover:bg-primary-600">
                Save changes
              </button>
              <button type="button" onClick={onReset} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Reset image
              </button>
              <button type="button" onClick={onClose} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StepTwoLocation({
  form,
  updateForm,
  handleAreaChange,
  handleDistrictChange,
  selectedAreaDetail,
}: {
  form: FormState;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  handleAreaChange: (value: string) => void;
  handleDistrictChange: (value: string) => void;
  selectedAreaDetail: ReturnType<typeof getAreaByZh>;
}) {
  return (
    <Panel icon={<CalendarDays className="h-5 w-5" />} title="Step 2：日期、時間及地點" subtitle="讓家長快速知道活動何時、在哪裡舉行">
      <div className="grid gap-5 md:grid-cols-2">
        <TextField label="開始日期" required type="date" value={form.start_date} onChange={(value) => updateForm("start_date", value)} />
        <TextField label="結束日期" type="date" value={form.end_date} onChange={(value) => updateForm("end_date", value)} />
        <TextField label="開始時間" value={form.start_time} onChange={(value) => updateForm("start_time", value)} />
        <TextField label="結束時間" value={form.end_time} onChange={(value) => updateForm("end_time", value)} />
        <TextField label="場地名稱" required value={form.venue_name} onChange={(value) => updateForm("venue_name", value)} />
        <TextField label="Google Map URL" value={form.google_map_url} onChange={(value) => updateForm("google_map_url", value)} />

        <label className="block">
          <span className="text-sm font-black text-slate-800">地區 District</span>
          <select value={form.district} onChange={(event) => handleDistrictChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100">
            {DISTRICT_SELECT_OPTIONS.map((district) => (
              <option key={district.zh} value={district.zh}>{district.zh} / {district.en}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-black text-slate-800">地點 / 港鐵站 Area</span>
          <select value={form.mtr_station || "待確認"} onChange={(event) => handleAreaChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100">
            {AREA_SELECT_OPTIONS.map((area) => (
              <option key={`${area.zh}-${area.en}`} value={area.zh}>
                {area.zh} / {area.en}
                {"districtZh" in area && area.districtZh ? ` — ${area.districtZh}` : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="md:col-span-2">
          <TextField label="詳細地址" value={form.address} onChange={(value) => updateForm("address", value)} />
          {selectedAreaDetail ? (
            <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-700">
              已選擇：{selectedAreaDetail.zh} / {selectedAreaDetail.en}，District：{selectedAreaDetail.districtZh}，Region：{selectedAreaDetail.regionZh}
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function StepThreePolicy({
  form,
  updateForm,
  toggleArrayValue,
}: {
  form: FormState;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleArrayValue: <K extends "age_groups" | "language_available">(key: K, value: string) => void;
}) {
  return (
    <Panel icon={<ShieldCheck className="h-5 w-5" />} title="Step 3：安全及政策" subtitle="清楚列明年齡、風險、退款及天氣安排">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-black text-slate-800">風險等級</span>
          <select value={form.risk_level} onChange={(event) => updateForm("risk_level", event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100">
            {RISK_LEVELS.map((risk) => <option key={risk.value} value={risk.value}>{risk.label}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-black text-slate-800">家長陪同要求</span>
          <select value={form.parent_requirement} onChange={(event) => updateForm("parent_requirement", event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100">
            {PARENT_REQUIREMENTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>

        <div className="md:col-span-2">
          <div className="text-sm font-black text-slate-800">適合年齡組別</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {AGE_GROUPS.map((age) => (
              <TogglePill key={age} active={form.age_groups.includes(age)} onClick={() => toggleArrayValue("age_groups", age)}>
                {age}
              </TogglePill>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="text-sm font-black text-slate-800">活動類型標記</div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <CheckCard checked={form.is_outdoor} title="戶外活動" note="公園、戶外市集、郊遊" onChange={(checked) => updateForm("is_outdoor", checked)} />
            <CheckCard checked={form.is_water_activity} title="水上活動" note="泳池、沙灘、水上體驗" onChange={(checked) => updateForm("is_water_activity", checked)} />
            <CheckCard checked={form.is_physical_activity} title="體能活動" note="運動、攀爬、競技活動" onChange={(checked) => updateForm("is_physical_activity", checked)} />
          </div>
        </div>

        <div className="md:col-span-2">
          <TextAreaField label="退款政策" rows={3} value={form.refund_policy} onChange={(value) => updateForm("refund_policy", value)} />
        </div>
        <div className="md:col-span-2">
          <TextAreaField label="改期 / 取消政策" rows={3} value={form.reschedule_policy} onChange={(value) => updateForm("reschedule_policy", value)} />
        </div>
        <div className="md:col-span-2">
          <TextAreaField label="天氣政策" rows={3} value={form.weather_policy} onChange={(value) => updateForm("weather_policy", value)} />
        </div>
      </div>
    </Panel>
  );
}

function StepFourBooking({
  form,
  updateForm,
  toggleArrayValue,
}: {
  form: FormState;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleArrayValue: <K extends "age_groups" | "language_available">(key: K, value: string) => void;
}) {
  return (
    <Panel icon={<Ticket className="h-5 w-5" />} title="Step 4：收費、報名及提交" subtitle="決定家長怎樣報名、如何聯絡、是否顯示在日曆">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {PRICE_TYPES.map((item) => (
            <button key={item.value} type="button" onClick={() => updateForm("price_type", item.value)} className={`rounded-3xl border p-4 text-left transition ${form.price_type === item.value ? "border-primary-400 bg-primary-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <div className="text-sm font-black text-slate-950">{item.label}</div>
              <div className="mt-2 text-xs leading-5 text-slate-500">{item.hint}</div>
            </button>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <TextField label="最低收費 HK$" value={form.price_min} onChange={(value) => updateForm("price_min", value)} type="number" />
          <TextField label="最高收費 HK$" value={form.price_max} onChange={(value) => updateForm("price_max", value)} type="number" />
        </div>

        <div>
          <div className="text-sm font-black text-slate-800">報名方式</div>
          <div className="mt-3 grid gap-4 md:grid-cols-4">
            {BOOKING_METHODS.map((item) => (
              <button key={item.value} type="button" onClick={() => { updateForm("booking_method", item.value); updateForm("registration_required", item.value !== "none"); }} className={`rounded-3xl border p-4 text-left transition ${form.booking_method === item.value ? "border-primary-400 bg-primary-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                <div className="text-sm font-black text-slate-950">{item.label}</div>
                <div className="mt-2 text-xs leading-5 text-slate-500">{item.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <TextField label="報名 URL" value={form.registration_url} onChange={(value) => updateForm("registration_url", value)} />
          <TextField label="報名備註" value={form.booking_note} onChange={(value) => updateForm("booking_note", value)} />
          <TextField label="聯絡電話" value={form.contact_phone} onChange={(value) => updateForm("contact_phone", value)} />
          <TextField label="WhatsApp" value={form.contact_whatsapp} onChange={(value) => updateForm("contact_whatsapp", value)} />
          <TextField label="聯絡 Email" value={form.contact_email} onChange={(value) => updateForm("contact_email", value)} />
        </div>

        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-800">
            <Languages className="h-4 w-4 text-primary-500" />
            可顯示語言
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((language) => (
              <TogglePill key={language.value} active={form.language_available.includes(language.value)} onClick={() => toggleArrayValue("language_available", language.value)}>
                {language.label}
              </TogglePill>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <CheckCard checked={form.registration_required} title="需要預先報名" note="會在活動頁提醒家長先報名" onChange={(checked) => updateForm("registration_required", checked)} />
          <CheckCard checked={form.is_indoor} title="室內活動" note="適合炎熱或下雨天篩選" onChange={(checked) => updateForm("is_indoor", checked)} />
          <CheckCard checked={form.is_sen_friendly} title="SEN 友善" note="只有資料清楚提及時才勾選" onChange={(checked) => updateForm("is_sen_friendly", checked)} />
          <CheckCard checked={form.show_on_calendar} title="顯示在日曆" note="活動日期會出現在日曆功能" onChange={(checked) => updateForm("show_on_calendar", checked)} />
          <CheckCard checked={form.hidden_pending_confirmation} title="隱藏待確認資訊" note="避免顯示未確認的收費、時間或地址" onChange={(checked) => updateForm("hidden_pending_confirmation", checked)} />
        </div>
      </div>
    </Panel>
  );
}

function Live預覽Card({
  form,
  statusLabel,
  priceLabel,
  bookingLabel,
}: {
  form: FormState;
  statusLabel: string;
  priceLabel: string;
  bookingLabel: string;
}) {
  const draft = formToEditorDraft(form);

  return (
    <section className="sticky top-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black text-primary-600">即時預覽</div>
          <h2 className="mt-1 text-xl font-black text-slate-950">家長看到的大約效果</h2>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">{statusLabel}</span>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={form.cover_image_url || DEFAULT_COVER_IMAGE}
            alt="預覽"
            className="h-full w-full select-none object-cover"
            style={getImageEditorStyle(draft)}
          />
          {form.cover_image_vignette > 0 ? (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(circle, transparent 45%, rgba(0,0,0,${form.cover_image_vignette / 120}) 100%)`,
              }}
            />
          ) : null}
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-primary-600">{form.category || "親子活動"}</span>
        </div>

        <div className="p-5">
          <h3 className="text-xl font-black leading-snug text-slate-950">{form.title_tc || "活動標題"}</h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{form.short_description_tc || "活動簡介會顯示在這裡。"}</p>

          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <預覽Line icon={<CalendarDays className="h-4 w-4" />} label="日期及時間" value={`${form.start_date || "日期待確認"} ${form.end_date ? `至 ${form.end_date}` : ""}・${form.start_time || "時間待確認"}${form.end_time ? ` - ${form.end_time}` : ""}`} />
            <預覽Line icon={<MapPin className="h-4 w-4" />} label="地點" value={`${form.venue_name || "地點待確認"}・${form.district || "地區待確認"}・${form.mtr_station || "港鐵站待確認"}`} />
            <預覽Line icon={<Ticket className="h-4 w-4" />} label="收費" value={priceLabel} />
            <預覽Line icon={<Phone className="h-4 w-4" />} label="報名方式" value={bookingLabel} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Panel({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">{icon}</div>
        <div>
          <h2 className="text-2xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  help,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  help?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-800">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
      />
      {help ? <p className="mt-2 text-xs leading-5 text-slate-500">{help}</p> : null}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-800">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
      />
    </label>
  );
}

function TogglePill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
        active ? "border-primary-400 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function CheckCard({
  checked,
  title,
  note,
  onChange,
}: {
  checked: boolean;
  title: string;
  note: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`flex cursor-pointer gap-3 rounded-3xl border p-4 transition ${checked ? "border-primary-300 bg-primary-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600" />
      <span>
        <span className="block text-sm font-black text-slate-950">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{note}</span>
      </span>
    </label>
  );
}

function 預覽Line({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-primary-500">{icon}</div>
      <div>
        <div className="text-xs font-black text-slate-500">{label}</div>
        <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function MiniCheck({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${done ? "bg-green-400 text-white" : "bg-white/10 text-slate-500"}`}>
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      </span>
      <span className={done ? "text-slate-200" : "text-slate-500"}>{text}</span>
    </div>
  );
}

function IconToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function EditorSlider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  leftIcon,
  rightIcon,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm font-bold text-slate-700">
        <span>{label}</span>
        <span>{display}</span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-slate-400">{leftIcon}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-primary-500"
        />
        <span className="text-slate-400">{rightIcon}</span>
      </div>
    </div>
  );
}