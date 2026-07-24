"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  LogOut,
  Plus,
  RefreshCw,
  Send,
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
  is_sen_friendly: boolean | null;
  is_indoor: boolean | null;
  source_type: string | null;
  source_url: string | null;
  source_file_url: string | null;
  ai_extraction_status: string | null;
  ai_extracted_json: Record<string, unknown> | null;
  status: string | null;
  admin_review_note: string | null;
  submitted_at: string | null;
  published_at: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type StatusFilter =
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
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getMerchantStatusLabel(status: string | null) {
  switch (status) {
    case "approved":
      return "商戶帳戶已通過";
    case "pending":
      return "商戶帳戶審批中";
    case "rejected":
      return "商戶帳戶未通過";
    default:
      return "商戶帳戶狀態待確認";
  }
}

function getMerchantStatusClass(status: string | null) {
  switch (status) {
    case "approved":
      return "border-green-200 bg-green-50 text-green-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "pending":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function formatDate(value: string | null) {
  if (!value) return "未有日期";

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

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function getMissingItems(event: MerchantEvent) {
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

function canSubmitEvent(event: MerchantEvent) {
  const status = event.status || "draft";

  if (status !== "draft" && status !== "rejected") {
    return false;
  }

  return getMissingItems(event).length === 0;
}

function shouldShowInActiveFilter(event: MerchantEvent) {
  return event.status !== "archived";
}

function filterEvents(events: MerchantEvent[], filter: StatusFilter) {
  if (filter === "all") return events;
  if (filter === "active") return events.filter(shouldShowInActiveFilter);

  return events.filter((event) => event.status === filter);
}

function countByStatus(events: MerchantEvent[], status: string) {
  return events.filter((event) => event.status === status).length;
}

export default function MerchantDashboardPage() {
  const router = useRouter();

  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [events, setEvents] = useState<MerchantEvent[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("active");

  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const filteredEvents = useMemo(() => {
    return filterEvents(events, filter);
  }, [events, filter]);

  const draftCount = countByStatus(events, "draft");
  const submittedCount = countByStatus(events, "submitted");
  const rejectedCount = countByStatus(events, "rejected");
  const publishedCount = countByStatus(events, "published");
  const archivedCount = countByStatus(events, "archived");
  const activeCount = events.filter(shouldShowInActiveFilter).length;

  async function loadDashboard() {
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
            "is_sen_friendly",
            "is_indoor",
            "source_type",
            "source_url",
            "source_file_url",
            "ai_extraction_status",
            "ai_extracted_json",
            "status",
            "admin_review_note",
            "submitted_at",
            "published_at",
            "updated_at",
            "created_at",
          ].join(", ")
        )
        .eq("merchant_id", loadedMerchant.id)
        .order("updated_at", { ascending: false, nullsFirst: false })
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
          : "載入 Merchant Dashboard 時發生未知錯誤。"
      );
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    if (!supabase) return;

    await supabase.auth.signOut();
    router.replace("/merchant/login");
  }

  async function submitEvent(event: MerchantEvent) {
    setErrorMessage("");
    setSuccessMessage("");

    const missingItems = getMissingItems(event);

    if (missingItems.length > 0) {
      setErrorMessage(
        `「${event.title_tc || "未命名活動"}」未能提交。請先補充：${missingItems.join(
          "、"
        )}`
      );
      return;
    }

    try {
      if (!supabase) {
        setErrorMessage("Supabase client 未能初始化。");
        return;
      }

      setIsWorking(true);

      const now = new Date().toISOString();

      const { error } = await supabase
        .from("events")
        .update({
          status: "submitted",
          submitted_at: now,
          merchant_confirmed_at: now,
          admin_review_note: null,
          updated_at: now,
        })
        .eq("id", event.id)
        .eq("merchant_id", event.merchant_id);

      if (error) {
        setErrorMessage(error.message);
        setIsWorking(false);
        return;
      }

      setSuccessMessage(`「${event.title_tc || "未命名活動"}」已提交審批。`);
      await loadDashboard();
      setIsWorking(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "提交活動時發生未知錯誤。"
      );
      setIsWorking(false);
    }
  }

  async function archiveEvent(event: MerchantEvent) {
    const confirmed = window.confirm(
      `確定要封存「${event.title_tc || "未命名活動"}」？封存後不會公開顯示。`
    );

    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!supabase) {
        setErrorMessage("Supabase client 未能初始化。");
        return;
      }

      setIsWorking(true);

      const { error } = await supabase
        .from("events")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.id)
        .eq("merchant_id", event.merchant_id);

      if (error) {
        setErrorMessage(error.message);
        setIsWorking(false);
        return;
      }

      setSuccessMessage(`「${event.title_tc || "未命名活動"}」已封存。`);
      await loadDashboard();
      setIsWorking(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "封存活動時發生未知錯誤。"
      );
      setIsWorking(false);
    }
  }

  async function duplicateEvent(event: MerchantEvent) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!supabase) {
        setErrorMessage("Supabase client 未能初始化。");
        return;
      }

      setIsWorking(true);

      const now = new Date().toISOString();

      const { error } = await supabase.from("events").insert({
        merchant_id: event.merchant_id,
        title_tc: `${event.title_tc || "未命名活動"} Copy`,
        short_description_tc: event.short_description_tc,
        description_tc: event.description_tc,
        organizer_name: event.organizer_name,
        venue_name: event.venue_name,
        address: event.address,
        district: event.district,
        mtr_station: event.mtr_station,
        start_date: event.start_date,
        end_date: event.end_date,
        start_time: event.start_time,
        end_time: event.end_time,
        price_type: event.price_type,
        price_min: event.price_min,
        price_max: event.price_max,
        category: event.category,
        tags: event.tags,
        cover_image_url: event.cover_image_url,
        cover_image_position: event.cover_image_position || "custom",
        cover_image_focus_x: event.cover_image_focus_x ?? 50,
        cover_image_focus_y: event.cover_image_focus_y ?? 50,
        registration_required: event.registration_required,
        registration_url: event.registration_url,
        is_sen_friendly: event.is_sen_friendly,
        is_indoor: event.is_indoor,
        source_type: "manual",
        source_url: event.source_url,
        source_file_url: event.source_file_url,
        ai_extraction_status: event.ai_extraction_status,
        ai_extracted_json: event.ai_extracted_json,
        status: "draft",
        admin_review_note: null,
        submitted_at: null,
        published_at: null,
        created_at: now,
        updated_at: now,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsWorking(false);
        return;
      }

      setSuccessMessage(`已複製「${event.title_tc || "未命名活動"}」為新草稿。`);
      setFilter("draft");
      await loadDashboard();
      setIsWorking(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "複製活動時發生未知錯誤。"
      );
      setIsWorking(false);
    }
  }

  function goPreview(event: MerchantEvent) {
    router.push(`/merchant/events/${event.id}/preview`);
  }

  function goEdit(event: MerchantEvent) {
    router.push(`/merchant/events/${event.id}/edit`);
  }

  function goPublic(event: MerchantEvent) {
    router.push(`/events/${event.id}`);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">正在載入 Merchant Dashboard...</p>
        </div>
      </main>
    );
  }

  if (!merchant) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-xl font-bold text-red-900">找不到商戶帳戶</h1>
          <p className="mt-2 text-sm text-red-700">
            請重新登入，或先完成商戶免費登記。
          </p>
        </div>
      </main>
    );
  }

  const isMerchantApproved = merchant.status === "approved";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
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
                {merchant.contact_name || "未有聯絡人"}・
                {merchant.contact_email || "未有電郵"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadDashboard}
                disabled={isWorking}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                登出
              </button>
            </div>
          </div>
        </section>

        <section
          className={`rounded-3xl border p-5 text-sm ${getMerchantStatusClass(
            merchant.status
          )}`}
        >
          <div className="font-bold">{getMerchantStatusLabel(merchant.status)}</div>

          <p className="mt-1 leading-6">
            {merchant.status === "approved"
              ? "你可以匯入活動資料、建立草稿、預覽活動卡、補充資料，然後提交給 HK Family Fun 審批。"
              : merchant.status === "rejected"
                ? merchant.rejection_reason || "你的商戶帳戶暫未通過，請聯絡 HK Family Fun。"
                : "你的商戶帳戶仍在審批中。現階段可先準備活動資料，通過後再提交活動。"}
          </p>
        </section>

        {successMessage ? (
          <section className="rounded-3xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
            {successMessage}
          </section>
        ) : null}

        {errorMessage ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {errorMessage}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard title="草稿" value={draftCount} note="尚未提交的活動" />
          <StatCard title="審批中" value={submittedCount} note="已提交平台審核" />
          <StatCard title="待修改" value={rejectedCount} note="被退回或需要補資料" />
          <StatCard title="已發布" value={publishedCount} note="公開中的活動" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={filter === "active"}
              onClick={() => setFilter("active")}
              label={`常用 (${activeCount})`}
            />
            <FilterButton
              active={filter === "draft"}
              onClick={() => setFilter("draft")}
              label={`草稿 (${draftCount})`}
            />
            <FilterButton
              active={filter === "submitted"}
              onClick={() => setFilter("submitted")}
              label={`審批中 (${submittedCount})`}
            />
            <FilterButton
              active={filter === "rejected"}
              onClick={() => setFilter("rejected")}
              label={`待修改 (${rejectedCount})`}
            />
            <FilterButton
              active={filter === "published"}
              onClick={() => setFilter("published")}
              label={`已發布 (${publishedCount})`}
            />
            <FilterButton
              active={filter === "archived"}
              onClick={() => setFilter("archived")}
              label={`已封存 (${archivedCount})`}
            />
            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label={`全部 (${events.length})`}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">活動管理</h2>
              <p className="mt-1 text-sm text-slate-600">
                每個活動可 Preview、Edit、Submit、Duplicate 或 Archive。
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/merchant/events/import")}
              disabled={!isMerchantApproved}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-bold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Plus className="h-4 w-4" />
              匯入活動資料
            </button>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <h3 className="text-lg font-bold text-slate-950">
                暫時沒有活動
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                請先匯入活動 URL、圖片或 PDF，建立活動草稿。
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <div className="hidden grid-cols-[1.4fr_0.8fr_0.7fr_1.4fr] gap-4 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500 md:grid">
                <div>活動</div>
                <div>狀態 / 來源</div>
                <div>最後更新</div>
                <div className="text-right">操作</div>
              </div>

              <div className="divide-y divide-slate-200">
                {filteredEvents.map((event) => {
                  const missingItems = getMissingItems(event);
                  const status = event.status || "draft";
                  const canEdit = status === "draft" || status === "rejected";
                  const canSubmit = canSubmitEvent(event);
                  const canArchive = status !== "archived";
                  const canViewPublic = status === "published";

                  return (
                    <article
                      key={event.id}
                      className="grid gap-4 px-5 py-5 md:grid-cols-[1.4fr_0.8fr_0.7fr_1.4fr] md:items-start"
                    >
                      <div>
                        <h3 className="font-bold leading-6 text-slate-950">
                          {event.title_tc || "未命名活動"}
                        </h3>

                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                          {event.short_description_tc || "未有活動簡介。"}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          ID: {event.id.slice(0, 8)}...
                        </p>

                        {status === "rejected" && event.admin_review_note ? (
                          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                            退回原因：{event.admin_review_note}
                          </div>
                        ) : null}

                        {(status === "draft" || status === "rejected") &&
                        missingItems.length > 0 ? (
                          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                            未能提交：請補充 {missingItems.join("、")}
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                            event.status
                          )}`}
                        >
                          {getStatusLabel(event.status)}
                        </span>

                        <div className="text-xs text-slate-500">
                          來源：{event.source_type || "manual"}
                        </div>
                      </div>

                      <div className="text-sm text-slate-600">
                        {formatDate(event.updated_at || event.created_at)}
                      </div>

                      <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                        <ActionButton
                          label="Preview"
                          icon={<Eye className="h-4 w-4" />}
                          onClick={() => goPreview(event)}
                        />

                        {canEdit ? (
                          <ActionButton
                            label="Edit"
                            icon={<Edit3 className="h-4 w-4" />}
                            onClick={() => goEdit(event)}
                          />
                        ) : null}

                        {canSubmit ? (
                          <ActionButton
                            label={status === "rejected" ? "Resubmit" : "Submit"}
                            icon={<Send className="h-4 w-4" />}
                            onClick={() => submitEvent(event)}
                            primary
                            disabled={isWorking}
                          />
                        ) : null}

                        {canViewPublic ? (
                          <ActionButton
                            label="View Public"
                            icon={<ExternalLink className="h-4 w-4" />}
                            onClick={() => goPublic(event)}
                          />
                        ) : null}

                        <ActionButton
                          label="Duplicate"
                          icon={<Copy className="h-4 w-4" />}
                          onClick={() => duplicateEvent(event)}
                          disabled={isWorking}
                        />

                        {canArchive ? (
                          <ActionButton
                            label="Archive"
                            icon={<Archive className="h-4 w-4" />}
                            onClick={() => archiveEvent(event)}
                            danger
                            disabled={isWorking}
                          />
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-950">建議商戶流程</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            1. 匯入活動資料 → 2. Edit 補資料及圖片 → 3. Preview 檢查 → 4. Submit / Resubmit →
            5. HK Family Fun 審批發布。
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-bold text-slate-600">{title}</div>
      <div className="mt-3 text-3xl font-bold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{note}</div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
        active
          ? "bg-primary-500 text-white"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  primary = false,
  danger = false,
  disabled = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  let className =
    "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

  if (primary) {
    className +=
      " border-primary-500 bg-primary-500 text-white hover:bg-primary-600";
  } else if (danger) {
    className += " border-red-200 bg-white text-red-600 hover:bg-red-50";
  } else {
    className +=
      " border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {icon}
      {label}
    </button>
  );
}