"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  LogOut,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type AdminEvent = {
  id: string;
  merchant_id: string | null;
  title_tc: string | null;
  short_description_tc: string | null;
  organizer_name: string | null;
  venue_name: string | null;
  district: string | null;
  start_date: string | null;
  end_date: string | null;
  price_type: string | null;
  status: string | null;
  source_type: string | null;
  source_url: string | null;
  created_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  published_at: string | null;
  admin_review_note: string | null;
};

type MerchantInfo = {
  id: string;
  business_name: string | null;
  contact_email: string | null;
};

const ADMIN_EMAILS = ["fionafung27@yahoo.com.hk", "info@hkfamilyfun.com"];

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

function formatEventDate(event: AdminEvent) {
  if (!event.start_date && !event.end_date) return "日期待確認";

  if (event.start_date && event.end_date && event.start_date !== event.end_date) {
    return `${event.start_date} 至 ${event.end_date}`;
  }

  return event.start_date || event.end_date || "日期待確認";
}

export default function AdminEventsPage() {
  const router = useRouter();

  const [adminEmail, setAdminEmail] = useState("");
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [merchants, setMerchants] = useState<Record<string, MerchantInfo>>({});
  const [activeFilter, setActiveFilter] = useState<
    "submitted" | "published" | "rejected" | "archived" | "all"
  >("submitted");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadEvents() {
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

      if (userError || !user?.email) {
        router.replace("/merchant/login");
        return;
      }

      if (!ADMIN_EMAILS.includes(user.email)) {
        setErrorMessage("你沒有權限進入 Admin 審批後台。");
        setIsLoading(false);
        return;
      }

      setAdminEmail(user.email);

      let query = supabase
        .from("events")
        .select(
          [
            "id",
            "merchant_id",
            "title_tc",
            "short_description_tc",
            "organizer_name",
            "venue_name",
            "district",
            "start_date",
            "end_date",
            "price_type",
            "status",
            "source_type",
            "source_url",
            "created_at",
            "submitted_at",
            "approved_at",
            "rejected_at",
            "published_at",
            "admin_review_note",
          ].join(", ")
        )
        .order("submitted_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .limit(100);

      if (activeFilter !== "all") {
        query = query.eq("status", activeFilter);
      }

      const { data, error } = await query;

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      const loadedEvents = (data || []) as unknown as AdminEvent[];
      setEvents(loadedEvents);

      const merchantIds = Array.from(
        new Set(
          loadedEvents
            .map((event) => event.merchant_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      if (merchantIds.length > 0) {
        const { data: merchantData, error: merchantError } = await supabase
          .from("merchants")
          .select("id, business_name, contact_email")
          .in("id", merchantIds);

        if (!merchantError && merchantData) {
          const merchantMap: Record<string, MerchantInfo> = {};

          (merchantData as MerchantInfo[]).forEach((merchant) => {
            merchantMap[merchant.id] = merchant;
          });

          setMerchants(merchantMap);
        }
      } else {
        setMerchants({});
      }

      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "載入 Admin 活動列表時發生未知錯誤。"
      );
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  const counts = useMemo(() => {
    return {
      total: events.length,
      submitted: events.filter((event) => event.status === "submitted").length,
      published: events.filter((event) => event.status === "published").length,
      rejected: events.filter((event) => event.status === "rejected").length,
      archived: events.filter((event) => event.status === "archived").length,
    };
  }, [events]);

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/merchant/login");
  }

  const filterButtons = [
    { key: "submitted", label: "待審批" },
    { key: "published", label: "已發布" },
    { key: "rejected", label: "已退回" },
    { key: "archived", label: "已封存" },
    { key: "all", label: "全部" },
  ] as const;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-primary-600">
                <ShieldCheck className="h-4 w-4" />
                HK Family Fun Admin
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                活動審批後台
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                查看商戶提交的活動。建議先按眼睛進入詳情頁，再決定 Approve 或 Reject。
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Admin：{adminEmail || "未確認"}
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
                onClick={signOut}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                登出
              </button>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {filterButtons.map((button) => (
              <button
                key={button.key}
                type="button"
                onClick={() => setActiveFilter(button.key)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                  activeFilter === button.key
                    ? "border-primary-500 bg-primary-500 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {button.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">活動列表</h2>

              <p className="mt-1 text-sm text-slate-500">
                目前顯示：{counts.total} 個活動
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-sm text-slate-600">
              正在載入活動...
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <p className="font-semibold text-slate-900">暫時沒有活動</p>
              <p className="mt-1 text-sm text-slate-500">
                當商戶提交活動後，會出現在這裡。
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">活動</th>
                    <th className="px-4 py-3">商戶</th>
                    <th className="px-4 py-3">日期 / 地點</th>
                    <th className="px-4 py-3">來源</th>
                    <th className="px-4 py-3">狀態</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {events.map((event) => {
                    const merchant = event.merchant_id
                      ? merchants[event.merchant_id]
                      : null;

                    return (
                      <tr key={event.id} className="align-top">
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-950">
                            {event.title_tc || "未命名活動"}
                          </div>

                          <div className="mt-1 line-clamp-2 max-w-sm text-xs leading-5 text-slate-500">
                            {event.short_description_tc || "未有活動簡介"}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            ID: {event.id.slice(0, 8)}...
                          </div>

                          {event.status === "rejected" &&
                          event.admin_review_note ? (
                            <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                              <span className="font-semibold">退回原因：</span>
                              {event.admin_review_note}
                            </div>
                          ) : null}
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">
                            {merchant?.business_name ||
                              event.organizer_name ||
                              "未有商戶資料"}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {merchant?.contact_email || "未有 email"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-xs leading-5 text-slate-600">
                          <div>{formatEventDate(event)}</div>

                          <div>
                            {event.venue_name || "場地待確認"} ·{" "}
                            {event.district || "地區待確認"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-600">
                          {event.source_type || "manual"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                              event.status
                            )}`}
                          >
                            {getStatusLabel(event.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/admin/events/${event.id}`)
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
                              title="查看詳情"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {event.status === "submitted" ? (
                              <span className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                                <CheckCircle2 className="h-3 w-3" />
                                進入詳情審批
                              </span>
                            ) : null}

                            {event.status === "rejected" ? (
                              <span className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                                <XCircle className="h-3 w-3" />
                                等待商戶修改
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}