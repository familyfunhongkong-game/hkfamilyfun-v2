"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  MapPin,
  Ticket,
  UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type PublicEventDetail = {
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

  status: string | null;
};

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80";

function toNumber(value: number | string | null | undefined, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function getCoverImageStyle(event: PublicEventDetail): CSSProperties {
  const focusX = toNumber(event.cover_image_focus_x, 50);
  const focusY = toNumber(event.cover_image_focus_y, 50);
  const zoom = Math.max(1, toNumber(event.cover_image_zoom, 1));

  return {
    objectPosition: `${focusX}% ${focusY}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${focusX}% ${focusY}%`,
  };
}

function formatDate(event: PublicEventDetail) {
  if (!event.start_date) return "日期待確認";

  const end =
    event.end_date && event.end_date !== event.start_date
      ? ` 至 ${event.end_date}`
      : "";

  return `${event.start_date}${end}`;
}

function formatTime(event: PublicEventDetail) {
  if (!event.start_time && !event.end_time) return "時間待確認";

  if (event.start_time && event.end_time) {
    return `${event.start_time} - ${event.end_time}`;
  }

  return event.start_time || event.end_time || "時間待確認";
}

function formatPrice(event: PublicEventDetail) {
  if (event.price_type === "free") return "免費";

  if (event.price_type === "paid") {
    if (event.price_min !== null && event.price_max !== null) {
      return `HK$${event.price_min} - HK$${event.price_max}`;
    }

    if (event.price_min !== null) return `HK$${event.price_min} 起`;
    if (event.price_max !== null) return `最高 HK$${event.price_max}`;

    return "收費";
  }

  if (event.price_type === "mixed") {
    if (event.price_min !== null || event.price_max !== null) {
      return `免費及收費 HK$${event.price_min ?? 0} - HK$${event.price_max ?? "待確認"}`;
    }

    return "免費及收費";
  }

  return "收費待確認";
}

function getBookingLabel(event: PublicEventDetail) {
  if (event.booking_method === "external") return "外部連結報名";
  if (event.booking_method === "platform") return "本平台報名";
  if (event.booking_method === "contact") return "聯絡商戶報名";
  if (event.registration_required) return "需要預先報名";
  return "無需報名";
}

function getParentRequirementLabel(value: string | null) {
  if (value === "parent_required") return "必須家長陪同";
  if (value === "parent_optional") return "建議家長陪同";
  if (value === "drop_off_allowed") return "可獨立參加 / Drop-off";
  return "未指定";
}

function getRiskLabel(value: string | null) {
  if (value === "medium") return "中風險";
  if (value === "high") return "高風險";
  return "低風險";
}

export default function PublicEventDetailPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = typeof params?.id === "string" ? params.id : "";

  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function loadEvent() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (!supabase) {
        setErrorMessage("Supabase client 未能初始化。");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .eq("status", "published")
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage("找不到活動，或活動尚未公開。");
        setIsLoading(false);
        return;
      }

      setEvent(data as PublicEventDetail);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "載入活動詳情時發生未知錯誤。"
      );
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
            正在載入活動詳情...
          </div>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
          {errorMessage || "未能載入活動。"}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => router.push("/events")}
              className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-red-700"
            >
              返回活動列表
            </button>
          </div>
        </div>
      </main>
    );
  }

  const coverUrl = event.cover_image_url || DEFAULT_COVER_IMAGE;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          返回活動列表
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt={event.title_tc || "Event cover"}
              className="h-full w-full select-none object-cover"
              style={getCoverImageStyle(event)}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 text-white">
              <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-black text-primary-600">
                {event.category || "親子活動"}
              </span>

              <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight md:text-5xl">
                {event.title_tc || "活動標題待確認"}
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/90 md:text-base">
                {event.short_description_tc || "活動簡介待確認。"}
              </p>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1fr_380px]">
            <article className="p-6 md:p-8">
              <section className="rounded-3xl bg-slate-50 p-6">
                <h2 className="text-xl font-black text-slate-950">活動詳情</h2>
                <p className="mt-4 whitespace-pre-line text-sm leading-8 text-slate-700">
                  {event.description_tc || event.short_description_tc || "活動詳情待確認。"}
                </p>
              </section>

              {event.gallery_image_urls?.length ? (
                <section className="mt-6">
                  <h2 className="text-xl font-black text-slate-950">活動圖片</h2>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {event.gallery_image_urls.slice(0, 7).map((url) => (
                      <div
                        key={url}
                        className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Event gallery"
                          className="h-56 w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-black text-slate-950">安全及政策</h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <DetailBox label="適合年齡" value={(event.age_groups || []).join("、") || "未指定"} />
                  <DetailBox label="風險等級" value={getRiskLabel(event.risk_level)} />
                  <DetailBox label="家長陪同" value={getParentRequirementLabel(event.parent_requirement)} />
                  <DetailBox
                    label="活動屬性"
                    value={[
                      event.is_indoor ? "室內" : null,
                      event.is_outdoor ? "戶外" : null,
                      event.is_water_activity ? "水上活動" : null,
                      event.is_physical_activity ? "體能活動" : null,
                      event.is_sen_friendly ? "SEN 友善" : null,
                    ]
                      .filter(Boolean)
                      .join("、") || "未指定"}
                  />
                </div>

                <div className="mt-5 space-y-4">
                  {event.refund_policy ? (
                    <PolicyBlock title="退款政策" text={event.refund_policy} />
                  ) : null}

                  {event.reschedule_policy ? (
                    <PolicyBlock title="改期 / 取消政策" text={event.reschedule_policy} />
                  ) : null}

                  {event.weather_policy ? (
                    <PolicyBlock title="天氣政策" text={event.weather_policy} />
                  ) : null}
                </div>
              </section>
            </article>

            <aside className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0 md:p-8">
              <div className="sticky top-6 space-y-5">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-black text-slate-950">活動資料</h2>

                  <div className="mt-5 space-y-4">
                    <SidebarLine
                      icon={<CalendarDays className="h-4 w-4" />}
                      label="日期及時間"
                      value={`${formatDate(event)}・${formatTime(event)}`}
                    />

                    <SidebarLine
                      icon={<MapPin className="h-4 w-4" />}
                      label="地點"
                      value={`${event.venue_name || "地點待確認"}・${event.district || "地區待確認"}・${event.mtr_station || "港鐵站待確認"}`}
                    />

                    {event.address ? (
                      <SidebarLine
                        icon={<MapPin className="h-4 w-4" />}
                        label="詳細地址"
                        value={event.address}
                      />
                    ) : null}

                    <SidebarLine
                      icon={<Ticket className="h-4 w-4" />}
                      label="收費"
                      value={formatPrice(event)}
                    />

                    <SidebarLine
                      icon={<UserRound className="h-4 w-4" />}
                      label="主辦單位"
                      value={event.organizer_name || "主辦單位待確認"}
                    />
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-black text-slate-950">報名方式</h2>

                  <div className="mt-4 text-sm leading-7 text-slate-700">
                    <div className="font-black text-slate-950">
                      {getBookingLabel(event)}
                    </div>

                    {event.booking_note ? (
                      <p className="mt-2">{event.booking_note}</p>
                    ) : null}

                    {event.registration_url ? (
                      <a
                        href={event.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-primary-500 px-5 py-3 text-sm font-black text-white hover:bg-primary-600"
                      >
                        前往報名
                      </a>
                    ) : null}

                    {!event.registration_url && event.registration_required ? (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                        此活動需要報名，但報名連結暫未提供。請向主辦單位查詢。
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-black text-slate-950">標籤</h2>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(event.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-600"
                      >
                        #{tag}
                      </span>
                    ))}

                    {event.is_indoor ? (
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-600">
                        室內
                      </span>
                    ) : null}

                    {event.is_sen_friendly ? (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                        SEN 友善
                      </span>
                    ) : null}
                  </div>
                </section>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function SidebarLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-primary-500">{icon}</div>
      <div>
        <div className="text-xs font-black text-slate-500">{label}</div>
        <div className="mt-1 text-sm font-semibold leading-6 text-slate-800">
          {value}
        </div>
      </div>
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-black text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold leading-6 text-slate-800">
        {value}
      </div>
    </div>
  );
}

function PolicyBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-black text-slate-950">{title}</div>
      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
        {text}
      </p>
    </div>
  );
}