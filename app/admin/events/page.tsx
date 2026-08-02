"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type FilterKey =
  | "all"
  | "review"
  | "pending"
  | "draft"
  | "published"
  | "rejected"
  | "archived";

type EventRecord = {
  id: string;
  merchant_id?: string | null;
  title_tc?: string | null;
  title?: string | null;
  short_description_tc?: string | null;
  description_tc?: string | null;
  highlights?: string | null;
  terms?: string | null;
  remarks?: string | null;
  category?: string | null;
  activity_category?: string | null;
  venue_name?: string | null;
  address?: string | null;
  district?: string | null;
  area?: string | null;
  mtr_station?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  cover_image_url?: string | null;
  gallery_image_urls?: unknown;
  price?: string | number | null;
  fee?: string | number | null;
  min_price?: string | number | null;
  max_price?: string | number | null;
  original_price?: string | number | null;
  offer_price?: string | number | null;
  price_display_mode?: string | null;
  price_label?: string | null;
  quota_label?: string | null;
  registration_url?: string | null;
  booking_url?: string | null;
  source_url?: string | null;
  official_url?: string | null;
  cta_type?: string | null;
  cta_label?: string | null;
  booking_method?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  whatsapp?: string | null;
  organizer_name?: string | null;
  merchant_name?: string | null;
  google_map_url?: string | null;
  google_map_embed_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const FILTERS: { key: FilterKey; label: string; helper: string }[] = [
  { key: "all", label: "全部", helper: "所有活動" },
  { key: "review", label: "待審批", helper: "商戶已提交" },
  { key: "pending", label: "待處理", helper: "資料需跟進" },
  { key: "draft", label: "草稿", helper: "未提交" },
  { key: "published", label: "已發布", helper: "公開顯示" },
  { key: "rejected", label: "已拒絕", helper: "不公開" },
  { key: "archived", label: "已封存", helper: "已下架" },
];

function safeText(value: unknown, fallback = "未填寫") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function hasValue(value: unknown) {
  return safeText(value, "") !== "";
}

function titleOf(event: EventRecord) {
  return safeText(event.title_tc || event.title, "未命名活動");
}

function categoryOf(event: EventRecord) {
  return safeText(event.activity_category || event.category, "未分類");
}

function normalStatus(status?: string | null) {
  return safeText(status, "").toLowerCase();
}

function statusGroup(status?: string | null): FilterKey {
  const s = normalStatus(status);

  if (["submitted", "review", "pending_review"].includes(s)) return "review";
  if (["pending", "need_review", "needs_review"].includes(s)) return "pending";
  if (["published", "approved", "online", "live"].includes(s)) {
    return "published";
  }
  if (["rejected", "declined"].includes(s)) return "rejected";
  if (["archived", "archive", "hidden", "offline"].includes(s)) {
    return "archived";
  }

  return "draft";
}

function statusLabel(status?: string | null) {
  const group = statusGroup(status);

  if (group === "review") return "待審批";
  if (group === "pending") return "待處理";
  if (group === "published") return "已發布";
  if (group === "rejected") return "已拒絕";
  if (group === "archived") return "已封存";
  return "草稿";
}

function statusBadgeClass(status?: string | null) {
  const group = statusGroup(status);

  if (group === "review") return "border-amber-200 bg-amber-50 text-amber-800";
  if (group === "pending") return "border-orange-200 bg-orange-50 text-orange-800";
  if (group === "published") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (group === "rejected") return "border-rose-200 bg-rose-50 text-rose-800";
  if (group === "archived") return "border-slate-200 bg-slate-100 text-slate-600";

  return "border-purple-200 bg-purple-50 text-purple-800";
}

function dateOf(event: EventRecord) {
  const start = safeText(event.start_date, "");
  const end = safeText(event.end_date, "");

  if (start && end && start !== end) return `${start} 至 ${end}`;
  if (start) return start;
  if (end) return end;
  return "日期未填";
}

function timeOf(event: EventRecord) {
  const start = safeText(event.start_time, "");
  const end = safeText(event.end_time, "");

  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;
  return "時間待確認";
}

function locationOf(event: EventRecord) {
  const parts = [event.venue_name, event.district, event.mtr_station]
    .map((item) => safeText(item, ""))
    .filter(Boolean);

  return parts.length ? parts.join("・") : "地點未填";
}

function merchantOf(event: EventRecord) {
  return safeText(event.organizer_name || event.merchant_name, "未填商戶");
}

function getGalleryArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function imageCount(event: EventRecord) {
  return (event.cover_image_url ? 1 : 0) + getGalleryArray(event.gallery_image_urls).length;
}

function numberText(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("zh-HK");
}

function priceOf(event: EventRecord) {
  const mode = safeText(event.price_display_mode, "").toLowerCase();
  const label = safeText(event.price_label, "");
  const quota = safeText(event.quota_label, "");

  if (mode.includes("quota") || mode.includes("name")) {
    return quota || label || "只顯示名額";
  }

  if (mode.includes("hidden")) return "不顯示價錢";
  if (mode.includes("free")) return "免費";

  const offer = numberText(event.offer_price);
  const original = numberText(event.original_price);
  const min = numberText(event.min_price);
  const max = numberText(event.max_price);
  const fixed = numberText(event.price || event.fee);

  if (label) return label;
  if (offer && original) return `優惠 HK$${offer}（原價 HK$${original}）`;
  if (offer) return `優惠 HK$${offer}`;
  if (min && max && min !== max) return `HK$${min}–HK$${max}`;
  if (min && max && min === max) return `HK$${min}`;
  if (min) return `HK$${min} 起`;
  if (fixed) return `HK$${fixed}`;

  return "收費未填";
}

function ctaOf(event: EventRecord) {
  const label = safeText(event.cta_label, "");
  const type = safeText(event.cta_type || event.booking_method, "").toLowerCase();

  if (label) return label;
  if (type.includes("whatsapp")) return "WhatsApp 報名";
  if (type.includes("google")) return "Google Form 報名";
  if (type.includes("external")) return "外部連結報名";
  if (type.includes("official")) return "查看官方活動頁";
  if (type.includes("none")) return "無需報名";

  if (
    hasValue(event.registration_url) ||
    hasValue(event.booking_url) ||
    hasValue(event.official_url) ||
    hasValue(event.source_url)
  ) {
    return "可點擊";
  }

  return "CTA 未設定";
}

function shortDescription(event: EventRecord) {
  return safeText(
    event.short_description_tc || event.description_tc,
    "系統已收到此活動資料，請在 Preview 或編輯頁檢查日期、地點、收費及 CTA。"
  );
}

function readyScore(event: EventRecord) {
  const checks = [
    hasValue(event.title_tc || event.title),
    hasValue(event.start_date),
    hasValue(event.venue_name) || hasValue(event.address),
    priceOf(event) !== "收費未填",
    ctaOf(event) !== "CTA 未設定",
    imageCount(event) > 0,
    hasValue(event.google_map_url) || hasValue(event.google_map_embed_url),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function missingItems(event: EventRecord) {
  const items: string[] = [];

  if (!hasValue(event.title_tc || event.title)) items.push("活動名稱");
  if (!hasValue(event.start_date)) items.push("日期");
  if (!hasValue(event.venue_name) && !hasValue(event.address)) items.push("地點");
  if (priceOf(event) === "收費未填") items.push("收費");
  if (ctaOf(event) === "CTA 未設定") items.push("CTA");
  if (imageCount(event) === 0) items.push("圖片");
  if (!hasValue(event.google_map_url) && !hasValue(event.google_map_embed_url)) {
    items.push("Google Map");
  }

  return items;
}

function csvEscape(value: unknown) {
  const text = safeText(value, "");
  return `"${text.replace(/"/g, '""')}"`;
}

function todayFileName(prefix: string, ext: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}-${date}.${ext}`;
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildCsv(events: EventRecord[]) {
  const header = [
    "id",
    "status",
    "title",
    "merchant",
    "category",
    "date",
    "time",
    "location",
    "price",
    "cta",
    "image_count",
    "ready_score",
    "missing_items",
    "updated_at",
  ];

  const rows = events.map((event) => [
    event.id,
    statusLabel(event.status),
    titleOf(event),
    merchantOf(event),
    categoryOf(event),
    dateOf(event),
    timeOf(event),
    locationOf(event),
    priceOf(event),
    ctaOf(event),
    imageCount(event),
    readyScore(event),
    missingItems(event).join("、"),
    safeText(event.updated_at, ""),
  ]);

  return [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function canPublish(event: EventRecord) {
  return readyScore(event) >= 60;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);

  async function loadEvents() {
    const client = supabase;

    setLoading(true);
    setMessage("");

    if (!client) {
      setEvents([]);
      setMessage("Supabase client 未能初始化，請檢查 .env.local。");
      setLoading(false);
      return;
    }

    const { data, error } = await client
      .from("events")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      setEvents([]);
      setMessage(`讀取活動失敗：${error.message}`);
      setLoading(false);
      return;
    }

    const nextEvents = (data || []) as EventRecord[];
    setEvents(nextEvents);

    setSelectedId((current) => {
      if (current && nextEvents.some((event) => event.id === current)) {
        return current;
      }
      return nextEvents[0]?.id || null;
    });

    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const counts = useMemo(() => {
    const next: Record<FilterKey, number> = {
      all: events.length,
      review: 0,
      pending: 0,
      draft: 0,
      published: 0,
      rejected: 0,
      archived: 0,
    };

    events.forEach((event) => {
      next[statusGroup(event.status)] += 1;
    });

    return next;
  }, [events]);

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return events.filter((event) => {
      const group = statusGroup(event.status);
      const matchesFilter = activeFilter === "all" ? true : group === activeFilter;

      const matchesKeyword = keyword
        ? [
            titleOf(event),
            merchantOf(event),
            categoryOf(event),
            dateOf(event),
            timeOf(event),
            locationOf(event),
            priceOf(event),
            ctaOf(event),
            statusLabel(event.status),
            missingItems(event).join(" "),
          ]
            .join(" ")
            .toLowerCase()
            .includes(keyword)
        : true;

      return matchesFilter && matchesKeyword;
    });
  }, [events, search, activeFilter]);

  const selectedEvent = useMemo(() => {
    if (!selectedId) return filteredEvents[0] || events[0] || null;
    return events.find((event) => event.id === selectedId) || filteredEvents[0] || events[0] || null;
  }, [events, filteredEvents, selectedId]);

  const analytics = useMemo(() => {
    const total = events.length || 1;
    const withCta = events.filter((event) => ctaOf(event) !== "CTA 未設定").length;
    const withMap = events.filter(
      (event) => hasValue(event.google_map_url) || hasValue(event.google_map_embed_url)
    ).length;
    const withImage = events.filter((event) => imageCount(event) > 0).length;
    const withPrice = events.filter((event) => priceOf(event) !== "收費未填").length;
    const quality80 = events.filter((event) => readyScore(event) >= 80).length;

    const merchantMap = new Map<string, number>();
    events.forEach((event) => {
      const merchant = merchantOf(event);
      merchantMap.set(merchant, (merchantMap.get(merchant) || 0) + 1);
    });

    const byMerchant = Array.from(merchantMap.entries())
      .map(([merchant, count]) => ({ merchant, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      ctaRate: `${Math.round((withCta / total) * 100)}%`,
      mapRate: `${Math.round((withMap / total) * 100)}%`,
      imageRate: `${Math.round((withImage / total) * 100)}%`,
      priceRate: `${Math.round((withPrice / total) * 100)}%`,
      qualityRate: `${Math.round((quality80 / total) * 100)}%`,
      byMerchant,
    };
  }, [events]);

  async function updateStatus(id: string, nextStatus: string) {
    const client = supabase;

    if (!client) {
      setMessage("Supabase client 未能初始化，暫時不能更新活動狀態。");
      return;
    }

    const originalEvents = events;
    const now = new Date().toISOString();

    setBusyId(id);
    setMessage("");

    setEvents((previous) =>
      previous.map((event) =>
        event.id === id ? { ...event, status: nextStatus, updated_at: now } : event
      )
    );

    setSelectedId(id);
    setActiveFilter(statusGroup(nextStatus));

    const { error } = await client
      .from("events")
      .update({
        status: nextStatus,
        updated_at: now,
      })
      .eq("id", id);

    if (error) {
      setEvents(originalEvents);
      setMessage(`狀態更新失敗：${error.message}`);
    } else {
      setMessage(`活動已更新為「${statusLabel(nextStatus)}」。`);
      await loadEvents();
      setSelectedId(id);
    }

    setBusyId(null);
  }

  function exportFilteredCsv() {
    downloadTextFile(
      todayFileName("hk-family-fun-admin-events", "csv"),
      buildCsv(filteredEvents),
      "text/csv;charset=utf-8"
    );
  }

  function exportAllJson() {
    downloadTextFile(
      todayFileName("hk-family-fun-admin-events", "json"),
      JSON.stringify(events, null, 2),
      "application/json;charset=utf-8"
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1560px] px-4 py-16">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-50 text-3xl">
              親
            </div>
            <p className="font-black text-slate-700">正在讀取 Admin 活動資料...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1560px] px-4 py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-black text-purple-700">
                Admin Portal · 活動審批中心
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                活動審批、發布及數據管理
              </h1>
              <p className="mt-3 max-w-5xl text-sm leading-6 text-slate-600">
                左邊快速篩選活動，右邊固定審批面板。審批通過後活動會變成 published，
                公開頁才會顯示給家長。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowAnalytics((value) => !value)}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                {showAnalytics ? "收起分析" : "查看分析"}
              </button>
              <button
                type="button"
                onClick={loadEvents}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                重新整理
              </button>
              <Link
                href="/merchant/events/import"
                className="rounded-full bg-purple-700 px-5 py-2 text-sm font-bold text-white hover:bg-purple-800"
              >
                建立測試活動
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={[
                  "rounded-3xl border p-4 text-left transition",
                  activeFilter === filter.key
                    ? "border-purple-600 bg-purple-50 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:bg-white",
                ].join(" ")}
              >
                <p className="text-xs font-black text-slate-500">{filter.label}</p>
                <p className="mt-1 text-3xl font-black text-slate-950">
                  {counts[filter.key]}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  {filter.helper}
                </p>
              </button>
            ))}
          </div>

          {showAnalytics ? (
            <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_420px]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">
                      可視化數據總覽
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      MVP analytics：用資料完整度及審批狀態即時判斷活動質素。
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={exportFilteredCsv}
                      className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                    >
                      下載目前列表
                    </button>
                    <button
                      type="button"
                      onClick={exportAllJson}
                      className="rounded-full bg-purple-700 px-4 py-2 text-xs font-black text-white hover:bg-purple-800"
                    >
                      下載 JSON
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <MetricCard label="CTA 完成" value={analytics.ctaRate} />
                  <MetricCard label="地圖完成" value={analytics.mapRate} />
                  <MetricCard label="圖片完成" value={analytics.imageRate} />
                  <MetricCard label="收費完成" value={analytics.priceRate} />
                  <MetricCard label="80分以上" value={analytics.qualityRate} />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-black text-slate-950">
                  商戶活動數 Top List
                </h2>
                <div className="mt-4 space-y-3">
                  {analytics.byMerchant.length ? (
                    analytics.byMerchant.map((item) => (
                      <BarRow
                        key={item.merchant}
                        label={item.merchant}
                        value={item.count}
                        max={Math.max(...analytics.byMerchant.map((row) => row.count), 1)}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">暫時沒有商戶數據。</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1560px] gap-6 px-4 py-6 xl:grid-cols-[1fr_470px]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜尋活動名稱、商戶、地區、收費、CTA..."
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 xl:max-w-xl"
              />

              <div className="flex flex-wrap gap-2">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={[
                      "rounded-full border px-4 py-2 text-xs font-bold transition",
                      activeFilter === filter.key
                        ? "border-purple-700 bg-purple-700 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {filter.label}
                    <span className="ml-1 opacity-80">{counts[filter.key]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {message ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {message}
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-black text-slate-950">
                活動列表
                <span className="ml-2 text-sm font-semibold text-slate-500">
                  {filteredEvents.length} / {events.length}
                </span>
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                點選活動卡片後，右側會即時顯示審批面板。按鈕不會再只有數字變動而沒有 preview。
              </p>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-50 text-2xl">
                  🔎
                </div>
                <h3 className="mt-4 text-xl font-black text-slate-950">
                  暫時沒有符合條件的活動
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  可切換狀態、清除搜尋字，或按重新整理。
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredEvents.map((event) => (
                  <AdminEventCard
                    key={event.id}
                    event={event}
                    selected={selectedEvent?.id === event.id}
                    busy={busyId === event.id}
                    onSelect={() => setSelectedId(event.id)}
                    onPublish={() => updateStatus(event.id, "published")}
                    onReject={() => updateStatus(event.id, "rejected")}
                    onArchive={() => updateStatus(event.id, "archived")}
                    onDraft={() => updateStatus(event.id, "draft")}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          {selectedEvent ? (
            <ApprovalPanel
              event={selectedEvent}
              busy={busyId === selectedEvent.id}
              onPublish={() => updateStatus(selectedEvent.id, "published")}
              onReject={() => updateStatus(selectedEvent.id, "rejected")}
              onArchive={() => updateStatus(selectedEvent.id, "archived")}
              onDraft={() => updateStatus(selectedEvent.id, "draft")}
            />
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-2xl">
                ✅
              </div>
              <h2 className="mt-4 text-xl font-black text-slate-950">
                選擇一個活動審批
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                左邊點選活動後，這裡會顯示完整審批摘要、Preview、公開頁及操作。
              </p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function AdminEventCard({
  event,
  selected,
  busy,
  onSelect,
  onPublish,
  onReject,
  onArchive,
  onDraft,
}: {
  event: EventRecord;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onPublish: () => void;
  onReject: () => void;
  onArchive: () => void;
  onDraft: () => void;
}) {
  const score = readyScore(event);
  const missing = missingItems(event);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
          onSelect();
        }
      }}
      className={[
        "grid cursor-pointer gap-5 p-5 text-left transition hover:bg-slate-50 xl:grid-cols-[270px_1fr_230px]",
        selected ? "bg-purple-50/60 ring-2 ring-inset ring-purple-200" : "bg-white",
      ].join(" ")}
    >
      <EventImage event={event} />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={event.status} />
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            {score}分
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {imageCount(event)} 張圖
          </span>
        </div>

        <h3 className="mt-3 text-xl font-black leading-snug text-slate-950">
          {titleOf(event)}
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
          {shortDescription(event)}
        </p>

        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 2xl:grid-cols-4">
          <MiniInfo label="商戶" value={merchantOf(event)} />
          <MiniInfo label="日期" value={dateOf(event)} />
          <MiniInfo label="地點" value={locationOf(event)} />
          <MiniInfo label="收費" value={priceOf(event)} />
        </div>

        {missing.length ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">
            建議補充：{missing.join("、")}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800">
            資料完整，適合審批或公開。
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500">完整度</span>
            <span className="font-black text-slate-950">{score}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={[
                "h-full rounded-full",
                score >= 80
                  ? "bg-emerald-500"
                  : score >= 60
                  ? "bg-amber-500"
                  : "bg-rose-500",
              ].join(" ")}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/merchant/events/${event.id}/preview`}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-xs font-black text-slate-700 hover:bg-slate-50"
            onClick={(clickEvent) => clickEvent.stopPropagation()}
          >
            Preview
          </Link>
          <Link
            href={`/merchant/events/${event.id}/edit`}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-xs font-black text-slate-700 hover:bg-slate-50"
            onClick={(clickEvent) => clickEvent.stopPropagation()}
          >
            編輯
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy || !canPublish(event)}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              onPublish();
            }}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:bg-slate-300"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              onReject();
            }}
            className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              onArchive();
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Archive
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              onDraft();
            }}
            className="rounded-xl border border-purple-300 bg-purple-50 px-3 py-2 text-xs font-black text-purple-700 hover:bg-purple-100 disabled:opacity-50"
          >
            Draft
          </button>
        </div>
      </div>
    </div>
  );
}

