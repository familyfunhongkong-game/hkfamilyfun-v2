"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  FileText,
  LogOut,
  Plus,
  Send,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Merchant = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: string | null;
  rejection_reason?: string | null;
};

type MerchantEvent = {
  id: string;
  title_tc: string | null;
  status: string | null;
  source_type: string | null;
  source_url: string | null;
  source_file_url: string | null;
  cover_image_url: string | null;
  created_at: string | null;
  submitted_at: string | null;
};

function getStatusLabel(status: string | null) {
  switch (status) {
    case "draft":
      return "草稿";
    case "submitted":
      return "審批中";
    case "rejected":
      return "待修改";
    case "published":
      return "已發布";
    case "approved":
      return "已批准";
    case "archived":
      return "已封存";
    default:
      return "未知";
  }
}

function getStatusClass(status: string | null) {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-700";
    case "submitted":
      return "bg-blue-100 text-blue-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    case "published":
    case "approved":
      return "bg-green-100 text-green-700";
    case "archived":
      return "bg-zinc-100 text-zinc-600";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatDate(value: string | null) {
  if (!value) return "未有日期";

  try {
    return new Intl.DateTimeFormat("zh-HK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function canMerchantEdit(status: string | null) {
  return status === "draft" || status === "rejected";
}

export default function MerchantDashboardPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [events, setEvents] = useState<MerchantEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDashboard() {
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

      const { data: merchantData, error: merchantError } = await supabase
        .from("merchants")
        .select(
          "id, business_name, contact_name, contact_email, status, rejection_reason"
        )
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

      setMerchant(merchantData as Merchant);

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(
          "id, title_tc, status, source_type, source_url, source_file_url, cover_image_url, created_at, submitted_at"
        )
        .eq("merchant_id", merchantData.id)
        .order("created_at", { ascending: false });

      if (eventError) {
        setErrorMessage(eventError.message);
        setIsLoading(false);
        return;
      }

      setEvents((eventData || []) as unknown as MerchantEvent[]);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "載入商戶 Dashboard 時發生未知錯誤。"
      );
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const draft = events.filter((event) => event.status === "draft").length;
    const submitted = events.filter(
      (event) => event.status === "submitted"
    ).length;
    const rejected = events.filter((event) => event.status === "rejected")
      .length;
    const published = events.filter(
      (event) => event.status === "published" || event.status === "approved"
    ).length;

    return {
      draft,
      submitted,
      rejected,
      published,
    };
  }, [events]);

  async function handleLogout() {
    if (!supabase) return;

    await supabase.auth.signOut();
    router.replace("/merchant/login");
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">正在載入商戶中心...</p>
        </div>
      </main>
    );
  }

  if (!merchant) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-red-600">找不到商戶帳戶。</p>
        </div>
      </main>
    );
  }

  const isApproved = merchant.status === "approved";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary-600">
                HK Family Fun Merchant Portal
              </p>

              <h1 className="mt-1 text-2xl font-bold text-slate-950">
                {merchant.business_name || "商戶帳戶"}
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                {merchant.contact_name || "商戶"} ·{" "}
                {merchant.contact_email || "未有電郵"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              登出
            </button>
          </div>
        </section>

        {errorMessage ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {isApproved ? (
          <section className="mb-6 rounded-3xl border border-green-200 bg-green-50 p-5">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div>
                <h2 className="font-semibold text-green-900">
                  商戶帳戶已通過
                </h2>
                <p className="mt-1 text-sm text-green-800">
                  你可以匯入活動資料、建立草稿、預覽活動卡，然後提交 HK
                  Family Fun 審批。
                </p>
              </div>
            </div>
          </section>
        ) : merchant.status === "rejected" ? (
          <section className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5">
            <div className="flex gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <h2 className="font-semibold text-red-900">
                  商戶帳戶未能通過
                </h2>
                <p className="mt-1 text-sm text-red-800">
                  {merchant.rejection_reason ||
                    "請聯絡 HK Family Fun 補充商戶資料。"}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h2 className="font-semibold text-amber-900">
                  商戶帳戶審批中
                </h2>
                <p className="mt-1 text-sm text-amber-800">
                  HK Family Fun 一般會於 1–2 個工作天內審核商戶資料。
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">草稿</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">
              {stats.draft}
            </p>
            <p className="mt-1 text-xs text-slate-500">尚未提交的活動</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">審批中</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">
              {stats.submitted}
            </p>
            <p className="mt-1 text-xs text-slate-500">已提交平台審核</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">待修改</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">
              {stats.rejected}
            </p>
            <p className="mt-1 text-xs text-slate-500">被退回或需要補資料</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">已發布</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">
              {stats.published}
            </p>
            <p className="mt-1 text-xs text-slate-500">公開中的活動</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">活動管理</h2>
              <p className="mt-1 text-sm text-slate-600">
                你可以建立活動草稿、預覽活動卡、補充資料，然後提交審批。
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/merchant/events/import")}
              disabled={!isApproved}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              匯入活動資料
            </button>
          </div>

          {events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-slate-400" />
              <h3 className="font-semibold text-slate-900">
                暫時未有活動
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                按「匯入活動資料」建立第一個活動草稿。
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-12 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <div className="col-span-5">活動</div>
                <div className="col-span-2">狀態</div>
                <div className="col-span-2">來源</div>
                <div className="col-span-2">建立日期</div>
                <div className="col-span-1 text-right">操作</div>
              </div>

              <div className="divide-y divide-slate-200">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="grid grid-cols-12 items-center px-4 py-4 text-sm"
                  >
                    <div className="col-span-5">
                      <p className="font-semibold text-slate-950">
                        {event.title_tc || "未命名活動"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        ID: {event.id.slice(0, 8)}...
                      </p>
                    </div>

                    <div className="col-span-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                          event.status
                        )}`}
                      >
                        {getStatusLabel(event.status)}
                      </span>
                    </div>

                    <div className="col-span-2 text-slate-600">
                      {event.source_type || "manual"}
                    </div>

                    <div className="col-span-2 text-slate-600">
                      {formatDate(event.created_at)}
                    </div>

                    <div className="col-span-1 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/merchant/events/${event.id}/preview`)
                        }
                        className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {canMerchantEdit(event.status) ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/merchant/events/${event.id}/edit`)
                            }
                            className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/merchant/events/${event.id}/preview`)
                            }
                            className="rounded-lg border border-primary-300 p-2 text-primary-600 hover:bg-primary-50"
                            title="Submit"
                          >
                            <Send className="h-4 w-4" />
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

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
            <div>
              <h2 className="font-semibold text-slate-950">
                建議商戶流程
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                1. 匯入活動資料 → 2. 檢查 Preview → 3. 修改資料 → 4.
                提交審批 → 5. HK Family Fun 發布活動。
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}