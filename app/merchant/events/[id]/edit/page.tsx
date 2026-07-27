"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type PublicEvent = {
  id: string;
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
  is_free: boolean | null;

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
  language_available: string[] | null;

  source_type: string | null;
  source_url: string | null;
  source_file_url: string | null;

  status: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ImageDisplaySettings = {
  offsetX: number;
  offsetY: number;
  zoom: number;
  rotate: number;
  flipX: boolean;
  flipY: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  vignette: number;
};

type RegistrationState =
  | "external_link"
  | "contact_required"
  | "platform_coming"
  | "walk_in"
  | "no_registration"
  | "not_available";

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80";

const MIN_ZOOM = 1;

function toNumber(value: number | string | null | undefined, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function safeText(value: string | null | undefined, fallback: string) {
  const text = value?.trim();
  return text ? text : fallback;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "日期待確認";

  try {
    return new Intl.DateTimeFormat("zh-HK", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
    }).format(new Date(value));
  } catch {
    return value.slice(0, 10);
  }
}

function formatDateRange(event: PublicEvent) {
  const start = formatDate(event.start_date);
  const end = event.end_date ? formatDate(event.end_date) : "";

  if (!event.start_date && !event.end_date) return "日期待確認";
  if (!end || end === start) return start;
  return `${start} 至 ${end}`;
}

function formatTimeRange(event: PublicEvent) {
  if (event.start_time && event.end_time) return `${event.start_time} - ${event.end_time}`;
  if (event.start_time) return `${event.start_time} 開始`;
  if (event.end_time) return `${event.end_time} 結束`;
  return "時間待確認";
}

function formatPrice(event: PublicEvent) {
  if (event.price_type === "free" || event.is_free) return "免費";

  if (event.price_type === "paid") {
    if (event.price_min !== null && event.price_min !== undefined && event.price_max !== null && event.price_max !== undefined) {
      return `HK$${event.price_min} - HK$${event.price_max}`;
    }

    if (event.price_min !== null && event.price_min !== undefined) return `HK$${event.price_min} 起`;
    if (event.price_max !== null && event.price_max !== undefined) return `最高 HK$${event.price_max}`;
    return "收費";
  }

  if (event.price_type === "mixed") {
    if (event.price_min !== null && event.price_min !== undefined && event.price_max !== null && event.price_max !== undefined) {
      return `免費及收費 HK$${event.price_min} - HK$${event.price_max}`;
    }

    if (event.price_min !== null && event.price_min !== undefined) return `免費及收費，HK$${event.price_min} 起`;
    return "免費及收費";
  }

  return "收費待確認";
}

function getRiskLabel(value: string | null | undefined) {
  if (value === "low") return "低風險";
  if (value === "medium") return "中風險";
  if (value === "high") return "高風險";
  return "未指定";
}

function getParentRequirementLabel(value: string | null | undefined) {
  if (value === "parent_required") return "必須家長陪同";
  if (value === "parent_optional") return "建議家長陪同";
  if (value === "drop_off_allowed") return "可獨立參加 / Drop-off";
  return "未指定";
}

function getActivityTypeLabel(event: PublicEvent) {
  const types: string[] = [];

  if (event.is_indoor) types.push("室內");
  if (event.is_outdoor) types.push("戶外");
  if (event.is_water_activity) types.push("水上活動");
  if (event.is_physical_activity) types.push("體能活動");
  if (event.is_sen_friendly) types.push("SEN 友善");

  return types.length ? types.join("、") : "未指定";
}

function getAgeGroupLabel(event: PublicEvent) {
  if (!Array.isArray(event.age_groups) || event.age_groups.length === 0) return "未指定";
  return event.age_groups.join("、");
}

function getTags(event: PublicEvent) {
  const tags = Array.isArray(event.tags) ? event.tags.filter(Boolean) : [];
  const baseTags = tags.length ? tags : [safeText(event.category, "親子活動")];

  if (event.is_indoor && !baseTags.includes("室內")) baseTags.push("室內");
  if (event.is_sen_friendly && !baseTags.includes("SEN 友善")) baseTags.push("SEN 友善");

  return Array.from(new Set(baseTags)).slice(0, 10);
}

function getImageSettings(event: PublicEvent): ImageDisplaySettings {
  return {
    offsetX: toNumber(event.cover_image_offset_x, 0),
    offsetY: toNumber(event.cover_image_offset_y, 0),
    zoom: Math.max(MIN_ZOOM, toNumber(event.cover_image_zoom, 1)),
    rotate: toNumber(event.cover_image_rotate, 0),
    flipX: Boolean(event.cover_image_flip_x),
    flipY: Boolean(event.cover_image_flip_y),
    brightness: toNumber(event.cover_image_brightness, 100),
    contrast: toNumber(event.cover_image_contrast, 100),
    saturation: toNumber(event.cover_image_saturation, 100),
    vignette: toNumber(event.cover_image_vignette, 0),
  };
}

