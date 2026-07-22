"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  LinkIcon,
  MapPin,
  ShieldCheck,
  Store,
  Ticket,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type AdminEvent = {
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
  status: string | null;
  source_type: string | null;
  source_url: string | null;
  source_file_url: string | null;
  admin_review_note: string | null;
  submitted_at: string | null;
  published_at: string | null;
  rejected_at: string | null;
  updated_at: string | null;
};

type MerchantProfile = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: string | null;
};

const FALLBACK_IMAGE =
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

function formatDateRange(event: AdminEvent) {
  if (!event.start_date) return "日期待確認";

  const startDate = formatDate(event.start_date);
  const endDate = event.end_date ? formatDate(event.end_date) : "";

  if (!event.end_date || event.end_date === event.start_date) {
    return startDate;
  }

  return `${startDate} 至 ${endDate}`;
}

function formatTimeRange(event: AdminEvent) {
  const startTime = formatTime(event.start_time);
  const endTime = formatTime(event.end_time);

  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return `${startTime} 開始`;
  return "時間待確認";
}

function formatPrice(event: AdminEvent) {
  if (event.price_type === "free") return "免費";
  if (event.price_type === "mixed") return "免費及收費";
  if (event.price_type === "unknown" || !event.price_type) return "收費待確認";

  const min = event.price_min;
  const max = event.price_max;

  if (min !== null && max !== null && min !== max) {
    return `HK$${min} - HK$${max}`;
  }

  if (min !== null) return `HK$${min}`;
  if (max !== null) return `HK$${max}`;

  return "收費";
}

