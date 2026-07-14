"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  LogOut,
  MapPin,
  ShieldCheck,
  Tag,
  Ticket,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type ReviewEvent = {
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
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  published_at: string | null;
  admin_review_note: string | null;
};

type MerchantInfo = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  status: string | null;
};

const ADMIN_EMAILS = ["fionafung27@yahoo.com.hk", "info@hkfamilyfun.com"];

const FALLBACK_COVER_IMAGE =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80";

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

function formatDateRange(event: ReviewEvent) {
  if (!event.start_date && !event.end_date) return "日期待確認";

  const start = event.start_date || "";
  const end = event.end_date || "";

  if (start && end && start !== end) return `${start} 至 ${end}`;
  return start || end || "日期待確認";
}

function formatTimeRange(event: ReviewEvent) {
  if (!event.start_time && !event.end_time) return "時間待確認";

  const start = event.start_time ? event.start_time.slice(0, 5) : "";
  const end = event.end_time ? event.end_time.slice(0, 5) : "";

  if (start && end) return `${start} - ${end}`;
  return start || end || "時間待確認";
}

function formatPrice(event: ReviewEvent) {
  if (event.price_type === "free") return "免費";
  if (!event.price_type || event.price_type === "unknown") return "收費待確認";

  const min = Number(event.price_min || 0);
  const max = Number(event.price_max || 0);

  if (min === 0 && max === 0) return "收費待確認";
  if (min === max) return `HK$${min}`;
  return `HK$${min} - HK$${max}`;
}

function getMissingFields(event: ReviewEvent) {
  const missing: string[] = [];

  if (!event.title_tc?.trim()) missing.push("活動名稱");
  if (!event.short_description_tc?.trim()) missing.push("活動簡介");
  if (!event.description_tc?.trim()) missing.push("活動詳情");
  if (!event.start_date) missing.push("開始日期");

  if (!event.venue_name?.trim() || event.venue_name.includes("待")) {
    missing.push("場地名稱");
  }

  if (!event.district?.trim() || event.district.includes("待")) {
    missing.push("地區");
  }

  if (!event.price_type || event.price_type === "unknown") {
    missing.push("收費資料");
  }

  return missing;
}

