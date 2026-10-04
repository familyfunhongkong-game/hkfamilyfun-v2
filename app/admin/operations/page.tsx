"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Metric = {
  count: number;
  available: boolean;
  error?: string;
};

type SourceRow = {
  id?: string;
  source_key?: string;
  source_type?: string;
  display_name?: string;
  source_url?: string;
  sheet_name?: string;
  active?: boolean;
  sync_mode?: string;
  last_sync_at?: string | null;
  last_sync_status?: string | null;
  last_sync_message?: string | null;
};

type Summary = {
  ok: boolean;
  checkedAt: string;
  newOpsTablesAvailable: boolean;
  metrics: Record<string, Metric>;
  latestSync: Record<string, unknown> | null;
  sources: SourceRow[];
};

function MetricCard({
  label,
  metric,
  href,
  note,
}: {
  label: string;
  metric?: Metric;
  href?: string;
  note: string;
}) {
  const body = (
    <article className="h-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-purple-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-500">{label}</p>
        <span
          className={[
            "rounded-full px-2.5 py-1 text-[10px] font-black",
            metric?.available
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700",
          ].join(" ")}
        >
          {metric?.available ? "LIVE" : "SETUP"}
        </span>
      </div>
      <p className="mt-3 text-4xl font-black text-slate-950">
        {metric?.available ? metric.count : "—"}
      </p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{note}</p>
    </article>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

function formatTime(value?: string | null) {
  if (!value) return "未同步";
  try {
    return new Intl.DateTimeFormat("zh-HK", {
      timeZone: "Asia/Hong_Kong",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function AdminOperationsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  async function loadSummary() {
    setLoading(true);
    setErrorText("");

    if (!supabase) {
      setErrorText("Supabase client 未初始化。");
      setLoading(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setErrorText("請先登入 Admin。");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/operations-summary", {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
      });
      const body = await response.json();

      if (!response.ok) {
        setErrorText(body.error || "未能讀取營運資料。");
      } else {
        setSummary(body as Summary);
      }
    } catch {
      setErrorText("未能連接 Operations API。");
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  const metrics = summary?.metrics || {};
  const needsAttention = useMemo(() => {
    return (
      (metrics.submittedEvents?.count || 0) +
      (metrics.pendingMerchants?.count || 0) +
      (metrics.intakeNew?.count || 0) +
      (metrics.unreadNotifications?.count || 0)
    );
  }, [metrics]);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href="/admin" className="text-sm font-black text-purple-700">
                ← 返回 Admin
              </Link>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-purple-700">
                One-person Operations
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Data Hub / 營運總控台
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Supabase 係唯一主資料庫；Google Drive、Google Sheets、商戶表單、網站表單同外部來源只作資料入口。所有資料先入待處理 Inbox，再由 Admin 批准先公開。
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadSummary()}
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700"
            >
              重新整理
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-black",
                needsAttention > 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800",
              ].join(" ")}
            >
              {needsAttention > 0 ? "待處理 " + needsAttention + " 項" : "暫無緊急待處理"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              AI / 自動化只建立草稿，不會自動發布
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-8">
        {errorText ? (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
            {errorText}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500">
            正在整理 Supabase / Admin 營運數據…
          </div>
        ) : null}

        {summary && !summary.newOpsTablesAvailable ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-900">
            新 Data Hub schema 已加入程式庫，但 Supabase migration 尚未套用；舊有 Events / Merchants 功能不受影響。套用 migration 後，News、Banner、Social Draft、Google Sheet Intake 同 Sync Report 會自動啟用。
          </div>
        ) : null}

        {summary ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="待審活動" metric={metrics.submittedEvents} href="/admin/events" note="商戶或自動匯入後等待你審批。" />
              <MetricCard label="待審商戶" metric={metrics.pendingMerchants} href="/admin/merchants" note="新商戶完成登記後等待批准。" />
              <MetricCard label="Data Inbox" metric={metrics.intakeNew} note="Drive / Forms / Sheet 新資料待 normalize。" />
              <MetricCard label="未讀通知" metric={metrics.unreadNotifications} href="/admin/notifications" note="平台營運 queue，不依賴 email。" />
              <MetricCard label="全部活動" metric={metrics.totalEvents} href="/admin/events" note="Supabase events 主資料。" />
              <MetricCard label="已發布活動" metric={metrics.publishedEvents} href="/events" note="目前可供公眾瀏覽的活動狀態。" />
              <MetricCard label="News 草稿" metric={metrics.contentDrafts} href="/admin/content" note="專題 / News / Guide 等待編輯或發布。" />
              <MetricCard label="Active Banner" metric={metrics.activeBanners} href="/admin/promotions" note="商戶廣告及特別宣傳位置。" />
              <MetricCard label="Social Draft" metric={metrics.socialDrafts} href="/admin/social" note="FB / IG / Threads 可直接取用文案。" />
              <MetricCard label="資料來源" metric={metrics.dataSources} note="已登記 Google Sheet / Drive / Form / Website。" />
              <MetricCard label="Sync Runs" metric={metrics.syncRuns} note="所有同步工作留低 audit trail。" />
              <MetricCard label="商戶總數" metric={metrics.merchants} href="/admin/merchants" note="包括 pending / approved / rejected / suspended。" />
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-purple-700">External Sources</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      Google Drive / Forms / Sheets
                    </h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    Supabase = Source of Truth
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {summary.sources.length ? (
                    summary.sources.map((source) => (
                      <article
                        key={source.id || source.source_key}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-900">
                              {source.display_name || source.source_key}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {source.source_type} · {source.sheet_name || "—"} · {source.sync_mode || "manual"}
                            </p>
                          </div>
                          <span
                            className={[
                              "rounded-full px-2.5 py-1 text-[10px] font-black",
                              source.last_sync_status === "success"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600",
                            ].join(" ")}
                          >
                            {source.last_sync_status || "NOT SYNCED"}
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          Last sync: {formatTime(source.last_sync_at)}
                        </p>
                        {source.last_sync_message ? (
                          <p className="mt-2 text-xs font-semibold text-slate-600">
                            {source.last_sync_message}
                          </p>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm font-semibold text-slate-500">
                      套用 Data Hub migration 後會顯示已登記資料來源。
                    </div>
                  )}
                </div>
              </section>

              <aside className="space-y-5">
                <section className="rounded-[2rem] border border-purple-200 bg-purple-50 p-6">
                  <p className="text-sm font-black text-purple-800">每日工作模式</p>
                  <ol className="mt-4 space-y-3 text-sm font-bold leading-6 text-purple-950">
                    <li>1. 自動收集 / 商戶提交 → Data Inbox</li>
                    <li>2. 系統 normalize、去重、補三語、做草稿</li>
                    <li>3. 你只處理紅色 / 黃色例外</li>
                    <li>4. 按一次批准 → Website 發布</li>
                    <li>5. 同一資料生成 News / Social Draft</li>
                  </ol>
                </section>

                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-black text-slate-950">Latest Sync</p>
                  {summary.latestSync ? (
                    <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-600">
                      {JSON.stringify(summary.latestSync, null, 2)}
                    </pre>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      暫時未有同步紀錄。之後每次 Drive / Form sync 都會記錄讀取、更新、略過同錯誤數量。
                    </p>
                  )}
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