function getCoverImageStyle(settings: ImageDisplaySettings): React.CSSProperties {
  const scaleX = settings.flipX ? -1 : 1;
  const scaleY = settings.flipY ? -1 : 1;

  return {
    transform: `translate3d(${settings.offsetX}px, ${settings.offsetY}px, 0) rotate(${settings.rotate}deg) scale(${settings.zoom * scaleX}, ${settings.zoom * scaleY})`,
    transformOrigin: "center center",
    filter: `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`,
  };
}

function getRegistrationState(event: PublicEvent): RegistrationState {
  const bookingMethod = event.booking_method || "none";
  const actionUrl = getPrimaryActionUrl(event);

  if (event.status !== "published") return "not_available";

  if (actionUrl && (bookingMethod === "external" || bookingMethod === "platform" || event.registration_required || event.source_url)) {
    return "external_link";
  }

  if (bookingMethod === "contact") return "contact_required";

  if (bookingMethod === "platform" && !registrationUrl) return "platform_coming";

  if (event.registration_required && !registrationUrl) return "contact_required";

  if (bookingMethod === "none" || event.registration_required === false) return "no_registration";

  return "no_registration";
}

function getRegistrationText(event: PublicEvent) {
  const state = getRegistrationState(event);

  if (state === "external_link") {
    return {
      title: "報名方式",
      description: "請按下方按鈕前往主辦方提供的網站、活動頁或報名表格，完成報名或查看最新安排。",
      buttonText: getPrimaryActionLabel(event),
      showButton: true,
      disabled: false,
    };
  }

  if (state === "contact_required") {
    return {
      title: "報名方式",
      description: "此活動需要先向主辦方查詢或報名。請使用下方聯絡資料確認名額及安排。",
      buttonText: "請向主辦查詢",
      showButton: false,
      disabled: true,
    };
  }

  if (state === "platform_coming") {
    return {
      title: "報名方式",
      description: "本平台報名功能仍在準備中。請先向主辦方查詢最新報名安排。",
      buttonText: "報名功能準備中",
      showButton: false,
      disabled: true,
    };
  }

  if (state === "not_available") {
    return {
      title: "報名方式",
      description: "此活動暫未開放公開報名。",
      buttonText: "暫未開放",
      showButton: false,
      disabled: true,
    };
  }

  return {
    title: "報名方式",
    description: "此活動顯示為無需預先報名。出發前仍建議向主辦方確認最新安排。",
    buttonText: "無需報名",
    showButton: false,
    disabled: true,
  };
}