export default function AdminEventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = String(params.id || "");

  const [adminEmail, setAdminEmail] = useState("");
  const [event, setEvent] = useState<ReviewEvent | null>(null);
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [rejectReason, setRejectReason] = useState(
    "請補充活動日期、地點、收費或報名資料。"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
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

      if (userError || !user?.email) {
        router.replace("/merchant/login");
        return;
      }

      if (!ADMIN_EMAILS.includes(user.email)) {
        setErrorMessage("你沒有權限查看 Admin 活動詳情。");
        setIsLoading(false);
        return;
      }

      setAdminEmail(user.email);

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
            "submitted_at",
            "approved_at",
            "rejected_at",
            "published_at",
            "admin_review_note",
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
        setErrorMessage("找不到活動資料。");
        setIsLoading(false);
        return;
      }

      const loadedEvent = data as unknown as ReviewEvent;
      setEvent(loadedEvent);

      if (loadedEvent.admin_review_note) {
        setRejectReason(loadedEvent.admin_review_note);
      }

      if (loadedEvent.merchant_id) {
        const { data: merchantData } = await supabase
          .from("merchants")
          .select("id, business_name, contact_name, contact_email, phone, status")
          .eq("id", loadedEvent.merchant_id)
          .maybeSingle();

        setMerchant((merchantData || null) as MerchantInfo | null);
      }

      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "載入活動詳情時發生未知錯誤。"
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

  async function approveEvent() {
    if (!event) return;

    if (missingFields.length > 0) {
      setErrorMessage(
        `不可批准。請先退回商戶補充：${missingFields.join("、")}`
      );
      return;
    }

    setIsUpdating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!supabase) {
        setErrorMessage(
          "Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。"
        );
        setIsUpdating(false);
        return;
      }

      const now = new Date().toISOString();

      const { error } = await supabase
        .from("events")
        .update({
          status: "published",
          approved_at: now,
          published_at: now,
          admin_review_note: null,
          updated_at: now,
        })
        .eq("id", event.id);

      if (error) {
        setErrorMessage(error.message);
        setIsUpdating(false);
        return;
      }

      setEvent({
        ...event,
        status: "published",
        approved_at: now,
        published_at: now,
        admin_review_note: null,
      });

      setSuccessMessage("活動已批准並公開發布。");
      setIsUpdating(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "批准活動時發生未知錯誤。"
      );
      setIsUpdating(false);
    }
  }

  async function rejectEvent() {
    if (!event) return;

    const cleanReason = rejectReason.trim();

    if (!cleanReason) {
      setErrorMessage("請先輸入退回原因。");
      return;
    }

    setIsUpdating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!supabase) {
        setErrorMessage(
          "Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。"
        );
        setIsUpdating(false);
        return;
      }

      const now = new Date().toISOString();

      const { error } = await supabase
        .from("events")
        .update({
          status: "rejected",
          rejected_at: now,
          admin_review_note: cleanReason,
          updated_at: now,
        })
        .eq("id", event.id);

      if (error) {
        setErrorMessage(error.message);
        setIsUpdating(false);
        return;
      }

      setEvent({
        ...event,
        status: "rejected",
        rejected_at: now,
        admin_review_note: cleanReason,
      });

      setSuccessMessage("活動已退回商戶修改。");
      setIsUpdating(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "退回活動時發生未知錯誤。"
      );
      setIsUpdating(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/merchant/login");
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">正在載入活動審批詳情...</p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-8">
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

  const canApprove = event.status === "submitted" && missingFields.length === 0;
  const canReject = event.status === "submitted" || event.status === "rejected";

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
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            登出
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
                {event.title_tc || "未命名活動"}
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Admin：{adminEmail || "未確認"}
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                event.status
              )}`}
            >
              {getStatusLabel(event.status)}
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

          {missingFields.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>不可直接批准，仍欠：</strong>
              {missingFields.join("、")}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              基本資料完整，可以批准發布。
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <div className="relative h-72 bg-slate-100">
                <img
                  src={event.cover_image_url || FALLBACK_COVER_IMAGE}
                  alt={event.title_tc || "Event cover"}
                  className="h-full w-full object-cover"
                />

                <div className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary-600 shadow-sm">
                  {event.category || "親子活動"}
                </div>
              </div>

              <div className="p-5">
                <h2 className="text-2xl font-bold text-slate-950">
                  {event.title_tc || "未命名活動"}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {event.short_description_tc || "未有活動簡介。"}
                </p>

                <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                  <h3 className="font-bold text-slate-950">活動詳情</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">
                    {event.description_tc || "未有活動詳情。"}
                  </p>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <InfoItem
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="日期及時間"
                    value={`${formatDateRange(event)} · ${formatTimeRange(
                      event
                    )}`}
                  />

                  <InfoItem
                    icon={<MapPin className="h-4 w-4" />}
                    label="地點"
                    value={`${event.venue_name || "場地待確認"} · ${
                      event.district || "地區待確認"
                    } · ${event.mtr_station || "港鐵站待確認"}`}
                  />

                  <InfoItem
                    icon={<Ticket className="h-4 w-4" />}
                    label="收費"
                    value={formatPrice(event)}
                  />

                  <InfoItem
                    icon={<Tag className="h-4 w-4" />}
                    label="主辦單位"
                    value={event.organizer_name || "待確認"}
                  />
                </div>

                {event.address ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <div className="font-semibold text-slate-950">地址</div>
                    <div className="mt-1">{event.address}</div>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  {(event.tags || ["親子活動"]).map((tag) => (
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
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">商戶資料</h2>

              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <div className="text-xs font-semibold text-slate-500">
                    Business
                  </div>
                  <div className="font-semibold text-slate-950">
                    {merchant?.business_name || "未有商戶名稱"}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500">
                    Contact
                  </div>
                  <div>{merchant?.contact_name || "未有聯絡人"}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500">
                    Email
                  </div>
                  <div>{merchant?.contact_email || "未有 email"}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500">
                    Merchant Status
                  </div>
                  <div>{merchant?.status || "未確認"}</div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
                    <a
                      href={event.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 break-all text-primary-600 hover:text-primary-700"
                    >
                      {event.source_url}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
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
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">審批操作</h2>

              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={approveEvent}
                  disabled={!canApprove || isUpdating}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isUpdating ? "處理中..." : "Approve and Publish"}
                </button>

                <textarea
                  value={rejectReason}
                  onChange={(textareaEvent) =>
                    setRejectReason(textareaEvent.target.value)
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  placeholder="輸入退回原因，商戶會看到此訊息。"
                />

                <button
                  type="button"
                  onClick={rejectEvent}
                  disabled={!canReject || isUpdating}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <XCircle className="h-4 w-4" />
                  {isUpdating ? "處理中..." : "Reject with Reason"}
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 text-sm">
      <div className="flex items-center gap-2 font-semibold text-slate-950">
        <span className="text-primary-500">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-slate-600">{value}</div>
    </div>
  );
}
