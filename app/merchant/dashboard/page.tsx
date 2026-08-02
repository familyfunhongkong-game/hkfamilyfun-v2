"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type EventRecord = {
  id: string;
  merchant_id?: string | null;
  title_tc?: string | null;
  title?: string | null;
  short_description_tc?: string | null;
  description_tc?: string | null;
  venue_name?: string | null;
  address?: string | null;
  district?: string | null;
  area?: string | null;
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

type MerchantRecord = {
  id: string;
  owner_user_id?: string | null;
  business_name?: string | null;
  contact_email?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type FilterKey =
  | "all"
  | "draft"
  | "review"
  | "published"
  | "rejected"
  | "archived";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部活動" },
  { key: "draft", label: "草稿" },
  { key: "review", label: "審批中" },
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

  if (group === "review") return "審批中";
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

function missingItems(event: EventRecord) {
  const items: string[] = [];

  if (!hasValue(event.title_tc || event.title)) items.push("活動名稱");
  if (!hasValue(event.start_date)) items.push("活動日期");
  if (!hasValue(event.venue_name) && !hasValue(event.address)) items.push("地點");
  if (priceOf(event) === "收費未填") items.push("收費資料");
  if (ctaOf(event) === "未設定") items.push("報名 / CTA");
  if (imageCount(event) === 0) items.push("圖片");
  if (!hasValue(event.google_map_url) && !hasValue(event.google_map_embed_url)) {
    items.push("Google Map");
  }

  return items;
}

function canSubmit(event: EventRecord) {
  return readyScore(event) >= 60 && statusGroup(event.status) === "draft";
}

export default function MerchantDashboardPage() {
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMerchant(null);
      setEvents([]);
      setMessage("請先登入商戶帳戶。");
      setLoading(false);
      return;
    }

    const { data: merchantData, error: merchantError } = await supabase
      .from("merchants")
      .select("*")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (merchantError) {
      setMerchant(null);
      setEvents([]);
      setMessage(`讀取商戶資料失敗：${merchantError.message}`);
      setLoading(false);
      return;
    }

    if (!merchantData) {
      setMerchant(null);
      setEvents([]);
      setMessage("此帳戶未連接商戶資料，請先完成商戶登記。");
      setLoading(false);
      return;
    }

    const currentMerchant = merchantData as MerchantRecord;
    setMerchant(currentMerchant);

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("merchant_id", currentMerchant.id)
      .order("updated_at", { ascending: false });

    if (eventError) {
      setEvents([]);
      setMessage(`讀取活動資料失敗：${eventError.message}`);
    } else {
      setEvents((eventData || []) as EventRecord[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const counts = useMemo(() => {
    const base: Record<FilterKey, number> = {
      all: events.length,
      draft: 0,
      review: 0,
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
            categoryOf(event),
            dateOf(event),
            locationOf(event),
            priceOf(event),
            ctaOf(event),
            statusLabel(event.status),
          ]
            .join(" ")
            .toLowerCase()
            .includes(keyword)
        : true;

      return matchesFilter && matchesKeyword;
    });
  }, [events, activeFilter, search]);

  const averageScore = useMemo(() => {
    if (!events.length) return 0;
    const total = events.reduce((sum, event) => sum + readyScore(event), 0);
    return Math.round(total / events.length);
  }, [events]);

  async function updateStatus(id: string, nextStatus: string) {
    const originalEvents = events;
    const now = new Date().toISOString();

    setBusyId(id);
    setMessage("");

    setEvents((prev) =>
      prev.map((event) =>
        event.id === id
          ? { ...event, status: nextStatus, updated_at: now }
          : event
      )
    );

    const { error } = await supabase
      .from("events")
      .update({
        status: nextStatus,
        updated_at: now,
      })
      .eq("id", id);

    if (error) {
      setEvents(originalEvents);
      setMessage(`更新失敗：${error.message}`);
    } else {
      setActiveFilter(statusGroup(nextStatus));
      setMessage(`活動已更新為「${statusLabel(nextStatus)}」。`);
      await loadDashboard();
    }

    setBusyId(null);
  }

  async function duplicateEvent(event: EventRecord) {
    if (!merchant) return;

    setBusyId(event.id);
    setMessage("");

    const newEvent = {
      ...event,
      id: undefined,
      status: "draft",
      title_tc: `${titleOf(event)} 副本`,
      title: event.title ? `${event.title} 副本` : null,
      merchant_id: merchant.id,
      created_at: undefined,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("events").insert(newEvent);

    if (error) {
      setMessage(`複製失敗：${error.message}`);
    } else {
      setMessage("已建立活動副本，可在草稿中繼續編輯。");
      setActiveFilter("draft");
      await loadDashboard();
    }

    setBusyId(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-2xl">
              親
            </div>
            <p className="font-bold text-slate-700">正在讀取商戶 Dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!merchant) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
            <p className="text-sm font-black text-amber-700">Merchant Dashboard</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">
              尚未連接商戶帳戶
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {message || "請先登入或完成商戶免費登記。"}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/merchant/login"
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
              >
                商戶登入
              </Link>
              <Link
                href="/merchant/register"
                className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white"
              >
                商戶免費登記
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold text-purple-700">
                Merchant Portal · 活動管理中心
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                商戶 Dashboard
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
                管理你的活動草稿、審批狀態、公開頁資料及報名 CTA。目標是減少重複填表，
                讓活動更快被家長搜尋到。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadDashboard}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                重新整理
              </button>
              <Link
                href="/merchant/events/import"
                className="rounded-full bg-purple-700 px-5 py-2 text-sm font-bold text-white hover:bg-purple-800"
              >
                新增活動
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black text-emerald-700">
                  商戶帳戶已連接
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {safeText(merchant.business_name, "未命名商戶")}
                </h2>
                <p className="mt-1 text-sm text-emerald-800">
                  狀態：{safeText(merchant.status, "未確認")} · Email：
                  {safeText(merchant.contact_email, "未填寫")}
                </p>
              </div>

              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700">
                平均資料完整度：{averageScore}%
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard label="全部活動" value={counts.all} tone="slate" />
            <StatCard label="草稿" value={counts.draft} tone="purple" />
            <StatCard label="審批中" value={counts.review} tone="amber" />
            <StatCard label="已發布" value={counts.published} tone="green" />
            <StatCard label="已拒絕" value={counts.rejected} tone="rose" />
            <StatCard label="已封存" value={counts.archived} tone="slate" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜尋活動名稱、地區、收費、CTA..."
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
                我的活動
                <span className="ml-2 text-sm font-semibold text-slate-500">
                  {filteredEvents.length} / {events.length}
                </span>
              </h2>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-50 text-2xl">
                  📅
                </div>
                <h3 className="mt-4 text-xl font-black text-slate-950">
                  暫時未有活動
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  你可以貼上活動網址、上載 poster 或 PDF，先建立可編輯草稿。
                </p>
                <Link
                  href="/merchant/events/import"
                  className="mt-5 inline-flex rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800"
                >
                  新增第一個活動
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    busy={busyId === event.id}
                    onSubmit={() => updateStatus(event.id, "submitted")}
                    onArchive={() => updateStatus(event.id, "archived")}
                    onRestore={() => updateStatus(event.id, "draft")}
                    onDuplicate={() => duplicateEvent(event)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-purple-700">商戶使用流程</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              由草稿到發布
            </h2>

            <div className="mt-5 space-y-3">
              <GuideStep
                number="1"
                title="建立草稿"
                text="貼活動網址、上載圖片或 PDF，先產生可編輯資料。"
              />
              <GuideStep
                number="2"
                title="補齊重點資料"
                text="日期、地點、收費、CTA、圖片及 Google Map 最重要。"
              />
              <GuideStep
                number="3"
                title="Preview 檢查"
                text="先看家長會見到的大約效果，再提交審批。"
              />
              <GuideStep
                number="4"
                title="提交審批"
                text="HK Family Fun 審批通過後，活動才會公開顯示。"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
            <p className="font-black">提升曝光建議</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-6">
              <li>封面圖建議橫圖，避免文字太細。</li>
              <li>活動簡介用 2–3 句講清楚適合邊類家庭。</li>
              <li>報名方式要清楚：官方網站、Google Form、WhatsApp 或無需報名。</li>
              <li>Google Map 可提高家長出發前信心。</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-black">平台角色說明</p>
            <p className="mt-2 leading-6">
              HK Family Fun 主要協助活動搜尋、整理及展示。活動內容、收費、名額、
              報名安排及現場安排，仍以主辦方最新公布為準。
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function EventCard({
  event,
  busy,
  onSubmit,
  onArchive,
  onRestore,
  onDuplicate,
}: {
  event: EventRecord;
  busy: boolean;
  onSubmit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDuplicate: () => void;
}) {
  const group = statusGroup(event.status);
  const score = readyScore(event);
  const missing = missingItems(event);
  const published = group === "published";
  const canSubmitForReview = canSubmit(event);

  return (
    <div className="grid gap-5 p-5 transition hover:bg-slate-50 lg:grid-cols-[220px_1fr_250px]">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {event.cover_image_url ? (
          <div className="flex h-44 w-full items-center justify-center bg-slate-50 p-2">
            <img
              src={event.cover_image_url}
              alt={titleOf(event)}
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
          </div>
        ) : (
          <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 text-4xl">
            親
          </div>
        )}

        <div className="border-t border-slate-100 bg-white px-3 py-2 text-xs font-bold text-slate-500">
          圖片 {imageCount(event)} 張
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={event.status} />
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            完整度 {score}%
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {categoryOf(event)}
          </span>
        </div>

        <h3 className="mt-3 text-xl font-black leading-snug text-slate-950">
          {titleOf(event)}
        </h3>

        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
          {safeText(event.short_description_tc || event.description_tc, "未有活動簡介")}
        </p>

        <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
          <MiniInfo label="日期" value={dateOf(event)} />
          <MiniInfo label="地點" value={locationOf(event)} />
          <MiniInfo label="收費" value={priceOf(event)} />
          <MiniInfo label="CTA" value={ctaOf(event)} />
        </div>

        {missing.length ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800">
            <span className="font-black">建議補充：</span>
            {missing.join("、")}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
            資料完整，可提交或已適合公開展示。
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500">資料完整度</span>
            <span className="font-black text-slate-950">{score}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
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
          >
            Preview
          </Link>

          <Link
            href={`/merchant/events/${event.id}/edit`}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            編輯
          </Link>

          {published ? (
            <Link
              href={`/events/${event.id}`}
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-center text-xs font-black text-emerald-700 hover:bg-emerald-100"
            >
              公開頁
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-black text-slate-400"
            >
              未公開
            </button>
          )}

          <button
            type="button"
            onClick={onDuplicate}
            disabled={busy}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            複製
          </button>
        </div>

        <div className="grid gap-2">
          {group === "draft" ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy || !canSubmitForReview}
              className="rounded-xl bg-purple-700 px-3 py-2 text-xs font-black text-white hover:bg-purple-800 disabled:bg-slate-300"
            >
              提交審批
            </button>
          ) : null}

          {group === "archived" ? (
            <button
              type="button"
              onClick={onRestore}
              disabled={busy}
              className="rounded-xl bg-purple-700 px-3 py-2 text-xs font-black text-white hover:bg-purple-800 disabled:opacity-50"
            >
              還原草稿
            </button>
          ) : (
            <button
              type="button"
              onClick={onArchive}
              disabled={busy}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50"
            >
              封存
            </button>
          )}

          {group === "draft" && !canSubmitForReview ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-700">
              資料完整度未夠，請先補齊重點資料。
            </p>
          ) : null}
        </div>
      </div>
    </div>
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
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="font-bold text-slate-400">{label}</p>
      <p className="mt-1 truncate font-bold text-slate-700">{value}</p>
    </div>
  );
}

function GuideStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-700 text-sm font-black text-white">
        {number}
      </div>
      <div>
        <p className="font-black text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
      </div>
    </div>
  );
}