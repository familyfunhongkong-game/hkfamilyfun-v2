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
  if (!value) return "æ—¥æœŸå¾…ç¢ºèª";

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

  if (!event.start_date && !event.end_date) return "æ—¥æœŸå¾…ç¢ºèª";
  if (!end || end === start) return start;
  return `${start} è‡³ ${end}`;
}

function formatTimeRange(event: PublicEvent) {
  if (event.start_time && event.end_time) return `${event.start_time} - ${event.end_time}`;
  if (event.start_time) return `${event.start_time} é–‹å§‹`;
  if (event.end_time) return `${event.end_time} çµæŸ`;
  return "æ™‚é–“å¾…ç¢ºèª";
}

function formatPrice(event: PublicEvent) {
  if (event.price_type === "free" || event.is_free) return "å…è²»";

  if (event.price_type === "paid") {
    if (event.price_min !== null && event.price_min !== undefined && event.price_max !== null && event.price_max !== undefined) {
      return `HK$${event.price_min} - HK$${event.price_max}`;
    }

    if (event.price_min !== null && event.price_min !== undefined) return `HK$${event.price_min} èµ·`;
    if (event.price_max !== null && event.price_max !== undefined) return `æœ€é«˜ HK$${event.price_max}`;
    return "æ”¶è²»";
  }

  if (event.price_type === "mixed") {
    if (event.price_min !== null && event.price_min !== undefined && event.price_max !== null && event.price_max !== undefined) {
      return `å…è²»åŠæ”¶è²» HK$${event.price_min} - HK$${event.price_max}`;
    }

    if (event.price_min !== null && event.price_min !== undefined) return `å…è²»åŠæ”¶è²»ï¼ŒHK$${event.price_min} èµ·`;
    return "å…è²»åŠæ”¶è²»";
  }

  return "æ”¶è²»å¾…ç¢ºèª";
}

function getRiskLabel(value: string | null | undefined) {
  if (value === "low") return "ä½Žé¢¨éšª";
  if (value === "medium") return "ä¸­é¢¨éšª";
  if (value === "high") return "é«˜é¢¨éšª";
  return "æœªæŒ‡å®š";
}

function getParentRequirementLabel(value: string | null | undefined) {
  if (value === "parent_required") return "å¿…é ˆå®¶é•·é™ªåŒ";
  if (value === "parent_optional") return "å»ºè­°å®¶é•·é™ªåŒ";
  if (value === "drop_off_allowed") return "å¯ç¨ç«‹åƒåŠ  / Drop-off";
  return "æœªæŒ‡å®š";
}

function getActivityTypeLabel(event: PublicEvent) {
  const types: string[] = [];

  if (event.is_indoor) types.push("å®¤å…§");
  if (event.is_outdoor) types.push("æˆ¶å¤–");
  if (event.is_water_activity) types.push("æ°´ä¸Šæ´»å‹•");
  if (event.is_physical_activity) types.push("é«”èƒ½æ´»å‹•");
  if (event.is_sen_friendly) types.push("SEN å‹å–„");

  return types.length ? types.join("ã€") : "æœªæŒ‡å®š";
}

function getAgeGroupLabel(event: PublicEvent) {
  if (!Array.isArray(event.age_groups) || event.age_groups.length === 0) return "æœªæŒ‡å®š";
  return event.age_groups.join("ã€");
}

function getTags(event: PublicEvent) {
  const tags = Array.isArray(event.tags) ? event.tags.filter(Boolean) : [];
  const baseTags = tags.length ? tags : [safeText(event.category, "è¦ªå­æ´»å‹•")];

  if (event.is_indoor && !baseTags.includes("å®¤å…§")) baseTags.push("å®¤å…§");
  if (event.is_sen_friendly && !baseTags.includes("SEN å‹å–„")) baseTags.push("SEN å‹å–„");

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

  if (bookingMethod === "platform" && !actionUrl) return "platform_coming";

  if (event.registration_required && !actionUrl) return "contact_required";

  if (bookingMethod === "none" || event.registration_required === false) return "no_registration";

  return "no_registration";
}