function ApprovalPanel({
  event,
  busy,
  onPublish,
  onReject,
  onArchive,
  onDraft,
}: {
  event: EventRecord;
  busy: boolean;
  onPublish: () => void;
  onReject: () => void;
  onArchive: () => void;
  onDraft: () => void;
}) {
  const missing = missingItems(event);
  const score = readyScore(event);
  const publishDisabled = busy || !canPublish(event);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-purple-700">APPROVAL REVIEW</p>
            <h2 className="mt-1 text-2xl font-black leading-snug text-slate-950">
              {titleOf(event)}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Raw status：{safeText(event.status, "draft")}
            </p>
          </div>
          <StatusBadge status={event.status} />
        </div>

        <div className="mt-5">
          <EventImage event={event} large />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-slate-600">審批完整度</span>
            <span className="font-black text-slate-950">{score}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white">
            <div
              className={[
                "h-full rounded-full",
                score >= 80
                  ? "bg-emerald-500"
                  : score >= 60
                  ? "bg-amber-500"
                  : "bg-rose-500",
              ].join(" ")}
              style={{ width: `${score}%` }}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            60分以下不建議直接公開；最好先改回草稿，讓商戶補資料。
          </p>
        </div>

        <div className="mt-4 grid gap-2">
          <ReviewRow label="商戶" value={merchantOf(event)} />
          <ReviewRow label="日期" value={dateOf(event)} />
          <ReviewRow label="時間" value={timeOf(event)} />
          <ReviewRow label="地點" value={locationOf(event)} />
          <ReviewRow label="分類" value={categoryOf(event)} />
          <ReviewRow label="收費" value={priceOf(event)} />
          <ReviewRow label="CTA" value={ctaOf(event)} />
          <ReviewRow label="圖片" value={`${imageCount(event)} 張`} />
          <ReviewRow
            label="Google Map"
            value={
              hasValue(event.google_map_url) || hasValue(event.google_map_embed_url)
                ? "已準備"
                : "未填寫"
            }
          />
        </div>

        {missing.length ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            <p className="font-black">審批前建議處理</p>
            <ul className="mt-2 list-disc pl-5">
              {missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            主要資料已齊備，可考慮審批發布。
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            href={`/merchant/events/${event.id}/preview`}
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-center text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            Preview
          </Link>
          <Link
            href={`/merchant/events/${event.id}/edit`}
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-center text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            編輯
          </Link>
          <Link
            href={`/events/${event.id}`}
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3 text-center text-xs font-black text-emerald-700 hover:bg-emerald-100"
          >
            公開頁
          </Link>
          <button
            type="button"
            onClick={onDraft}
            disabled={busy}
            className="rounded-xl border border-purple-300 bg-purple-50 px-3 py-3 text-xs font-black text-purple-700 hover:bg-purple-100 disabled:opacity-50"
          >
            改回草稿
          </button>
        </div>

        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={onPublish}
            disabled={publishDisabled}
            className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-300"
          >
            審批通過並發布
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50"
          >
            拒絕活動
          </button>
          <button
            type="button"
            onClick={onArchive}
            disabled={busy}
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
          >
            封存活動
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
        <p className="font-black">審批 UX 規則</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>圖片要足夠清楚，不應太細或過度裁切。</li>
          <li>收費、優惠、名額和 quota 要分開顯示，不應混淆。</li>
          <li>CTA 要對應實際情況：官方網站、Google Form、WhatsApp 或無需報名。</li>
          <li>Google Map 必須有助家長找到地點。</li>
        </ul>
      </div>
    </div>
  );
}

function EventImage({ event, large = false }: { event: EventRecord; large?: boolean }) {
  return (
    <div
      className={[
        "overflow-hidden rounded-3xl border border-slate-200 bg-slate-50",
        large ? "h-80" : "h-44",
      ].join(" ")}
    >
      {event.cover_image_url ? (
        <div className="flex h-full w-full items-center justify-center p-2">
          <img
            src={event.cover_image_url}
            alt={titleOf(event)}
            className="max-h-full max-w-full rounded-2xl object-contain"
          />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 text-5xl">
          親
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-purple-600" style={{ width: value }} />
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const width = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="truncate font-bold text-slate-700">{label}</span>
        <span className="font-black text-slate-950">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-xs font-black",
        statusBadgeClass(status),
      ].join(" ")}
    >
      {statusLabel(status)}
    </span>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-slate-700">{value}</p>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
      <p className="font-black text-slate-500">{label}</p>
      <p className="font-bold text-slate-900">{value}</p>
    </div>
  );
}