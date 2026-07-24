"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  MapPin,
  PenLine,
  Send,
  Ticket,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type DraftEvent = {
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
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  price_type: string | null;
  price_min: number | null;
  price_max: number | null;
  category: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
  cover_image_position: string | null;
  cover_image_focus_x: number | null;
  cover_image_focus_y: number | null;
  registration_required: boolean | null;
  registration_url: string | null;
  source_type: string | null;
  source_url: string | null;
  source_file_url: string | null;
  ai_extraction_status: string | null;
  status: string | null;
  admin_review_note: string | null;
};

const FALLBACK_COVER_IMAGE =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80";

function formatDate(value: string | null) {
  if (!value) return "日期待確認";

  try {
    return new Intl.DateTimeFormat("zh-HK", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatTime(value: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

function formatDateRange(event: DraftEvent) {
  if (!event.start_date) return "日期待確認";

  const start = formatDate(event.start_date);
  const end = event.end_date ? formatDate(event.end_date) : "";

  if (!event.end_date || event.end_date === event.start_date) return start;

  return `${start} 至 ${end}`;
}

function formatTimeRange(event: DraftEvent) {
  const start = formatTime(event.start_time);
  const end = formatTime(event.end_time);

  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} 開始`;
  return "時間待確認";
}

function formatPrice(event: DraftEvent) {
  if (event.price_type === "free") return "免費";
  if (event.price_type === "mixed") return "免費及收費";
  if (!event.price_type || event.price_type === "unknown") return "收費待確認";

  const min = event.price_min;
  const max = event.price_max;

  if (min !== null && max !== null && min !== max) return `HK$${min} - HK$${max}`;
  if (min !== null) return `HK$${min}`;
  if (max !== null) return `HK$${max}`;

  return "收費";
}

function getStatusLabel(status: string | null) {
  switch (status) {
    case "draft":
      return "草稿待確認";
    case "submitted":
      return "已提交審批";
    case "rejected":
      return "已退回修改";
    case "published":
      return "已發布";
    case "archived":
      return "已封存";
    default:
      return "未確認";
  }
}

function getStatusClass(status: string | null) {
  switch (status) {
    case "submitted":
      return "bg-blue-100 text-blue-700";
    case "published":
      return "bg-green-100 text-green-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    case "archived":
      return "bg-slate-100 text-slate-600";
    case "draft":
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function getTags(event: DraftEvent) {
  if (event.tags && event.tags.length > 0) return event.tags.slice(0, 5);
  if (event.category) return [event.category];
  return ["親子活動"];
}

function getMissingItems(event: DraftEvent) {
  const missing: string[] = [];

  if (!hasText(event.title_tc)) missing.push("活動名稱");
  if (!hasText(event.short_description_tc)) missing.push("活動簡介");
  if (!hasText(event.description_tc)) missing.push("活動詳情");
  if (!hasText(event.start_date)) missing.push("開始日期");
  if (!hasText(event.venue_name)) missing.push("場地名稱");

  if (!hasText(event.district) || event.district === "待確認") {
    missing.push("地區");
  }

  if (!hasText(event.price_type) || event.price_type === "unknown") {
    missing.push("收費資料");
  }

  if (!hasText(event.cover_image_url)) missing.push("封面圖片");

  return missing;
}

function getObjectPosition(event: DraftEvent) {
  const x = event.cover_image_focus_x ?? 50;
  const y = event.cover_image_focus_y ?? 50;
  return `${x}% ${y}%`;
}

export default function MerchantEventPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = String(params.id || "");

  const [event, setEvent] = useState<DraftEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadEvent() {
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
        .select("id")
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

      const { data, error } = await supabase
        .from("events")
        .select(
          [
            "id",
            "merchant_id",
            "title_tc",
            "short_description_tc",
            "description_tc",
            "organizer_name",
            "venue_name",
            "address",
            "district",
            "mtr_station",
            "start_date",
            "end_date",
            "start_time",
            "end_time",
            "price_type",
            "price_min",
            "price_max",
            "category",
            "tags",
            "cover_image_url",
            "cover_image_position",
            "cover_image_focus_x",
            "cover_image_focus_y",
            "registration_required",
            "registration_url",
            "source_type",
            "source_url",
            "source_file_url",
            "ai_extraction_status",
            "status",
            "admin_review_note",
          ].join(", ")
        )
        .eq("id", eventId)
        .eq("merchant_id", merchantData.id)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage("找不到活動，或你沒有權限查看此活動。");
        setIsLoading(false);
        return;
      }

      const loadedEvent = data as unknown as DraftEvent;

      if (!loadedEvent.cover_image_url && loadedEvent.status === "draft") {
        await supabase
          .from("events")
          .update({
            cover_image_url: FALLBACK_COVER_IMAGE,
            cover_image_position: "custom",
            cover_image_focus_x: loadedEvent.cover_image_focus_x ?? 50,
            cover_image_focus_y: loadedEvent.cover_image_focus_y ?? 50,
          })
          .eq("id", loadedEvent.id);

        loadedEvent.cover_image_url = FALLBACK_COVER_IMAGE;
        loadedEvent.cover_image_position = "custom";
        loadedEvent.cover_image_focus_x = loadedEvent.cover_image_focus_x ?? 50;
        loadedEvent.cover_image_focus_y = loadedEvent.cover_image_focus_y ?? 50;
      }

      setEvent(loadedEvent);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "載入 Preview 時發生未知錯誤。"
      );
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const missingItems = useMemo(() => {
    if (!event) return [];
    return getMissingItems(event);
  }, [event]);

  const canSubmit =
    Boolean(event) &&
    event?.status !== "submitted" &&
    event?.status !== "published" &&
    missingItems.length === 0;

  async function submitForReview() {
    if (!event) return;

    if (!canSubmit) {
      setErrorMessage(`請先補充：${missingItems.join("、")}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!supabase) {
        setErrorMessage("Supabase client 未能初始化。請檢查 .env.local。");
        setIsSubmitting(false);
        return;
      }

      const coverImage = event.cover_image_url || FALLBACK_COVER_IMAGE;
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("events")
        .update({
          status: "submitted",
          cover_image_url: coverImage,
          cover_image_position: "custom",
          cover_image_focus_x: event.cover_image_focus_x ?? 50,
          cover_image_focus_y: event.cover_image_focus_y ?? 50,
          merchant_confirmed_at: now,
          submitted_at: now,
          updated_at: now,
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
        cover_image_url: coverImage,
        cover_image_position: "custom",
        cover_image_focus_x: event.cover_image_focus_x ?? 50,
        cover_image_focus_y: event.cover_image_focus_y ?? 50,
      });

      setSuccessMessage("活動已提交 HK Family Fun 審批。");
      setIsSubmitting(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "提交審批時發生未知錯誤。"
      );
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">正在載入 Preview...</p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-xl font-bold text-red-900">載入失敗</h1>
          <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
          <button
            type="button"
            onClick={() => router.push("/merchant/dashboard")}
            className="mt-5 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            返回 Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => router.push("/merchant/dashboard")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          返回 Merchant Dashboard
        </button>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary-600">
                Event Post Preview
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                {event.title_tc || "未命名活動"}
              </h1>

              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-slate-600">狀態：</span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(event.status)}`}>
                  {getStatusLabel(event.status)}
                </span>
              </div>
            </div>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {event.ai_extraction_status === "completed" ? "已智能匯入" : "草稿待確認"}
            </span>
          </div>

          {missingItems.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="font-bold">提交前必須補充：{missingItems.join("、")}</div>
              <div className="mt-1">請先按「修改資料」補齊內容，然後再提交 HK Family Fun 審批。</div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
              資料已達基本提交要求。請最後檢查內容，確認無誤後提交 HK Family Fun 審批。
            </div>
          )}

          {successMessage ? (
            <div className="mt-5 flex gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-5 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="relative h-72 overflow-hidden bg-slate-100">
                  <img
                    src={event.cover_image_url || FALLBACK_COVER_IMAGE}
                    alt={event.title_tc || "活動圖片"}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: getObjectPosition(event) }}
                  />

                  <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-primary-600 shadow-sm">
                    {event.category || "親子活動"}
                  </span>

                  <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                    Preview
                  </span>
                </div>

                <div className="p-6">
                  <h2 className="text-2xl font-bold text-slate-950">
                    {event.title_tc || "未命名活動"}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {event.short_description_tc || "未有活動簡介。"}
                  </p>

                  <div className="mt-5 space-y-4 text-sm text-slate-700">
                    <PreviewRow
                      icon={<CalendarDays className="h-4 w-4" />}
                      label="日期及時間"
                      value={`${formatDateRange(event)}・${formatTimeRange(event)}`}
                    />

                    <PreviewRow
                      icon={<MapPin className="h-4 w-4" />}
                      label="地點"
                      value={`${event.venue_name || "地點待確認"}・${event.district || "地區待確認"}・${event.mtr_station || "港鐵站待確認"}`}
                    />

                    <PreviewRow
                      icon={<Ticket className="h-4 w-4" />}
                      label="收費"
                      value={formatPrice(event)}
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {getTags(event).map((tag) => (
                      <span key={tag} className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-xl font-bold text-slate-950">活動資料檢查</h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  請確認以下資料是否正確。資料越完整，HK Family Fun 越容易快速審批及上架。
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <InfoBox label="主辦單位" value={event.organizer_name || "待確認"} />
                  <InfoBox label="匯入方式" value={event.source_type || "manual"} />
                  <InfoBox label="日期" value={formatDateRange(event)} />
                  <InfoBox label="地點" value={event.venue_name || "待確認"} />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                  <FileText className="h-5 w-5 text-primary-500" />
                  來源資料
                </h2>

                <div className="mt-4 space-y-3 text-sm">
                  <InfoBox label="匯入方式" value={event.source_type || "manual"} />
                  <InfoBox label="來源連結" value={event.source_url || "未有"} />
                  <InfoBox label="來源檔案" value={event.source_file_url || "未有"} />
                </div>
              </section>
            </aside>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push(`/merchant/events/${event.id}/edit`)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <PenLine className="h-4 w-4" />
              修改資料
            </button>

            <button
              type="button"
              onClick={submitForReview}
              disabled={!canSubmit || isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "提交中..." : "提交 HK Family Fun 審批"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/merchant/events/import")}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              再匯入另一個活動
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function PreviewRow({
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
      <span className="mt-0.5 text-primary-500">{icon}</span>
      <div>
        <div className="font-bold text-slate-950">{label}</div>
        <div className="mt-1 leading-6">{value}</div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-1 break-all text-sm font-bold text-slate-950">{value}</div>
    </div>
  );
}