function getRegistrationText(event: PublicEvent) {
  const state = getRegistrationState(event);

  if (state === "external_link") {
    return {
      title: "å ±åæ–¹å¼",
      description: "è«‹æŒ‰ä¸‹æ–¹æŒ‰éˆ•å‰å¾€ä¸»è¾¦æ–¹æä¾›çš„ç¶²ç«™ã€æ´»å‹•é æˆ–å ±åè¡¨æ ¼ï¼Œå®Œæˆå ±åæˆ–æŸ¥çœ‹æœ€æ–°å®‰æŽ’ã€‚",
      buttonText: getPrimaryActionLabel(event),
      showButton: true,
      disabled: false,
    };
  }

  if (state === "contact_required") {
    return {
      title: "å ±åæ–¹å¼",
      description: "æ­¤æ´»å‹•éœ€è¦å…ˆå‘ä¸»è¾¦æ–¹æŸ¥è©¢æˆ–å ±åã€‚è«‹ä½¿ç”¨ä¸‹æ–¹è¯çµ¡è³‡æ–™ç¢ºèªåé¡åŠå®‰æŽ’ã€‚",
      buttonText: "è«‹å‘ä¸»è¾¦æŸ¥è©¢",
      showButton: false,
      disabled: true,
    };
  }

  if (state === "platform_coming") {
    return {
      title: "å ±åæ–¹å¼",
      description: "æœ¬å¹³å°å ±ååŠŸèƒ½ä»åœ¨æº–å‚™ä¸­ã€‚è«‹å…ˆå‘ä¸»è¾¦æ–¹æŸ¥è©¢æœ€æ–°å ±åå®‰æŽ’ã€‚",
      buttonText: "å ±ååŠŸèƒ½æº–å‚™ä¸­",
      showButton: false,
      disabled: true,
    };
  }

  if (state === "not_available") {
    return {
      title: "å ±åæ–¹å¼",
      description: "æ­¤æ´»å‹•æš«æœªé–‹æ”¾å…¬é–‹å ±åã€‚",
      buttonText: "æš«æœªé–‹æ”¾",
      showButton: false,
      disabled: true,
    };
  }

  return {
    title: "å ±åæ–¹å¼",
    description: "æ­¤æ´»å‹•é¡¯ç¤ºç‚ºç„¡éœ€é å…ˆå ±åã€‚å‡ºç™¼å‰ä»å»ºè­°å‘ä¸»è¾¦æ–¹ç¢ºèªæœ€æ–°å®‰æŽ’ã€‚",
    buttonText: "ç„¡éœ€å ±å",
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
  if (isExternalHttpUrl(event.registration_url)) return "å‰å¾€å ±å";
  if (isExternalHttpUrl(event.source_url)) return "å‰å¾€ä¸»è¾¦æ–¹æ´»å‹•é ";
  return "è«‹å‘ä¸»è¾¦æŸ¥è©¢";
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
      setErrorMessage("Supabase client æœªèƒ½åˆå§‹åŒ–ã€‚");
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
        setErrorMessage("æ‰¾ä¸åˆ°æ­¤æ´»å‹•ã€‚");
        setIsLoading(false);
        return;
      }

      const loadedEvent = data as PublicEvent;

      if (loadedEvent.status !== "published") {
        setErrorMessage("æ­¤æ´»å‹•å°šæœªå…¬é–‹æˆ–å·²å°å­˜ã€‚");
        setIsLoading(false);
        return;
      }

      setEvent(loadedEvent);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "è¼‰å…¥æ´»å‹•è³‡æ–™æ™‚ç™¼ç”ŸæœªçŸ¥éŒ¯èª¤ã€‚");
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            æ­£åœ¨è¼‰å…¥æ´»å‹•è³‡æ–™...
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage || !event) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-2xl font-black text-slate-950">æ´»å‹•æš«æœªèƒ½é¡¯ç¤º</div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{errorMessage || "æ‰¾ä¸åˆ°æ­¤æ´»å‹•ã€‚"}</p>
          <button
            type="button"
            onClick={() => router.push("/events")}
            className="mt-6 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-black text-white hover:bg-primary-600"
          >
            è¿”å›žæœå°‹æ´»å‹•
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
            alt={safeText(event.title_tc, "æ´»å‹•å°é¢åœ–ç‰‡")}
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
                {safeText(event.category, "è¦ªå­æ´»å‹•")}
              </div>

              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-white md:text-5xl">
                {safeText(event.title_tc, "æœªå‘½åæ´»å‹•")}
              </h1>

              <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-white/90">
                {safeText(event.short_description_tc, "æ´»å‹•ç°¡ä»‹å¾…ç¢ºèªã€‚")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">æ´»å‹•è©³æƒ…</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
              {safeText(event.description_tc, safeText(event.short_description_tc, "æ´»å‹•è©³æƒ…å¾…ç¢ºèªã€‚"))}
            </p>
          </section>

          {Array.isArray(event.gallery_image_urls) && event.gallery_image_urls.length > 0 ? (
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">æ´»å‹•ç›¸ç‰‡</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {event.gallery_image_urls.slice(0, 7).map((url) => (
                  <div key={url} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="æ´»å‹•ç›¸ç‰‡" className="aspect-[16/10] w-full object-cover" />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">å®‰å…¨åŠæ”¿ç­–</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoBox title="é©åˆå¹´é½¡" value={getAgeGroupLabel(event)} />
              <InfoBox title="é¢¨éšªç­‰ç´š" value={getRiskLabel(event.risk_level)} />
              <InfoBox title="å®¶é•·é™ªåŒ" value={getParentRequirementLabel(event.parent_requirement)} />
              <InfoBox title="æ´»å‹•å±¬æ€§" value={getActivityTypeLabel(event)} />
            </div>

            <div className="mt-5 grid gap-4">
              {event.refund_policy ? <PolicyBox title="é€€æ¬¾æ”¿ç­–" value={event.refund_policy} /> : null}
              {event.reschedule_policy ? <PolicyBox title="æ”¹æœŸ / å–æ¶ˆæ”¿ç­–" value={event.reschedule_policy} /> : null}
              {event.weather_policy ? <PolicyBox title="å¤©æ°£æ”¿ç­–" value={event.weather_policy} /> : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-800">
            <div className="font-black">å®¶é•·ç•™æ„äº‹é …</div>
            <p className="mt-2">
              HK Family Fun æœƒç›¡åŠ›æ•´ç†æ´»å‹•è³‡æ–™ï¼Œä½†æ´»å‹•æ—¥æœŸã€åé¡ã€æ”¶è²»ã€å ±ååŠå–æ¶ˆå®‰æŽ’å¯èƒ½ç”±ä¸»è¾¦æ–¹æ›´æ–°ã€‚
              å‡ºç™¼æˆ–ä»˜æ¬¾å‰ï¼Œè«‹ä»¥ä¸»è¾¦æ–¹æœ€æ–°å…¬å¸ƒç‚ºæº–ã€‚
            </p>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">æ´»å‹•è³‡æ–™</h2>

            <div className="mt-5 space-y-5">
              <DetailItem title="æ—¥æœŸåŠæ™‚é–“" value={`${formatDateRange(event)}ãƒ»${formatTimeRange(event)}`} />
              <DetailItem title="åœ°é»ž" value={safeText(event.venue_name, "åœ°é»žå¾…ç¢ºèª")} />
              <DetailItem title="è©³ç´°åœ°å€" value={safeText(event.address, "åœ°å€å¾…ç¢ºèª")} />
              <DetailItem title="åœ°å€" value={`${safeText(event.district, "åœ°å€å¾…ç¢ºèª")}ãƒ»${safeText(event.mtr_station, "æ¸¯éµç«™å¾…ç¢ºèª")}`} />
              <DetailItem title="æ”¶è²»" value={formatPrice(event)} />
              <DetailItem title="ä¸»è¾¦å–®ä½" value={safeText(event.organizer_name, "ä¸»è¾¦å–®ä½å¾…ç¢ºèª")} />
            </div>

            {isExternalHttpUrl(event.google_map_url) ? (
              <a
                href={event.google_map_url || "#"}
                target="_blank"
                rel="noreferrer"
                className="mt-5 block rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                æŸ¥çœ‹åœ°åœ–
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
              {event.booking_note ? <ContactLine title="å ±åå‚™è¨»" value={event.booking_note} /> : null}
              {event.contact_phone ? <ContactLine title="é›»è©±" value={event.contact_phone} /> : null}
              {event.contact_whatsapp ? <ContactLine title="WhatsApp" value={event.contact_whatsapp} /> : null}
              {event.contact_email ? <ContactLine title="Email" value={event.contact_email} /> : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">æ¨™ç±¤</h2>
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

