"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  封存,
  CheckCircle2,
  Copy,
  編輯3,
  ExternalLink,
  Eye,
  Loader2,
  LogOut,
  Plus,
  RefreshCcw,
  Send,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type MerchantProfile = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: string | null;
  rejection_reason?: string | null;
};

type EventStatus = "draft" | "submitted" | "published" | "rejected" | "archived" | string;

type MerchantEvent = {
  id: string;
  merchant_id: string | null;
  title_tc: string | null;
  short_description_tc: string | null;
  status: EventStatus | null;
  source_type: string | null;
  source_url: string | null;
  cover_image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  venue_name: string | null;
  district: string | null;
  mtr_station: string | null;
  price_type: string | null;
  created_at: string | null;
  updated_at: string | null;
  submitted_at: string | null;
  published_at?: string | null;
};

const STATUS_TABS = [
  { value: "all", label: "全部" },
  { value: "draft", label: "草稿" },
  { value: "submitted", label: "審批中" },
  { value: "rejected", label: "待修改" },
  { value: "published", label: "已發布" },
  { value: "archived", label: "已封存" },
];

function getStatusLabel(status: EventStatus | null | undefined) {
  if (status === "draft") return "草稿";
  if (status === "submitted") return "審批中";
  if (status === "published") return "已發布";
  if (status === "rejected") return "待修改";
  if (status === "archived") return "已封存";
  return "待確認";
}

function getStatusClass(status: EventStatus | null | undefined) {
  if (status === "published") return "bg-green-100 text-green-700";
  if (status === "submitted") return "bg-blue-100 text-blue-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "archived") return "bg-slate-100 text-slate-500";
  return "bg-amber-100 text-amber-700";
}

