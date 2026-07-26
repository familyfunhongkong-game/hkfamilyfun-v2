"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Loader2,
  MapPin,
  Send,
  Ticket,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type PreviewEvent = {
  id: string;
  merchant_id: string | null;
  title_tc: string | null;
  short_description_tc: string | null;
  description_tc: string | null;
  organizer_name: string | null;
  venue_name: string | null;
  address: string | null;
  district: string | null;
  mtr_station: string | null;
  category: string | null;
  tags: string[] | null;

  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;

  price_type: string | null;
  price_min: number | null;
  price_max: number | null;
  registration_required: boolean | null;
  registration_url: string | null;
  booking_method: string | null;

  is_sen_friendly: boolean | null;
  is_indoor: boolean | null;
  show_on_calendar: boolean | null;
  hidden_pending_confirmation: boolean | null;

  cover_image_url: string | null;
  cover_image_focus_x: number | string | null;
  cover_image_focus_y: number | string | null;
  cover_image_zoom: number | string | null;

  source_type: string | null;
  source_url: string | null;
  source_file_url: string | null;
  status: string | null;
};

type MerchantProfile = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
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

function getCoverImageStyle(event: PreviewEvent): CSSProperties {
  const focusX = toNumber(event.cover_image_focus_x, 50);
  const focusY = toNumber(event.cover_image_focus_y, 50);
  const zoom = Math.max(1, toNumber(event.cover_image_zoom, 1));

  return {
    objectPosition: `${focusX}% ${focusY}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${focusX}% ${focusY}%`,
  };
}

