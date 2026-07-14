"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type AdminEvent = {
  id: string;
  title_tc: string | null;
  short_description_tc: string | null;
  organizer_name: string | null;
  venue_name: string | null;
  district: string | null;
  start_date: string | null;
  price_type: string | null;
  price_min: number | null;
  price_max: number | null;
  status: string | null;
  source_type: string | null;
  source_url: string | null;
  source_file_url: string | null;
  cover_image_url: string | null;
  submitted_at: string | null;
  created_at: string | null;
  admin_review_note: string | null;
  merchants:
    | {
        business_name: string | null;
        contact_email: string | null;
      }
    | {
        business_name: string | null;
        contact_email: string | null;
      }[]
    | null;
};

const ADMIN_EMAILS = [
  "fionafung27@yahoo.com.hk",
  "info@hkfamilyfun.com",
];

function getMerchantName(event: AdminEvent) {
  if (Array.isArray(event.merchants)) {
    return event.merchants[0]?.business_name || "未有商戶名稱";
  }

  return event.merchants?.business_name || "未有商戶名稱";
}

function getMerchantEmail(event: AdminEvent) {
  if (Array.isArray(event.merchants)) {
    return event.merchants[0]?.contact_email || "";
  }

  return event.merchants?.contact_email || "";
}

function getStatusLabel(status: string | null) {
  switch (status) {
    case "draft":
      return "草稿";
    case "submitted":
      return "待審批";
    case "published":
      return "已發布";
    case "rejected":
      return "已退回";
    case "approved":
      return "已批准";
    default:
      return "未知";
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
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatPrice(event: AdminEvent) {
  if (event.price_type === "free") return "免費";
  if (!event.price_type || event.price_type === "unknown") return "收費待確認";

  const min = Number(event.price_min || 0);
  const max = Number(event.price_max || 0);

  if (min === 0 && max === 0) return "收費待確認";
  if (min === max) return `HK$${min}`;
  return `HK$${min} - HK$${max}`;
}

export default function AdminEventsPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    "submitted" | "published" | "rejected" | "all"
  >("submitted");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isAdmin = useMemo(() => {
    return ADMIN_EMAILS.includes(currentEmail.toLowerCase());
  }, [currentEmail]);

  async function loadEvents() {
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

      setCurrentEmail(user.email);

      if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        setErrorMessage("你沒有權限進入 HK Family Fun Admin 後台。");
        setIsLoading(false);
        return;
      }

      let query = supabase
        .from("events")
        .select(
          [
            "id",
            "title_tc",
            "short_description_tc",
            "organizer_name",
            "venue_name",
            "district",
            "start_date",
            "price_type",
            "price_min",
            "price_max",
            "status",
            "source_type",
            "source_url",
            "source_file_url",
            "cover_image_url",
            "submitted_at",
            "created_at",
            "admin_review_note",
            "merchants(business_name, contact_email)",
          ].join(", ")
        )
        .order("submitted_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setEvents((data || []) as unknown as AdminEvent[]);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "載入 Admin Events 時發生未知錯誤。"
      );
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function approveEvent(eventId: string) {
    setIsActionLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!supabase) {
        setErrorMessage("Supabase client 未能初始化。");
        setIsActionLoading(false);
        return;
      }

      const { error } = await supabase
        .from("events")
        .update({
          status: "published",
          approved_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
          admin_review_note: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (error) {
        setErrorMessage(error.message);
        setIsActionLoading(false);
        return;
      }

      setSuccessMessage("活動已批准並發布。");
      await loadEvents();
      setIsActionLoading(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "批准活動時發生未知錯誤。"
      );
      setIsActionLoading(false);
    }
  }

  async function rejectEvent(eventId: string) {
    const reason = window.prompt(
      "請輸入退回原因，商戶會看到此訊息：",
      "請補充活動日期、地點、收費或報名資料。"
    );

    if (!reason) return;

    setIsActionLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!supabase) {
        setErrorMessage("Supabase client 未能初始化。");
        setIsActionLoading(false);
        return;
      }

      const { error } = await supabase
        .from("events")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
          admin_review_note: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (error) {
        setErrorMessage(error.message);
        setIsActionLoading(false);
        return;
      }

      setSuccessMessage("活動已退回商戶修改。");
      await loadEvents();
      setIsActionLoading(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "退回活動時發生未知錯誤。"
      );
      setIsActionLoading(false);
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/merchant/login");
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">正在載入 Admin Events...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-xl font-bold text-red-900">沒有 Admin 權限</h1>
          <p className="mt-2 text-sm text-red-700">
            目前登入帳戶：{currentEmail || "未登入"}
          </p>
          <button
            type="button"
            onClick={() => router.push("/merchant/dashboard")}
            className="mt-5 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            返回 Merchant Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-primary-600">
                <ShieldCheck className="h-4 w-4" />
                HK Family Fun Admin
              </p>

              <h1 className="mt-1 text-3xl font-bold text-slate-950">
                活動審批後台
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                查看商戶已提交活動，批准後會公開發布，退回後商戶可修改再提交。
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Admin：{currentEmail}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadEvents}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                登出
              </button>
            </div>
          </div>
        </section>

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

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {[
              { value: "submitted", label: "待審批" },
              { value: "published", label: "已發布" },
              { value: "rejected", label: "已退回" },
              { value: "all", label: "全部" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setStatusFilter(
                    item.value as "submitted" | "published" | "rejected" | "all"
                  )
                }
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  statusFilter === item.value
                    ? "bg-primary-500 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            活動列表
          </h2>

          {events.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="font-semibold text-slate-900">暫時沒有活動</p>
              <p className="mt-1 text-sm text-slate-500">
                當商戶提交活動後，會出現在這裡。
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-12 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <div className="col-span-4">活動</div>
                <div className="col-span-2">商戶</div>
                <div className="col-span-2">日期 / 地點</div>
                <div className="col-span-1">收費</div>
                <div className="col-span-1">狀態</div>
                <div className="col-span-2 text-right">操作</div>
              </div>

              <div className="divide-y divide-slate-200">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="grid grid-cols-12 items-center gap-2 px-4 py-4 text-sm"
                  >
                    <div className="col-span-4">
                      <p className="font-semibold text-slate-950">
                        {event.title_tc || "未命名活動"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {event.short_description_tc || "未有簡介"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        ID: {event.id.slice(0, 8)}...
                      </p>
                    </div>

                    <div className="col-span-2">
                      <p className="font-semibold text-slate-800">
                        {getMerchantName(event)}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        {getMerchantEmail(event)}
                      </p>
                    </div>

                    <div className="col-span-2 text-slate-600">
                      <p>{event.start_date || "日期待確認"}</p>
                      <p className="mt-1 text-xs">
                        {event.venue_name || "場地待確認"} ·{" "}
                        {event.district || "地區待確認"}
                      </p>
                    </div>

                    <div className="col-span-1 text-slate-600">
                      {formatPrice(event)}
                    </div>

                    <div className="col-span-1">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                          event.status
                        )}`}
                      >
                        {getStatusLabel(event.status)}
                      </span>
                    </div>

                    <div className="col-span-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/events/${event.id}`)
                        }
                        className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
                        title="View public detail"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {event.status === "submitted" ? (
                        <>
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => approveEvent(event.id)}
                            className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => rejectEvent(event.id)}
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