function getMerchantStatusLabel(status: string | null | undefined) {
  if (status === "approved") return "商戶帳戶已通過";
  if (status === "rejected") return "商戶帳戶待修改";
  if (status === "suspended") return "商戶帳戶暫停";
  return "商戶帳戶審批中";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "未設定";
  try {
    return new Intl.DateTimeFormat("zh-HK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value.slice(0, 10);
  }
}

function getStatusCount(events: MerchantEvent[], status: string) {
  return events.filter((event) => event.status === status).length;
}

function getShortId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}...` : id;
}

function getSafeTitle(event: MerchantEvent) {
  return event.title_tc?.trim() || "未命名活動";
}

function getSafeDescription(event: MerchantEvent) {
  return event.short_description_tc?.trim() || "尚未加入活動簡介。";
}

function isActionDisabled(status: EventStatus | null | undefined) {
  return status === "archived";
}

export default function MerchantDashboardPage() {
  const router = useRouter();

  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [events, setEvents] = useState<MerchantEvent[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [workingEventId, setWorkingEventId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const filteredEvents = useMemo(() => {
    if (activeTab === "all") return events;
    return events.filter((event) => event.status === activeTab);
  }, [activeTab, events]);

  const counts = useMemo(() => {
    return {
      draft: getStatusCount(events, "draft"),
      submitted: getStatusCount(events, "submitted"),
      rejected: getStatusCount(events, "rejected"),
      published: getStatusCount(events, "published"),
      archived: getStatusCount(events, "archived"),
      all: events.length,
    };
  }, [events]);

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDashboard(isManualRefresh = false) {
    if (!supabase) {
      setErrorMessage("Supabase client 未能初始化。請檢查 .env.local。");
      setIsLoading(false);
      return;
    }

    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
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
        .select("id, business_name, contact_name, contact_email, status, rejection_reason")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (merchantError) {
        setErrorMessage(merchantError.message);
        setIsLoading(false);
        setIsRefreshing(false);
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
        .select(
          "id, merchant_id, title_tc, short_description_tc, status, source_type, source_url, cover_image_url, start_date, end_date, venue_name, district, mtr_station, price_type, created_at, updated_at, submitted_at, published_at"
        )
        .eq("merchant_id", merchantRecord.id)
        .order("updated_at", { ascending: false });

      if (eventError) {
        setErrorMessage(eventError.message);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      setEvents((eventData || []) as MerchantEvent[]);
      setIsLoading(false);
      setIsRefreshing(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "載入 商戶管理頁 時發生未知錯誤。");
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/merchant/login");
  }

  async function submitEvent(eventId: string) {
    if (!supabase) return;

    setWorkingEventId(eventId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("events")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          merchant_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (error) {
        setErrorMessage(error.message);
        setWorkingEventId(null);
        return;
      }

      setSuccessMessage("活動已提交 HK Family Fun 審批。");
      await loadDashboard(true);
      setWorkingEventId(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "提交活動時發生未知錯誤。");
      setWorkingEventId(null);
    }
  }

  async function duplicateEvent(eventId: string) {
    if (!supabase || !merchant) return;

    const confirmed = window.confirm("是否複製此活動成為新草稿？");
    if (!confirmed) return;

    setWorkingEventId(eventId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .eq("merchant_id", merchant.id)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setWorkingEventId(null);
        return;
      }

      if (!data) {
        setErrorMessage("找不到要複製的活動。");
        setWorkingEventId(null);
        return;
      }

      const sourceEvent = data as Record<string, unknown>;

      const clonedEvent: Record<string, unknown> = {
        ...sourceEvent,
        title_tc: `${String(sourceEvent.title_tc || "未命名活動")}（副本）`,
        status: "draft",
        submitted_at: null,
        merchant_confirmed_at: null,
        published_at: null,
        rejected_at: null,
        admin_review_note: null,
        rejection_reason: null,
        created_at: undefined,
        updated_at: new Date().toISOString(),
      };

      delete clonedEvent.id;

      const { data: insertedData, error: insertError } = await supabase
        .from("events")
        .insert(clonedEvent)
        .select("id")
        .single();

      if (insertError) {
        setErrorMessage(insertError.message);
        setWorkingEventId(null);
        return;
      }

      setSuccessMessage("已複製活動為新草稿。");
      await loadDashboard(true);

      if (insertedData?.id) {
        router.push(`/merchant/events/${insertedData.id}/edit`);
      }

      setWorkingEventId(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "複製活動時發生未知錯誤。");
      setWorkingEventId(null);
    }
  }

  async function archiveEvent(eventId: string) {
    if (!supabase) return;

    const confirmed = window.confirm("是否封存此活動？封存後不會在一般管理列表優先顯示。");
    if (!confirmed) return;

    setWorkingEventId(eventId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("events")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (error) {
        setErrorMessage(error.message);
        setWorkingEventId(null);
        return;
      }

      setSuccessMessage("活動已封存。");
      await loadDashboard(true);
      setWorkingEventId(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "封存活動時發生未知錯誤。");
      setWorkingEventId(null);
    }
  }

  async function restore封存dEvent(eventId: string) {
    if (!supabase) return;

    setWorkingEventId(eventId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("events")
        .update({
          status: "draft",
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (error) {
        setErrorMessage(error.message);
        setWorkingEventId(null);
        return;
      }

      setSuccessMessage("活動已還原為草稿。");
      await loadDashboard(true);
      setWorkingEventId(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "還原活動時發生未知錯誤。");
      setWorkingEventId(null);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
            正在載入 商戶管理頁...
          </div>
        </div>
      </main>
    );
  }

  if (!merchant) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
          找不到商戶資料。請重新登入或重新登記商戶帳戶。
        </div>
      </main>
    );
  }

  const merchantApproved = merchant.status === "approved";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-black text-primary-600">HK Family Fun 商戶管理中心</div>
              <h1 className="mt-2 text-3xl font-black text-slate-950">
                {merchant.business_name || "未命名商戶"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {merchant.contact_name || "未設定聯絡人"}・{merchant.contact_email || "未設定 Email"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadDashboard(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                重新整理
              </button>

              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                登出
              </button>
            </div>
          </div>
        </section>

        <section
          className={`rounded-[2rem] border p-5 shadow-sm ${
            merchantApproved
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <div className="flex gap-3">
            {merchantApproved ? <CheckCircle2 className="mt-0.5 h-5 w-5" /> : <AlertCircle className="mt-0.5 h-5 w-5" />}
            <div>
              <div className="font-black">{getMerchantStatusLabel(merchant.status)}</div>
              <p className="mt-1 text-sm leading-6">
                {merchantApproved
                  ? "你可以匯入活動資料、建立草稿、預覽活動卡、補充資料，然後提交 HK Family Fun 審批。"
                  : "帳戶仍在審批中。你仍可以準備活動草稿，但正式發布前需要 HK Family Fun 批核。"}
              </p>

              {merchant.rejection_reason ? (
                <p className="mt-2 rounded-2xl bg-white/70 p-3 text-sm">
                  待修改原因：{merchant.rejection_reason}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {errorMessage ? (
          <section className="flex gap-2 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </section>
        ) : null}

        {successMessage ? (
          <section className="flex gap-2 rounded-3xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard title="草稿" value={counts.draft} note="尚未提交的活動" />
          <StatCard title="審批中" value={counts.submitted} note="已提交等待審批" />
          <StatCard title="待修改" value={counts.rejected} note="被退回需要補資料" />
          <StatCard title="已發布" value={counts.published} note="公開中的活動" />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.value === "all"
                  ? counts.all
                  : tab.value === "draft"
                  ? counts.draft
                  : tab.value === "submitted"
                  ? counts.submitted
                  : tab.value === "rejected"
                  ? counts.rejected
                  : tab.value === "published"
                  ? counts.published
                  : counts.archived;

              const active = activeTab === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                    active
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">活動管理</h2>
              <p className="mt-1 text-sm text-slate-500">
                每個活動都可以 預覽、編輯、提交、複製 或 封存。
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/merchant/events/import")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-black text-white hover:bg-primary-600"
            >
              <Plus className="h-4 w-4" />
              匯入活動資料
            </button>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <div className="text-lg font-black text-slate-950">暫時沒有活動</div>
              <p className="mt-2 text-sm text-slate-500">
                可先貼上活動網址，建立活動草稿，再補充資料提交審批。
              </p>
              <button
                type="button"
                onClick={() => router.push("/merchant/events/import")}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-black text-white hover:bg-primary-600"
              >
                <Plus className="h-4 w-4" />
                建立第一個活動
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <div className="hidden grid-cols-[1fr_130px_130px_250px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black text-slate-500 lg:grid">
                <div>活動</div>
                <div>狀態 / 來源</div>
                <div>最後更新</div>
                <div className="text-right">操作</div>
              </div>

              <div className="divide-y divide-slate-200">
                {filteredEvents.map((event) => {
                  const working = workingEventId === event.id;
                  const archived = isActionDisabled(event.status);
                  const published = event.status === "published";
                  const can提交 = event.status === "draft" || event.status === "rejected";

                  return (
                    <div key={event.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_130px_130px_250px] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black leading-snug text-slate-950">
                            {getSafeTitle(event)}
                          </h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${getStatusClass(event.status)}`}>
                            {getStatusLabel(event.status)}
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                          {getSafeDescription(event)}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>ID: {getShortId(event.id)}</span>
                          {event.start_date ? <span>{formatDate(event.start_date)}</span> : null}
                          {event.district ? <span>{event.district}</span> : null}
                          {event.mtr_station ? <span>{event.mtr_station}</span> : null}
                        </div>
                      </div>

                      <div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${getStatusClass(event.status)}`}>
                          {getStatusLabel(event.status)}
                        </span>
                        <div className="mt-2 text-xs text-slate-500">
                          來源：{event.source_type || "manual"}
                        </div>
                      </div>

                      <div className="text-sm text-slate-600">
                        {formatDate(event.updated_at || event.created_at)}
                      </div>

                      <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                        <ActionButton
                          label="預覽"
                          icon={<Eye className="h-3.5 w-3.5" />}
                          onClick={() => router.push(`/merchant/events/${event.id}/preview`)}
                        />

                        {!archived ? (
                          <ActionButton
                            label="編輯"
                            icon={<編輯3 className="h-3.5 w-3.5" />}
                            onClick={() => router.push(`/merchant/events/${event.id}/edit`)}
                          />
                        ) : null}

                        {can提交 ? (
                          <ActionButton
                            label={event.status === "rejected" ? "重新提交" : "提交"}
                            icon={working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            onClick={() => submitEvent(event.id)}
                            disabled={working}
                            primary
                          />
                        ) : null}

                        {published ? (
                          <ActionButton
                            label="查看公開頁"
                            icon={<ExternalLink className="h-3.5 w-3.5" />}
                            onClick={() => router.push(`/events/${event.id}`)}
                          />
                        ) : null}

                        <ActionButton
                          label="複製"
                          icon={working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                          onClick={() => duplicateEvent(event.id)}
                          disabled={working}
                        />

                        {archived ? (
                          <ActionButton
                            label="還原"
                            icon={working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                            onClick={() => restore封存dEvent(event.id)}
                            disabled={working}
                          />
                        ) : (
                          <ActionButton
                            label="封存"
                            icon={working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <封存 className="h-3.5 w-3.5" />}
                            onClick={() => archiveEvent(event.id)}
                            disabled={working}
                            danger
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">建議商戶流程</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            1. 匯入活動資料 → 2. 編輯 補齊資料及圖片 → 3. 預覽 檢查 → 4. 提交 / 重新提交 → 5. HK Family Fun 審批及發布。
          </p>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  note,
}: {
  title: string;
  value: number;
  note: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-bold text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{note}</div>
    </section>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  primary,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
        primary
          ? "border-primary-500 bg-primary-500 text-white hover:bg-primary-600"
          : danger
          ? "border-red-300 bg-white text-red-600 hover:bg-red-50"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}