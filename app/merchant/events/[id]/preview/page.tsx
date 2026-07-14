"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Edit3,
  FileText,
  Lock,
  MapPin,
  Send,
  Sparkles,
  Tag,
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
  registration_required: boolean | null;
  registration_url: string | null;
  is_sen_friendly: boolean | null;
  is_indoor: boolean | null;
  source_type: string | null;
  source_url: string | null;
  source_file_url: string | null;
  ai_extraction_status: string | null;
  ai_extracted_json: Record<string, unknown> | null;
  status: string | null;
};

const FALLBACK_COVER_IMAGE =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80";

function getStatusLabel(status: string | null) {
  switch (status) {
    case "draft":
      return "草稿待確認";
    case "submitted":
      return "已提交審批";
    case "rejected":
      return "需修改後再提交";
    case "published":
      return "已發布";
    case "approved":
      return "已批准";
    default:
      return "草稿";
  }
}

function getStatusClass(status: string | null) {
  switch (status) {
    case "submitted":
      return "bg-blue-100 text-blue-700";
    case "published":
    case "approved":
      return "bg-green-100 text-green-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    case "draft":
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function formatDateRange(event: PreviewEvent) {
  if (!event.start_date && !event.end_date) return "日期待確認";

  const start = event.start_date || "";
  const end = event.end_date || "";

  if (start && end && start !== end) return `${start} 至 ${end}`;
  return start || end || "日期待確認";
}

function formatTimeRange(event: PreviewEvent) {
  if (!event.start_time && !event.end_time) return "時間待確認";

  const start = event.start_time ? event.start_time.slice(0, 5) : "";
  const end = event.end_time ? event.end_time.slice(0, 5) : "";

  if (start && end) return `${start} - ${end}`;
  return start || end || "時間待確認";
}

function formatPrice(event: PreviewEvent) {
  if (event.price_type === "free") return "免費";
  if (event.price_type === "unknown" || !event.price_type) return "收費待確認";

  const min = Number(event.price_min || 0);
  const max = Number(event.price_max || 0);

  if (min === 0 && max === 0) return "收費待確認";
  if (min === max) return `HK$${min}`;
  return `HK$${min} - HK$${max}`;
}

function getMissingFields(event: PreviewEvent) {
  const missing: string[] = [];

  if (!event.title_tc?.trim()) missing.push("活動名稱");
  if (!event.short_description_tc?.trim()) missing.push("活動簡介");
  if (!event.start_date) missing.push("開始日期");
  if (!event.venue_name?.trim() || event.venue_name === "待商戶確認") {
    missing.push("場地名稱");
  }
  if (!event.address?.trim() || event.address === "待商戶確認") {
    missing.push("地址");
  }
  if (!event.district || event.district === "待確認") {
    missing.push("地區");
  }
  if (!event.price_type || event.price_type === "unknown") {
    missing.push("收費資料");
  }

  return missing;
}

export default function MerchantEventPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = String(params.id || "");

  const [event, setEvent] = useState<PreviewEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadEvent() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (!supabase) {
        setErrorMessage(
          "Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。"
        );
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

      const { data: merchant, error: merchantError } = await supabase
        .from("merchants")
        .select("id, owner_user_id")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (merchantError || !merchant) {
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
            "registration_required",
            "registration_url",
            "is_sen_friendly",
            "is_indoor",
            "source_type",
            "source_url",
            "source_file_url",
            "ai_extraction_status",
            "ai_extracted_json",
            "status",
          ].join(", ")
        )
        .eq("id", eventId)
        .eq("merchant_id", merchant.id)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage("找不到此活動，或你沒有權限查看。");
        setIsLoading(false);
        return;
      }

      const loadedEvent = data as unknown as PreviewEvent;

      if (!loadedEvent.cover_image_url) {
        await supabase
          .from("events")
          .update({
            cover_image_url: FALLBACK_COVER_IMAGE,
            updated_at: new Date().toISOString(),
          })
          .eq("id", loadedEvent.id);

        loadedEvent.cover_image_url = FALLBACK_COVER_IMAGE;
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

  const missingFields = useMemo(() => {
    if (!event) return [];
    return getMissingFields(event);
  }, [event]);

  async function submitForReview() {
    if (!event) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (missingFields.length > 0) {
      setErrorMessage(`請先補充以下資料：${missingFields.join("、")}`);
      setIsSubmitting(false);
      return;
    }

    try {
      if (!supabase) {
        setErrorMessage(
          "Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。"
        );
        setIsSubmitting(false);
        return;
      }

      const coverImage = event.cover_image_url || FALLBACK_COVER_IMAGE;

      const { error } = await supabase
        .from("events")
        .update({
          status: "submitted",
          cover_image_url: coverImage,
          merchant_confirmed_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.id);

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("活動已提交 HK Family Fun 審批。");
      setEvent({
        ...event,
        status: "submitted",
        cover_image_url: coverImage,
      });
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
          <p className="text-sm text-slate-600">正在載入活動 Preview...</p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-8">
          <p className="text-sm text-red-700">
            {errorMessage || "找不到活動資料。"}
          </p>
        </div>
      </main>
    );
  }

  const isDraft = event.status === "draft";
  const isRejected = event.status === "rejected";
  const isSubmitted = event.status === "submitted";
  const isPublished = event.status === "published" || event.status === "approved";

  const canEdit = isDraft || isRejected;
  const canSubmit = (isDraft || isRejected) && missingFields.length === 0;

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
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary-600">
                Event Post Preview
              </p>

              <h1 className="mt-1 text-3xl font-bold text-slate-950">
                {event.title_tc || "未命名活動"}
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                狀態：
                <span
                  className={`ml-2 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                    event.status
                  )}`}
                >
                  {getStatusLabel(event.status)}
                </span>
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              <Sparkles className="h-4 w-4" />
              {event.ai_extraction_status === "completed"
                ? "已智能匯入"
                : canEdit
                  ? "草稿待確認"
                  : "資料已鎖定"}
            </div>
          </div>

          {successMessage ? (
            <div className="mb-5 flex gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-5 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {isSubmitted ? (
            <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              已提交平台審批。HK Family Fun 會檢查資料後安排上架。提交後暫時不可直接修改，如需更改請聯絡 HK Family Fun 或等待管理員退回。
            </div>
          ) : isPublished ? (
            <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              此活動已發布。為避免公開資料突然改變，已發布活動暫時不可由商戶直接修改。
            </div>
          ) : missingFields.length > 0 ? (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>提交前必須補充：</strong>
              <span className="ml-1">{missingFields.join("、")}</span>
              <div className="mt-2">
                請先按「修改資料」補齊內容，然後再提交 HK Family Fun 審批。
              </div>
            </div>
          ) : (
            <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              資料已達基本提交要求。請最後檢查內容，確認無誤後提交 HK Family Fun 審批。
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="relative h-64 bg-slate-100">
                <img
                  src={event.cover_image_url || FALLBACK_COVER_IMAGE}
                  alt={event.title_tc || "Event cover"}
                  className="h-full w-full object-cover"
                />

                <div className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary-600 shadow-sm">
                  {event.category || "親子活動"}
                </div>

                <div className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  Preview
                </div>
              </div>

              <div className="p-5">
                <h2 className="text-xl font-bold text-slate-950">
                  {event.title_tc || "未命名活動"}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {event.short_description_tc || "請補充活動簡介。"}
                </p>

                <div className="mt-5 space-y-4 text-sm text-slate-700">
                  <div className="flex gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <div>
                      <div className="font-semibold text-slate-900">
                        日期及時間
                      </div>
                      <div>
                        {formatDateRange(event)} · {formatTimeRange(event)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <div>
                      <div className="font-semibold text-slate-900">地點</div>
                      <div>
                        {event.venue_name || "場地待確認"} ·{" "}
                        {event.district || "地區待確認"} ·{" "}
                        {event.mtr_station || "港鐵站待確認"}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Tag className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <div>
                      <div className="font-semibold text-slate-900">收費</div>
                      <div>{formatPrice(event)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(event.tags && event.tags.length > 0
                    ? event.tags
                    : ["親子活動", "待確認"]
                  )
                    .slice(0, 5)
                    .map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700"
                      >
                        #{tag}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-xl font-bold text-slate-950">
                  活動資料檢查
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  請確認以下資料是否正確。資料越完整，HK Family Fun 越容易快速審批及上架。
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4">
                    <div className="text-xs font-semibold text-slate-500">
                      主辦單位
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-950">
                      {event.organizer_name || "待確認"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <div className="text-xs font-semibold text-slate-500">
                      匯入方式
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-950">
                      {event.source_type || "manual"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <div className="text-xs font-semibold text-slate-500">
                      日期
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-950">
                      {formatDateRange(event)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <div className="text-xs font-semibold text-slate-500">
                      地點
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-950">
                      {event.venue_name || "待確認"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                  <FileText className="h-5 w-5 text-primary-500" />
                  來源資料
                </h2>

                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <div>
                    <div className="text-xs font-semibold text-slate-500">
                      匯入方式
                    </div>
                    <div>{event.source_type || "manual"}</div>
                  </div>

                  {event.source_url ? (
                    <div>
                      <div className="text-xs font-semibold text-slate-500">
                        來源連結
                      </div>
                      <div className="break-all">{event.source_url}</div>
                    </div>
                  ) : null}

                  {event.source_file_url ? (
                    <div>
                      <div className="text-xs font-semibold text-slate-500">
                        來源檔案
                      </div>
                      <div>{event.source_file_url}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
            {canEdit ? (
              <button
                type="button"
                onClick={() => router.push(`/merchant/events/${event.id}/edit`)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Edit3 className="h-4 w-4" />
                修改資料
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-500"
              >
                <Lock className="h-4 w-4" />
                已鎖定修改
              </button>
            )}

            {canSubmit ? (
              <button
                type="button"
                onClick={submitForReview}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "正在提交..." : "提交 HK Family Fun 審批"}
              </button>
            ) : isSubmitted || isPublished ? (
              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500"
              >
                <CheckCircle2 className="h-4 w-4" />
                已提交審批
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500"
              >
                <AlertCircle className="h-4 w-4" />
                請先補齊資料
              </button>
            )}

            <button
              type="button"
              onClick={() => router.push("/merchant/events/import")}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              再匯入另一個活動
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}