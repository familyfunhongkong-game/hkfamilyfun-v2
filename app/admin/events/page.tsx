"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type EventRecord = {
  id: string;
  title_tc?: string | null;
  title?: string | null;
  short_description_tc?: string | null;
  description_tc?: string | null;
  merchant_id?: string | null;
  merchant_name?: string | null;
  organizer_name?: string | null;
  venue_name?: string | null;
  address?: string | null;
  area?: string | null;
  district?: string | null;
  mtr_station?: string | null;
  category?: string | null;
  activity_category?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  cover_image_url?: string | null;
  gallery_image_urls?: string[] | null;
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
  source_url?: string | null;
  official_url?: string | null;
  booking_url?: string | null;
  booking_method?: string | null;
  cta_type?: string | null;
  cta_label?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  whatsapp?: string | null;
  google_map_url?: string | null;
  google_map_embed_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FilterKey =
  | "all"
  | "review"
  | "draft"
  | "published"
  | "rejected"
  | "archived";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部活動" },
  { key: "review", label: "待審批" },
  { key: "draft", label: "草稿" },
  { key: "published", label: "已發布" },
  { key: "rejected", label: "已拒絕" },
  { key: "archived", label: "已封存" },
];

function safeText(value: unknown, fallback = "未填寫") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function hasValue(value: unknown) {
  return safeText(value, "") !== "";
}

function normalizedStatus(status?: string | null) {
  return safeText(status, "").toLowerCase();
}

function statusGroup(status?: string | null): FilterKey {
  const s = normalizedStatus(status);

  if (["submitted", "pending", "review", "pending_review"].includes(s)) {
    return "review";
  }

  if (["published", "approved", "online", "live"].includes(s)) {
    return "published";
  }

  if (["rejected", "declined"].includes(s)) {
    return "rejected";
  }

  if (["archived", "archive", "offline", "hidden"].includes(s)) {
    return "archived";
  }

  return "draft";
}

function statusLabel(status?: string | null) {
  const group = statusGroup(status);

  if (group === "review") return "待審批";
  if (group === "published") return "已發布";
  if (group === "rejected") return "已拒絕";
  if (group === "archived") return "已封存";
  return "草稿";
}