function getStatusLabel(status: string | null | undefined) {
  if (status === "draft") return "草稿待確認";
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

function formatDateRange(event: PreviewEvent) {
  if (!event.start_date && !event.end_date) return "日期待確認";

  const start = event.start_date || "日期待確認";
  const end = event.end_date && event.end_date !== event.start_date ? ` 至 ${event.end_date}` : "";

  return `${start}${end}`;
}

function formatTimeRange(event: PreviewEvent) {
  if (!event.start_time && !event.end_time) return "時間待確認";

  if (event.start_time && event.end_time) {
    return `${event.start_time} - ${event.end_time}`;
  }

  return event.start_time || event.end_time || "時間待確認";
}

function formatPrice(event: PreviewEvent) {
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

function getBookingLabel(event: PreviewEvent) {
  if (event.booking_method === "external") return "外部連結報名";
  if (event.booking_method === "platform") return "本平台報名";
  if (event.booking_method === "contact") return "聯絡商戶報名";
  if (event.registration_required) return "需要預先報名";
  return "無需報名";
}

export default function MerchantEventPreviewPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = typeof params?.id === "string" ? params.id : "";

  const [event, setEvent] = useState<PreviewEvent | null>(null);
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

      setEvent(eventData as PreviewEvent);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "載入 Preview 時發生未知錯誤。"
      );
      setIsLoading(false);
    }
  }

  async function submitForReview() {
    if (!event || !supabase) return;

    setErrorMessage("");
    setSuccessMessage("");

    const missing: string[] = [];

    if (!event.title_tc?.trim()) missing.push("活動標題");
    if (!event.short_description_tc?.trim()) missing.push("活動簡介");
    if (!event.start_date?.trim()) missing.push("開始日期");
    if (!event.venue_name?.trim()) missing.push("場地名稱");
    if (!event.district?.trim() || event.district === "待確認") missing.push("地區");
    if (!event.price_type || event.price_type === "unknown") missing.push("收費類型");

    if (missing.length) {
      setErrorMessage(`提交前必須補充：${missing.join("、")}。`);
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from("events")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        merchant_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setEvent({
      ...event,
      status: "submitted",
    });

    setSuccessMessage("活動已提交 HK Family Fun 審批。");
    setIsSubmitting(false);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
            正在載入 Preview...
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
        </div>
      </main>
    );
  }

  const coverUrl = event.cover_image_url || DEFAULT_COVER_IMAGE;
  const statusLabel = getStatusLabel(event.status);
  const canSubmit = event.status === "draft" || event.status === "rejected";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <button
          type="button"
          onClick={() => router.push("/merchant/dashboard")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          返回 Merchant Dashboard
        </button>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-black text-primary-600">
                Event Post Preview
              </div>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                {event.title_tc || "活動標題待確認"}
              </h1>

              <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <span>狀態：</span>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(event.status)}`}>
                  {statusLabel}
                </span>
              </div>
            </div>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
              {event.status === "published" ? "已公開" : "尚未公開"}
            </span>
          </div>

          {errorMessage ? (
            <div className="mt-5 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-5 flex gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={event.title_tc || "Event cover"}
                className="h-full w-full select-none object-cover"
                style={getCoverImageStyle(event)}
              />

              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-2 text-xs font-black text-primary-600 shadow-sm">
                {event.category || "親子活動"}
              </span>
            </div>

            <div className="p-6">
              <h2 className="text-2xl font-black leading-snug text-slate-950">
                {event.title_tc || "活動標題待確認"}
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                {event.short_description_tc || "活動簡介待確認。"}
              </p>

              <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                <h3 className="font-black text-slate-950">活動詳情</h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                  {event.description_tc || "活動詳情待確認。"}
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <InfoBox
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="日期及時間"
                  value={`${formatDateRange(event)}・${formatTimeRange(event)}`}
                />

                <InfoBox
                  icon={<MapPin className="h-4 w-4" />}
                  label="地點"
                  value={`${event.venue_name || "地點待確認"}・${event.district || "地區待確認"}・${event.mtr_station || "港鐵站待確認"}`}
                />

                <InfoBox
                  icon={<Ticket className="h-4 w-4" />}
                  label="收費"
                  value={formatPrice(event)}
                />

                <InfoBox
                  icon={<Send className="h-4 w-4" />}
                  label="報名方式"
                  value={getBookingLabel(event)}
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {(event.tags || []).slice(0, 8).map((tag) => (
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
            </div>
          </article>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">活動資料檢查</h3>

              <div className="mt-4 grid gap-3">
                <CheckItem done={Boolean(event.title_tc)} text="活動標題" />
                <CheckItem done={Boolean(event.short_description_tc)} text="活動簡介" />
                <CheckItem done={Boolean(event.start_date)} text="開始日期" />
                <CheckItem done={Boolean(event.venue_name)} text="場地名稱" />
                <CheckItem done={Boolean(event.district && event.district !== "待確認")} text="地區" />
                <CheckItem done={Boolean(event.price_type && event.price_type !== "unknown")} text="收費類型" />
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">來源資料</h3>

              <div className="mt-4 space-y-4 text-sm text-slate-600">
                <div>
                  <div className="text-xs font-black text-slate-500">匯入方式</div>
                  <div className="mt-1 break-all font-semibold text-slate-800">
                    {event.source_type || "manual"}
                  </div>
                </div>

                {event.source_url ? (
                  <div>
                    <div className="text-xs font-black text-slate-500">來源連結</div>
                    <div className="mt-1 break-all font-semibold text-slate-800">
                      {event.source_url}
                    </div>
                  </div>
                ) : null}

                {merchant ? (
                  <div>
                    <div className="text-xs font-black text-slate-500">商戶</div>
                    <div className="mt-1 font-semibold text-slate-800">
                      {merchant.business_name || "商戶名稱待確認"}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">操作</h3>

              <div className="mt-4 grid gap-3">
                <button
                  type="button"
                  onClick={() => router.push(`/merchant/events/${event.id}/edit`)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Edit3 className="h-4 w-4" />
                  修改資料
                </button>

                <button
                  type="button"
                  onClick={submitForReview}
                  disabled={!canSubmit || isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-black text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  提交 HK Family Fun 審批
                </button>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-black text-primary-600">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold leading-6 text-slate-800">
        {value}
      </div>
    </div>
  );
}

function CheckItem({ done, text }: { done: boolean; text: string }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-3 text-sm ${
        done
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          done ? "bg-green-500 text-white" : "bg-amber-400 text-white"
        }`}
      >
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      </span>
      <span className="font-bold">{text}</span>
    </div>
  );
}