function isExternalHttpUrl(url: string | null | undefined) {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

function getPrimaryActionUrl(event: PublicEvent) {
  const registrationUrl = event.registration_url?.trim();
  const sourceUrl = event.source_url?.trim();

  if (isExternalHttpUrl(registrationUrl)) return registrationUrl;
  if (isExternalHttpUrl(sourceUrl)) return sourceUrl;

  return "";
}

function getPrimaryActionLabel(event: PublicEvent) {
  if (isExternalHttpUrl(event.registration_url)) return "前往報名";
  if (isExternalHttpUrl(event.source_url)) return "前往主辦方活動頁";
  return "請向主辦查詢";
}

export default function PublicEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = typeof params?.id === "string" ? params.id : "";

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function loadEvent() {
    if (!supabase) {
      setErrorMessage("Supabase client 未能初始化。");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage("找不到此活動。");
        setIsLoading(false);
        return;
      }

      const loadedEvent = data as PublicEvent;

      if (loadedEvent.status !== "published") {
        setErrorMessage("此活動尚未公開或已封存。");
        setIsLoading(false);
        return;
      }

      setEvent(loadedEvent);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "載入活動資料時發生未知錯誤。");
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            正在載入活動資料...
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage || !event) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-2xl font-black text-slate-950">活動暫未能顯示</div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{errorMessage || "找不到此活動。"}</p>
          <button
            type="button"
            onClick={() => router.push("/events")}
            className="mt-6 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-black text-white hover:bg-primary-600"
          >
            返回搜尋活動
          </button>
        </div>
      </main>
    );
  }

  const coverImage = event.cover_image_url || DEFAULT_COVER_IMAGE;
  const imageSettings = getImageSettings(event);
  const registration = getRegistrationText(event);
  const registrationState = getRegistrationState(event);
  const primaryActionUrl = getPrimaryActionUrl(event);
  const tags = getTags(event);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950">
        <div className="relative h-[340px] overflow-hidden md:h-[420px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImage}
            alt={safeText(event.title_tc, "活動封面圖片")}
            className="h-full w-full select-none object-cover"
            style={getCoverImageStyle(imageSettings)}
          />

          {imageSettings.vignette > 0 ? (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${imageSettings.vignette / 100}) 100%)`,
              }}
            />
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto max-w-7xl px-4 pb-8">
              <div className="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-black text-primary-600">
                {safeText(event.category, "親子活動")}
              </div>

              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-white md:text-5xl">
                {safeText(event.title_tc, "未命名活動")}
              </h1>

              <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-white/90">
                {safeText(event.short_description_tc, "活動簡介待確認。")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">活動詳情</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
              {safeText(event.description_tc, safeText(event.short_description_tc, "活動詳情待確認。"))}
            </p>
          </section>

          {Array.isArray(event.gallery_image_urls) && event.gallery_image_urls.length > 0 ? (
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">活動相片</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {event.gallery_image_urls.slice(0, 7).map((url) => (
                  <div key={url} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="活動相片" className="aspect-[16/10] w-full object-cover" />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">安全及政策</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoBox title="適合年齡" value={getAgeGroupLabel(event)} />
              <InfoBox title="風險等級" value={getRiskLabel(event.risk_level)} />
              <InfoBox title="家長陪同" value={getParentRequirementLabel(event.parent_requirement)} />
              <InfoBox title="活動屬性" value={getActivityTypeLabel(event)} />
            </div>

            <div className="mt-5 grid gap-4">
              {event.refund_policy ? <PolicyBox title="退款政策" value={event.refund_policy} /> : null}
              {event.reschedule_policy ? <PolicyBox title="改期 / 取消政策" value={event.reschedule_policy} /> : null}
              {event.weather_policy ? <PolicyBox title="天氣政策" value={event.weather_policy} /> : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-800">
            <div className="font-black">家長留意事項</div>
            <p className="mt-2">
              HK Family Fun 會盡力整理活動資料，但活動日期、名額、收費、報名及取消安排可能由主辦方更新。
              出發或付款前，請以主辦方最新公布為準。
            </p>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">活動資料</h2>

            <div className="mt-5 space-y-5">
              <DetailItem title="日期及時間" value={`${formatDateRange(event)}・${formatTimeRange(event)}`} />
              <DetailItem title="地點" value={safeText(event.venue_name, "地點待確認")} />
              <DetailItem title="詳細地址" value={safeText(event.address, "地址待確認")} />
              <DetailItem title="地區" value={`${safeText(event.district, "地區待確認")}・${safeText(event.mtr_station, "港鐵站待確認")}`} />
              <DetailItem title="收費" value={formatPrice(event)} />
              <DetailItem title="主辦單位" value={safeText(event.organizer_name, "主辦單位待確認")} />
            </div>

            {isExternalHttpUrl(event.google_map_url) ? (
              <a
                href={event.google_map_url || "#"}
                target="_blank"
                rel="noreferrer"
                className="mt-5 block rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                查看地圖
              </a>
            ) : null}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">{registration.title}</h2>

            <p className="mt-3 text-sm leading-7 text-slate-600">{registration.description}</p>

            {registration.showButton && isExternalHttpUrl(primaryActionUrl) ? (
              <a
                href={primaryActionUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 block rounded-2xl bg-primary-500 px-5 py-3 text-center text-sm font-black text-white hover:bg-primary-600"
              >
                {registration.buttonText}
              </a>
            ) : (
              <div
                className={`mt-5 rounded-2xl px-5 py-3 text-center text-sm font-black ${
                  registrationState === "no_registration"
                    ? "bg-green-100 text-green-700"
                    : registrationState === "contact_required"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {registration.buttonText}
              </div>
            )}

            <div className="mt-5 space-y-3">
              {event.booking_note ? <ContactLine title="報名備註" value={event.booking_note} /> : null}
              {event.contact_phone ? <ContactLine title="電話" value={event.contact_phone} /> : null}
              {event.contact_whatsapp ? <ContactLine title="WhatsApp" value={event.contact_whatsapp} /> : null}
              {event.contact_email ? <ContactLine title="Email" value={event.contact_email} /> : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">標籤</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-black text-primary-600">
                  #{tag}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function DetailItem({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-black text-primary-600">{title}</div>
      <div className="mt-1 whitespace-pre-line text-sm font-bold leading-6 text-slate-800">{value}</div>
    </div>
  );
}

function InfoBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="text-xs font-black text-slate-500">{title}</div>
      <div className="mt-2 text-base font-black text-slate-950">{value}</div>
    </div>
  );
}

function PolicyBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="text-sm font-black text-slate-950">{title}</div>
      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{value}</p>
    </div>
  );
}

function ContactLine({ title, value }: { title: string; value: string }) {
  if (title === "Email") {
    return (
      <a href={`mailto:${value}`} className="block rounded-2xl bg-slate-50 p-4 text-sm hover:bg-slate-100">
        <span className="block text-xs font-black text-slate-500">{title}</span>
        <span className="mt-1 block font-bold text-slate-800">{value}</span>
      </a>
    );
  }

  if (title === "WhatsApp") {
    const cleaned = value.replace(/[^\d]/g, "");
    return (
      <a href={cleaned ? `https://wa.me/${cleaned}` : "#"} target="_blank" rel="noreferrer" className="block rounded-2xl bg-slate-50 p-4 text-sm hover:bg-slate-100">
        <span className="block text-xs font-black text-slate-500">{title}</span>
        <span className="mt-1 block font-bold text-slate-800">{value}</span>
      </a>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-sm">
      <span className="block text-xs font-black text-slate-500">{title}</span>
      <span className="mt-1 block font-bold text-slate-800">{value}</span>
    </div>
  );
}