function statusBadgeClass(status?: string | null) {
  const group = statusGroup(status);

  if (group === "review") return "border-amber-200 bg-amber-50 text-amber-700";
  if (group === "published") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (group === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  if (group === "archived") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-purple-200 bg-purple-50 text-purple-700";
}

function titleOf(event: EventRecord) {
  return safeText(event.title_tc || event.title, "未命名活動");
}

function merchantOf(event: EventRecord) {
  return safeText(event.merchant_name || event.organizer_name || event.merchant_id, "未連接商戶");
}

function categoryOf(event: EventRecord) {
  return safeText(event.activity_category || event.category, "未分類");
}

function dateOf(event: EventRecord) {
  const start = safeText(event.start_date, "");
  const end = safeText(event.end_date, "");

  if (start && end && start !== end) return `${start} 至 ${end}`;
  if (start) return start;
  if (end) return end;
  return "日期未填";
}

function locationOf(event: EventRecord) {
  const parts = [event.venue_name, event.district, event.mtr_station]
    .map((item) => safeText(item, ""))
    .filter(Boolean);

  return parts.length ? parts.join("・") : "地點未填";
}

function imageCount(event: EventRecord) {
  const cover = event.cover_image_url ? 1 : 0;
  const gallery = Array.isArray(event.gallery_image_urls)
    ? event.gallery_image_urls.filter(Boolean).length
    : 0;

  return cover + gallery;
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
  if (min) return `HK$${min} 起`;
  if (fixed) return `HK$${fixed}`;

  return "收費未填";
}

function primaryActionUrl(event: EventRecord) {
  return (
    safeText(event.registration_url, "") ||
    safeText(event.booking_url, "") ||
    safeText(event.official_url, "") ||
    safeText(event.source_url, "") ||
    safeText(event.whatsapp, "") ||
    safeText(event.contact_phone, "") ||
    safeText(event.contact_email, "")
  );
}

function ctaOf(event: EventRecord) {
  const label = safeText(event.cta_label, "");
  const type = safeText(event.cta_type || event.booking_method, "").toLowerCase();
  const url = primaryActionUrl(event);

  if (label) return label;
  if (type.includes("whatsapp")) return "WhatsApp 報名";
  if (type.includes("google")) return "Google Form 報名";
  if (type.includes("external")) return "外部連結報名";
  if (type.includes("official")) return "查看官方活動頁";
  if (type.includes("none")) return "無需報名";
  if (url) return "可點擊";

  return "未設定";
}

function readyScore(event: EventRecord) {
  const checks = [
    hasValue(event.title_tc || event.title),
    hasValue(event.start_date),
    hasValue(event.venue_name) || hasValue(event.address),
    priceOf(event) !== "收費未填",
    ctaOf(event) !== "未設定",
    imageCount(event) > 0,
    hasValue(event.google_map_url) || hasValue(event.google_map_embed_url),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function qualityIssues(event: EventRecord) {
  const issues: string[] = [];

  if (!hasValue(event.title_tc || event.title)) issues.push("缺少活動名稱");
  if (!hasValue(event.start_date)) issues.push("缺少日期");
  if (!hasValue(event.venue_name) && !hasValue(event.address)) issues.push("缺少地點");
  if (priceOf(event) === "收費未填") issues.push("缺少收費資料");
  if (ctaOf(event) === "未設定") issues.push("缺少 CTA / 報名方式");
  if (imageCount(event) === 0) issues.push("缺少圖片");
  if (!hasValue(event.google_map_url) && !hasValue(event.google_map_embed_url)) issues.push("缺少 Google Map");

  return issues;
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const raw = row[header];
          const value =
            raw === null || raw === undefined
              ? ""
              : Array.isArray(raw)
              ? raw.join(" | ")
              : String(raw);

          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function todayFileName(prefix: string) {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${prefix}-${yyyy}${mm}${dd}.csv`;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("review");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EventRecord | null>(null);
  const [message, setMessage] = useState("");
  const [showAnalytics, setShowAnalytics] = useState(true);

  async function loadEvents() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      setEvents([]);
      setMessage(`讀取活動失敗：${error.message}`);
    } else {
      setEvents((data || []) as EventRecord[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const counts = useMemo(() => {
    const base: Record<FilterKey, number> = {
      all: events.length,
      review: 0,
      draft: 0,
      published: 0,
      rejected: 0,
      archived: 0,
    };

    events.forEach((event) => {
      const group = statusGroup(event.status);
      base[group] += 1;
    });

    return base;
  }, [events]);

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return events.filter((event) => {
      const group = statusGroup(event.status);

      const matchesFilter =
        activeFilter === "all" ? true : group === activeFilter;

      const matchesKeyword = keyword
        ? [
            titleOf(event),
            merchantOf(event),
            categoryOf(event),
            locationOf(event),
            priceOf(event),
            ctaOf(event),
            statusLabel(event.status),
            safeText(event.status, ""),
          ]
            .join(" ")
            .toLowerCase()
            .includes(keyword)
        : true;

      return matchesFilter && matchesKeyword;
    });
  }, [events, activeFilter, search]);

  const analytics = useMemo(() => {
    const total = events.length || 1;

    const ctaReady = events.filter((event) => ctaOf(event) !== "未設定").length;
    const mapReady = events.filter(
      (event) => hasValue(event.google_map_url) || hasValue(event.google_map_embed_url)
    ).length;
    const imageReady = events.filter((event) => imageCount(event) > 0).length;
    const priceReady = events.filter((event) => priceOf(event) !== "收費未填").length;
    const highQuality = events.filter((event) => readyScore(event) >= 80).length;

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
      ctaRate: Math.round((ctaReady / total) * 100),
      mapRate: Math.round((mapReady / total) * 100),
      imageRate: Math.round((imageReady / total) * 100),
      priceRate: Math.round((priceReady / total) * 100),
      qualityRate: Math.round((highQuality / total) * 100),
      byMerchant,
    };
  }, [events]);

  async function updateStatus(id: string, nextStatus: string) {
    const originalEvents = events;
    const originalSelected = selected;

    setBusyId(id);
    setMessage("");

    setEvents((prev) =>
      prev.map((event) =>
        event.id === id
          ? { ...event, status: nextStatus, updated_at: new Date().toISOString() }
          : event
      )
    );

    if (selected?.id === id) {
      setSelected({
        ...selected,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      });
    }

    const { error } = await supabase
      .from("events")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setEvents(originalEvents);
      setSelected(originalSelected);
      setMessage(`更新失敗：${error.message}`);
    } else {
      const nextGroup = statusGroup(nextStatus);
      setActiveFilter(nextGroup);
      setMessage(`已更新為「${statusLabel(nextStatus)}」。已自動切換到相關分類。`);
      await loadEvents();
    }

    setBusyId(null);
  }

  function exportEventsReport() {
    const rows = events.map((event) => ({
      id: event.id,
      raw_status: event.status || "",
      status_group: statusLabel(event.status),
      title: titleOf(event),
      merchant: merchantOf(event),
      category: categoryOf(event),
      date: dateOf(event),
      location: locationOf(event),
      price: priceOf(event),
      cta: ctaOf(event),
      image_count: imageCount(event),
      map_ready:
        hasValue(event.google_map_url) || hasValue(event.google_map_embed_url)
          ? "yes"
          : "no",
      quality_score: readyScore(event),
      issues: qualityIssues(event).join(" | "),
      source_url: event.source_url || "",
      registration_url: event.registration_url || "",
      updated_at: event.updated_at || "",
      created_at: event.created_at || "",
    }));

    downloadCsv(todayFileName("hk-family-fun-events-report"), rows);
  }

  function exportMerchantReport() {
    const merchantMap = new Map<
      string,
      {
        merchant: string;
        total: number;
        review: number;
        draft: number;
        published: number;
        rejected: number;
        archived: number;
        avg_quality_total: number;
      }
    >();

    events.forEach((event) => {
      const merchant = merchantOf(event);
      const group = statusGroup(event.status);

      const current =
        merchantMap.get(merchant) ||
        {
          merchant,
          total: 0,
          review: 0,
          draft: 0,
          published: 0,
          rejected: 0,
          archived: 0,
          avg_quality_total: 0,
        };

      current.total += 1;
      current[group] += 1;
      current.avg_quality_total += readyScore(event);

      merchantMap.set(merchant, current);
    });

    const rows = Array.from(merchantMap.values()).map((row) => ({
      merchant: row.merchant,
      total: row.total,
      review: row.review,
      draft: row.draft,
      published: row.published,
      rejected: row.rejected,
      archived: row.archived,
      avg_quality: row.total
        ? Math.round(row.avg_quality_total / row.total)
        : 0,
    }));

    downloadCsv(todayFileName("hk-family-fun-merchant-report"), rows);
  }

  function exportApprovalReport() {
    const rows = FILTERS.map((filter) => ({
      status: filter.label,
      count: counts[filter.key],
    }));

    downloadCsv(todayFileName("hk-family-fun-approval-status-report"), rows);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold text-purple-700">
                Admin Portal · 活動審批中心
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                活動審批、發布及數據管理
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
                審批商戶提交的活動、檢查資料完整度、管理公開狀態、下載報表及追蹤商戶活動表現。
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

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard label="全部活動" value={counts.all} tone="slate" />
            <StatCard label="待審批" value={counts.review} tone="amber" />
            <StatCard label="草稿" value={counts.draft} tone="purple" />
            <StatCard label="已發布" value={counts.published} tone="green" />
            <StatCard label="已拒絕" value={counts.rejected} tone="rose" />
            <StatCard label="已封存" value={counts.archived} tone="slate" />
          </div>

          {showAnalytics ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">
                      可視化數據總覽
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      MVP analytics：按資料完整度及審批狀態即時統計。
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={exportEventsReport}
                      className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                    >
                      下載活動總表
                    </button>
                    <button
                      type="button"
                      onClick={exportMerchantReport}
                      className="rounded-full bg-purple-700 px-4 py-2 text-xs font-black text-white hover:bg-purple-800"
                    >
                      下載商戶分析
                    </button>
                    <button
                      type="button"
                      onClick={exportApprovalReport}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700"
                    >
                      下載審批報表
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Metric label="CTA 完成" value={analytics.ctaRate} />
                  <Metric label="地圖完成" value={analytics.mapRate} />
                  <Metric label="圖片完成" value={analytics.imageRate} />
                  <Metric label="收費完成" value={analytics.priceRate} />
                  <Metric label="80分以上" value={analytics.qualityRate} />
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
                        max={Math.max(
                          ...analytics.byMerchant.map((merchant) => merchant.count),
                          1
                        )}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">暫時未有商戶數據。</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_390px]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜尋活動名稱、商戶、地區、收費、CTA..."
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 lg:max-w-md"
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
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">
                正在讀取活動資料...
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                  🔎
                </div>
                <p className="mt-4 text-lg font-black text-slate-900">
                  暫時沒有符合條件的活動
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  可切換狀態、清除搜尋字，或按重新整理。
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredEvents.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    busy={busyId === event.id}
                    selected={selected?.id === event.id}
                    onSelect={() => setSelected(event)}
                    onApprove={() => updateStatus(event.id, "published")}
                    onReject={() => updateStatus(event.id, "rejected")}
                    onArchive={() => updateStatus(event.id, "archived")}
                    onDraft={() => updateStatus(event.id, "draft")}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {selected ? (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-purple-700">
                    Review Detail
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    {titleOf(selected)}
                  </h2>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={selected.status} />
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      完整度 {readyScore(selected)}%
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      Raw: {safeText(selected.status, "empty")}
                    </span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {selected.cover_image_url ? (
                    <img
                      src={selected.cover_image_url}
                      alt={titleOf(selected)}
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center text-sm text-slate-400">
                      未有封面圖片
                    </div>
                  )}
                </div>

                <div className="grid gap-2 text-sm">
                  <ReviewLine label="商戶" value={merchantOf(selected)} />
                  <ReviewLine label="日期" value={dateOf(selected)} />
                  <ReviewLine label="地點" value={locationOf(selected)} />
                  <ReviewLine label="分類" value={categoryOf(selected)} />
                  <ReviewLine label="收費" value={priceOf(selected)} />
                  <ReviewLine label="CTA" value={ctaOf(selected)} />
                  <ReviewLine label="圖片數量" value={`${imageCount(selected)} 張`} />
                  <ReviewLine
                    label="Google Map"
                    value={
                      selected.google_map_url || selected.google_map_embed_url
                        ? "已提供"
                        : "未提供"
                    }
                  />
                </div>

                <QualityBox issues={qualityIssues(selected)} />

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/merchant/events/${selected.id}/preview`}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Preview
                  </Link>
                  <Link
                    href={`/events/${selected.id}`}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    公開頁
                  </Link>
                  <Link
                    href={`/merchant/events/${selected.id}/edit`}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    編輯
                  </Link>
                  <button
                    type="button"
                    onClick={() => updateStatus(selected.id, "draft")}
                    disabled={busyId === selected.id}
                    className="rounded-2xl border border-purple-300 bg-purple-50 px-4 py-3 text-sm font-bold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                  >
                    改回草稿
                  </button>
                </div>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => updateStatus(selected.id, "published")}
                    disabled={busyId === selected.id}
                    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    通過審批並發布
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(selected.id, "rejected")}
                    disabled={busyId === selected.id}
                    className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    拒絕活動
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(selected.id, "archived")}
                    disabled={busyId === selected.id}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    封存活動
                  </button>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-6 text-blue-800">
                  <p className="font-black">審批提示</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    <li>已修正 status group，草稿、封存、待審批不再混亂。</li>
                    <li>按 Draft 後會自動切換到草稿 filter。</li>
                    <li>右側 Raw status 方便你檢查 Supabase 真實 status 值。</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-2xl">
                  ✅
                </div>
                <h2 className="mt-4 text-lg font-black text-slate-950">
                  選擇一個活動審批
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  左邊點選活動後，這裡會顯示完整審批摘要、Preview、公開頁及審批操作。
                </p>
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "amber" | "green" | "rose" | "purple";
}) {
  const tones = {
    slate: "bg-slate-50 border-slate-200 text-slate-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    green: "bg-emerald-50 border-emerald-200 text-emerald-900",
    rose: "bg-rose-50 border-rose-200 text-rose-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900",
  };

  return (
    <div className={`rounded-3xl border p-5 ${tones[tone]}`}>
      <p className="text-xs font-black opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-end justify-between">
        <p className="text-xs font-black text-slate-500">{label}</p>
        <p className="text-2xl font-black text-slate-950">{value}%</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-purple-700"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
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
  const width = Math.max(6, Math.round((value / max) * 100));

  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-xs">
        <span className="truncate font-bold text-slate-700">{label}</span>
        <span className="font-black text-slate-950">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${width}%` }}
        />
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

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <span className="text-right text-xs font-bold text-slate-900">{value}</span>
    </div>
  );
}

function QualityBox({ issues }: { issues: string[] }) {
  if (issues.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
        ✅ 基本資料完整，可以審批。
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
      <p className="font-black">審批前建議檢查</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    </div>
  );
}

function EventRow({
  event,
  busy,
  selected,
  onSelect,
  onApprove,
  onReject,
  onArchive,
  onDraft,
}: {
  event: EventRecord;
  busy: boolean;
  selected: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  onArchive: () => void;
  onDraft: () => void;
}) {
  return (
    <div
      className={[
        "grid gap-4 p-5 transition lg:grid-cols-[88px_1fr_260px]",
        selected ? "bg-purple-50/60" : "bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onSelect}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-left"
      >
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={titleOf(event)}
            className="h-20 w-full object-cover"
          />
        ) : (
          <div className="flex h-20 items-center justify-center text-xl">親</div>
        )}
      </button>

      <button type="button" onClick={onSelect} className="text-left">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={event.status} />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {imageCount(event)} 張圖
          </span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            完整度 {readyScore(event)}%
          </span>
        </div>

        <h3 className="mt-3 text-lg font-black text-slate-950">
          {titleOf(event)}
        </h3>

        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
          {safeText(event.short_description_tc || event.description_tc, "未有簡介")}
        </p>

        <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
          <MiniInfo label="商戶" value={merchantOf(event)} />
          <MiniInfo label="日期" value={dateOf(event)} />
          <MiniInfo label="地點" value={locationOf(event)} />
          <MiniInfo label="收費" value={priceOf(event)} />
        </div>
      </button>

      <div className="flex flex-col justify-between gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs">
          <div className="flex justify-between gap-3">
            <span className="font-bold text-slate-500">CTA</span>
            <span className="text-right font-black text-slate-900">
              {ctaOf(event)}
            </span>
          </div>
          <div className="mt-2 flex justify-between gap-3">
            <span className="font-bold text-slate-500">分類</span>
            <span className="text-right font-bold text-slate-700">
              {categoryOf(event)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={onArchive}
            disabled={busy}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Archive
          </button>
          <button
            type="button"
            onClick={onDraft}
            disabled={busy}
            className="rounded-xl border border-purple-300 bg-purple-50 px-3 py-2 text-xs font-black text-purple-700 hover:bg-purple-100 disabled:opacity-50"
          >
            Draft
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="font-bold text-slate-400">{label}</p>
      <p className="mt-1 truncate font-bold text-slate-700">{value}</p>
    </div>
  );
}