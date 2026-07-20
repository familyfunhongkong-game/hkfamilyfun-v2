"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Edit3,
  Eye,
  LogOut,
  Plus,
  Send,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type MerchantProfile = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: string | null;
  rejection_reason: string | null;
};

type MerchantEvent = {
  id: string;
  merchant_id: string | null;
  title_tc: string | null;
  short_description_tc: string | null;
  status: string | null;
  source_type: string | null;
  source_url: string | null;
  source_file_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  published_at: string | null;
  admin_review_note: string | null;
};

type FilterKey =
  | "active"
  | "draft"
  | "submitted"
  | "rejected"
  | "published"
  | "archived"
  | "all";

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
      return "bg-slate-100 text-slate-700";
  }
}

function formatDate(value: string | null) {
  if (!value) return "日期待確認";

  try {
    return new Intl.DateTimeFormat("zh-HK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getEventPrimaryDate(event: MerchantEvent) {
  return (
    event.published_at ||
    event.approved_at ||
    event.rejected_at ||
    event.submitted_at ||
    event.updated_at ||
    event.created_at
  );
}

export default function MerchantDashboardPage() {
  const router = useRouter();

  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [events, setEvents] = useState<MerchantEvent[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [isArchiving, setIsArchiving] = useState<string | null>(null);
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

      const loadedMerchant = merchantData as MerchantProfile;
      setMerchant(loadedMerchant);

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(
          [
            "id",
            "merchant_id",
            "title_tc",
            "short_description_tc",
            "status",
            "source_type",
            "source_url",
            "source_file_url",
            "created_at",
            "updated_at",
            "submitted_at",
            "approved_at",
            "rejected_at",
            "published_at",
            "admin_review_note",
          ].join(", ")
        )
        .eq("merchant_id", loadedMerchant.id)
        .order("updated_at", { ascending: false })
        .limit(100);

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
          : "載入商戶後台時發生未知錯誤。"
      );
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    return {
      draft: events.filter((event) => event.status === "draft").length,
      submitted: events.filter((event) => event.status === "submitted").length,
      rejected: events.filter((event) => event.status === "rejected").length,
      published: events.filter((event) => event.status === "published").length,
      archived: events.filter((event) => event.status === "archived").length,
      active: events.filter((event) => event.status !== "archived").length,
      all: events.length,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (activeFilter === "all") return events;

    if (activeFilter === "active") {
      return events.filter((event) => event.status !== "archived");
    }

    return events.filter((event) => event.status === activeFilter);
  }, [activeFilter, events]);

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/merchant/login");
  }

  async function archiveEvent(eventId: string) {
    const confirmed = window.confirm(
      "確定要封存這個活動？封存後不會預設顯示在商戶後台。"
    );

    if (!confirmed) return;

    setIsArchiving(eventId);
    setErrorMessage("");

    try {
      if (!supabase) {
        setErrorMessage(
          "Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。"
        );
        setIsArchiving(null);
        return;
      }

      const { error } = await supabase
        .from("events")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (error) {
        setErrorMessage(error.message);
        setIsArchiving(null);
        return;
      }

      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === eventId
            ? {
                ...event,
                status: "archived",
                updated_at: new Date().toISOString(),
              }
            : event
        )
      );

      setIsArchiving(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "封存活動時發生未知錯誤。"
      );
      setIsArchiving(null);
    }
  }

  const filterButtons: { key: FilterKey; label: string; count: number }[] = [
    { key: "active", label: "常用", count: counts.active },
    { key: "draft", label: "草稿", count: counts.draft },
    { key: "submitted", label: "審批中", count: counts.submitted },
    { key: "rejected", label: "待修改", count: counts.rejected },
    { key: "published", label: "已發布", count: counts.published },
    { key: "archived", label: "已封存", count: counts.archived },
    { key: "all", label: "全部", count: counts.all },
  ];

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">正在載入商戶後台...</p>
        </div>
      </main>
    );
  }

  if (!merchant) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-xl font-bold text-red-900">找不到商戶帳戶</h1>
          <p className="mt-2 text-sm text-red-700">
            請重新登入，或先完成商戶免費登記。
          </p>
        </div>
      </main>
    );
  }

  const merchantApproved = merchant.status === "approved";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary-600">
                HK Family Fun Merchant Portal
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                {merchant.business_name || "未命名商戶"}
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                {merchant.contact_name || "未有聯絡人"} ·{" "}
                {merchant.contact_email || "未有 email"}
              </p>
            </div>

            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              登出
            </button>
          </div>
        </section>

        {merchantApproved ? (
          <section className="mt-6 rounded-3xl border border-green-200 bg-green-50 p-5">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div>
                <h2 className="font-bold text-green-900">商戶帳戶已通過</h2>
                <p className="mt-1 text-sm leading-6 text-green-700">
                  你可以匯入活動資料、建立草稿、預覽活動卡、補充資料，然後提交給 HK Family Fun 審批。
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h2 className="font-bold text-amber-900">商戶帳戶仍在審批中</h2>
                <p className="mt-1 text-sm leading-6 text-amber-700">
                  你可以先查看已建立的活動，但正式提交及發布功能可能受限制。
                </p>

                {merchant.rejection_reason ? (
                  <p className="mt-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-amber-700">
                    {merchant.rejection_reason}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        )}

        {errorMessage ? (
          <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </section>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <StatCard label="草稿" value={counts.draft} caption="尚未提交的活動" />
          <StatCard
            label="審批中"
            value={counts.submitted}
            caption="已提交平台審核"
          />
          <StatCard
            label="待修改"
            value={counts.rejected}
            caption="被退回或需要補資料"
          />
          <StatCard
            label="已發布"
            value={counts.published}
            caption="公開中的活動"
          />
        </section>

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
                {button.label} ({button.count})
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">活動管理</h2>

              <p className="mt-1 text-sm text-slate-600">
                你可以建立活動草稿、預覽活動卡、補充資料，然後提交審批。
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/merchant/events/import")}
              disabled={!merchantApproved}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Plus className="h-4 w-4" />
              匯入活動資料
            </button>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <p className="font-semibold text-slate-900">暫時沒有活動</p>
              <p className="mt-1 text-sm text-slate-500">
                你可以按「匯入活動資料」建立第一個活動草稿。
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">活動</th>
                    <th className="px-4 py-3">狀態</th>
                    <th className="px-4 py-3">來源</th>
                    <th className="px-4 py-3">最後更新</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {filteredEvents.map((event) => {
                    const canEdit =
                      event.status === "draft" || event.status === "rejected";
                    const canSubmit =
                      event.status === "draft" || event.status === "rejected";
                    const canArchive =
                      event.status !== "archived" &&
                      event.status !== "submitted";

                    return (
                      <tr key={event.id} className="align-top">
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-950">
                            {event.title_tc || "未命名活動"}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            ID: {event.id.slice(0, 8)}...
                          </div>

                          {event.short_description_tc ? (
                            <p className="mt-1 line-clamp-2 max-w-md text-xs leading-5 text-slate-500">
                              {event.short_description_tc}
                            </p>
                          ) : null}

                          {event.status === "rejected" &&
                          event.admin_review_note ? (
                            <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                              <span className="font-semibold">退回原因：</span>
                              {event.admin_review_note}
                            </div>
                          ) : null}
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

                        <td className="px-4 py-4 text-xs text-slate-600">
                          {event.source_type || "manual"}
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-600">
                          {formatDate(getEventPrimaryDate(event))}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/merchant/events/${event.id}/preview`
                                )
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
                              title="查看 Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/merchant/events/${event.id}/edit`
                                  )
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
                                title="修改資料"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                            ) : null}

                            {canSubmit ? (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/merchant/events/${event.id}/preview`
                                  )
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary-300 text-primary-600 hover:bg-primary-50"
                                title="預覽後提交審批"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            ) : null}

                            {canArchive ? (
                              <button
                                type="button"
                                onClick={() => archiveEvent(event.id)}
                                disabled={isArchiving === event.id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                                title="封存活動"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
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

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-950">建議商戶流程</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            1. 匯入活動資料 → 2. 檢查 Preview → 3. 修改資料 → 4. 提交審批 → 5. HK Family Fun 發布活動。
          </p>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-600">{label}</div>
      <div className="mt-3 text-3xl font-bold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{caption}</div>
    </div>
  );
}