function getStatusLabel(status: string | null) {
  switch (status) {
    case "draft":
      return "草稿";
    case "submitted":
      return "待審批";
    case "rejected":
      return "已退回";
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

function hasUsefulText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function getTags(event: AdminEvent) {
  if (event.tags && event.tags.length > 0) return event.tags.slice(0, 6);
  if (event.category) return [event.category];
  return ["親子活動"];
}

function getReviewChecklist(event: AdminEvent) {
  const checklist = [
    {
      label: "活動名稱",
      passed: hasUsefulText(event.title_tc),
      helper: "活動必須有清楚標題。",
    },
    {
      label: "活動簡介",
      passed: hasUsefulText(event.short_description_tc),
      helper: "活動卡需要簡短介紹。",
    },
    {
      label: "活動詳情",
      passed: hasUsefulText(event.description_tc),
      helper: "詳情頁需要活動內容、注意事項或亮點。",
    },
    {
      label: "開始日期",
      passed: hasUsefulText(event.start_date),
      helper: "沒有日期不應公開。",
    },
    {
      label: "場地名稱",
      passed: hasUsefulText(event.venue_name),
      helper: "必須有場地、分館、網上或多區說明。",
    },
    {
      label: "地區",
      passed:
        hasUsefulText(event.district) &&
        event.district !== "待確認" &&
        event.district !== "unknown",
      helper: "不可保留「待確認」。大型活動可用全港／多區／網上。",
    },
    {
      label: "收費資料",
      passed:
        hasUsefulText(event.price_type) &&
        event.price_type !== "unknown" &&
        formatPrice(event) !== "收費待確認",
      helper: "免費、收費或免費及收費必須清楚。",
    },
    {
      label: "封面圖片",
      passed: hasUsefulText(event.cover_image_url),
      helper: "公開活動必須有封面圖。",
    },
  ];

  return checklist;
}

export default function AdminEventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = String(params.id || "");

  const [eventData, setEventData] = useState<AdminEvent | null>(null);
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadEvent() {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

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

      setAdminEmail(user.email || "");

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
            "status",
            "source_type",
            "source_url",
            "source_file_url",
            "admin_review_note",
            "submitted_at",
            "published_at",
            "rejected_at",
            "updated_at",
          ].join(", ")
        )
        .eq("id", eventId)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage("找不到活動。");
        setIsLoading(false);
        return;
      }

      const loadedEvent = data as unknown as AdminEvent;
      setEventData(loadedEvent);
      setRejectReason(loadedEvent.admin_review_note || "");

      if (loadedEvent.merchant_id) {
        const { data: merchantData } = await supabase
          .from("merchants")
          .select("id, business_name, contact_name, contact_email, status")
          .eq("id", loadedEvent.merchant_id)
          .maybeSingle();

        if (merchantData) {
          setMerchant(merchantData as MerchantProfile);
        }
      }

      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "載入活動資料時發生未知錯誤。"
      );
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const checklist = useMemo(() => {
    if (!eventData) return [];
    return getReviewChecklist(eventData);
  }, [eventData]);

  const failedItems = checklist.filter((item) => !item.passed);
  const canApprove =
    Boolean(eventData) &&
    eventData?.status === "submitted" &&
    failedItems.length === 0;

  const canReject =
    Boolean(eventData) &&
    eventData?.status === "submitted" &&
    rejectReason.trim().length >= 3;

  async function approveEvent() {
    if (!eventData) return;

    if (!canApprove) {
      setErrorMessage("活動資料未符合公開要求，暫時不能批准發布。");
      return;
    }

    setIsWorking(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!supabase) {
        setErrorMessage(
          "Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。"
        );
        setIsWorking(false);
        return;
      }

      const now = new Date().toISOString();

      const { error } = await supabase
        .from("events")
        .update({
          status: "published",
          published_at: now,
          admin_review_note: null,
          rejected_at: null,
          updated_at: now,
        })
        .eq("id", eventData.id);

      if (error) {
        setErrorMessage(error.message);
        setIsWorking(false);
        return;
      }

      setEventData({
        ...eventData,
        status: "published",
        published_at: now,
        admin_review_note: null,
        rejected_at: null,
        updated_at: now,
      });

      setSuccessMessage("活動已批准並公開發布。");
      setIsWorking(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "批准活動時發生未知錯誤。"
      );
      setIsWorking(false);
    }
  }

  async function rejectEvent() {
    if (!eventData) return;

    const cleanedReason = rejectReason.trim();

    if (cleanedReason.length < 3) {
      setErrorMessage("請先填寫退回原因，最少 3 個字。");
      return;
    }

    if (eventData.status !== "submitted") {
      setErrorMessage("只有待審批活動可以退回。");
      return;
    }

    setIsWorking(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!supabase) {
        setErrorMessage(
          "Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。"
        );
        setIsWorking(false);
        return;
      }

      const now = new Date().toISOString();

      const { error } = await supabase
        .from("events")
        .update({
          status: "rejected",
          admin_review_note: cleanedReason,
          rejected_at: now,
          updated_at: now,
        })
        .eq("id", eventData.id);

      if (error) {
        setErrorMessage(error.message);
        setIsWorking(false);
        return;
      }

      setEventData({
        ...eventData,
        status: "rejected",
        admin_review_note: cleanedReason,
        rejected_at: now,
        updated_at: now,
      });

      setSuccessMessage("活動已退回商戶修改。");
      setIsWorking(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "退回活動時發生未知錯誤。"
      );
      setIsWorking(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">正在載入 Admin 審批頁...</p>
        </div>
      </main>
    );
  }

  if (!eventData) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-xl font-bold text-red-900">載入失敗</h1>
          <p className="mt-2 text-sm text-red-700">
            {errorMessage || "找不到活動資料。"}
          </p>
          <button
            type="button"
            onClick={() => router.push("/admin/events")}
            className="mt-5 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            返回 Admin 活動列表
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/admin/events")}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            返回 Admin 活動列表
          </button>

          <button
            type="button"
            onClick={loadEvent}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            Refresh
          </button>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-primary-600">
                <ShieldCheck className="h-4 w-4" />
                HK Family Fun Admin Review
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                {eventData.title_tc || "未命名活動"}
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Admin：{adminEmail || "未確認"}
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-bold ${getStatusClass(
                eventData.status
              )}`}
            >
              {getStatusLabel(eventData.status)}
            </span>
          </div>

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

          <div
            className={`mt-5 rounded-2xl border p-4 text-sm ${
              failedItems.length === 0
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {failedItems.length === 0
              ? "基本資料完整，可以批准發布。"
              : `不可批准：仍有 ${failedItems.length} 項資料需要補充。`}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="relative h-72 bg-slate-100">
                <img
                  src={eventData.cover_image_url || FALLBACK_IMAGE}
                  alt={eventData.title_tc || "活動封面"}
                  className="h-full w-full object-cover"
                />

                <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-primary-600 shadow-sm">
                  {eventData.category || "親子活動"}
                </div>
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-bold text-slate-950">
                  {eventData.title_tc || "未命名活動"}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {eventData.short_description_tc || "未有活動簡介。"}
                </p>

                <div className="mt-5 rounded-3xl bg-slate-50 p-5">
                  <h3 className="font-bold text-slate-950">活動詳情</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {eventData.description_tc || "未有活動詳情。"}
                  </p>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <InfoCard
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="日期及時間"
                    value={`${formatDateRange(eventData)}・${formatTimeRange(
                      eventData
                    )}`}
                  />

                  <InfoCard
                    icon={<MapPin className="h-4 w-4" />}
                    label="地點"
                    value={`${eventData.venue_name || "地點待確認"}・${
                      eventData.district || "地區待確認"
                    }・${eventData.mtr_station || "港鐵站待確認"}`}
                  />

                  <InfoCard
                    icon={<Ticket className="h-4 w-4" />}
                    label="收費"
                    value={formatPrice(eventData)}
                  />

                  <InfoCard
                    icon={<Store className="h-4 w-4" />}
                    label="主辦單位"
                    value={eventData.organizer_name || "主辦單位待確認"}
                  />
                </div>

                <InfoCard
                  icon={<MapPin className="h-4 w-4" />}
                  label="地址"
                  value={eventData.address || "地址待確認"}
                  className="mt-4"
                />

                <div className="mt-5 flex flex-wrap gap-2">
                  {getTags(eventData).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                <Store className="h-5 w-5 text-primary-500" />
                商戶資料
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <MiniRow
                  label="Business"
                  value={merchant?.business_name || "未有商戶名稱"}
                />
                <MiniRow
                  label="Contact"
                  value={merchant?.contact_name || "未有聯絡人"}
                />
                <MiniRow
                  label="Email"
                  value={merchant?.contact_email || "未有 email"}
                />
                <MiniRow
                  label="Merchant Status"
                  value={merchant?.status || "未確認"}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                <LinkIcon className="h-5 w-5 text-primary-500" />
                來源資料
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <MiniRow label="匯入方式" value={eventData.source_type || "manual"} />
                <MiniRow label="來源連結" value={eventData.source_url || "未有"} />
                <MiniRow
                  label="來源檔案"
                  value={eventData.source_file_url || "未有"}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                <FileText className="h-5 w-5 text-primary-500" />
                審批 Checklist
              </h2>

              <div className="mt-4 space-y-3">
                {checklist.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-2xl border p-3 ${
                      item.passed
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {item.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}

                      <span
                        className={`text-sm font-bold ${
                          item.passed ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>

                    <p
                      className={`mt-1 text-xs leading-5 ${
                        item.passed ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {item.helper}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">審批操作</h2>

              <button
                type="button"
                onClick={approveEvent}
                disabled={!canApprove || isWorking}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve and Publish
              </button>

              {!canApprove && eventData.status === "submitted" ? (
                <p className="mt-2 text-xs leading-5 text-amber-700">
                  活動仍有資料未符合要求，請先退回商戶補充。
                </p>
              ) : null}

              {eventData.status !== "submitted" ? (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  只有「待審批」活動可以批准或退回。
                </p>
              ) : null}

              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={5}
                placeholder="請填寫退回原因，例如：請補充正確地區、活動時間、收費或報名資料。"
                className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />

              <button
                type="button"
                onClick={rejectEvent}
                disabled={!canReject || isWorking}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <XCircle className="h-4 w-4" />
                Reject with Reason
              </button>

              {eventData.status === "submitted" && rejectReason.trim().length < 3 ? (
                <p className="mt-2 text-xs leading-5 text-red-600">
                  退回前必須填寫原因。
                </p>
              ) : null}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  icon,
  label,
  value,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>
      <div className="flex items-center gap-2 text-xs font-bold text-primary-600">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-1 break-all text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}
