"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Metric = { count: number; available: boolean; error?: string };
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
type DriveStatus = {
  ok: boolean;
  configured: boolean;
  schemaReady: boolean;
  connected: boolean;
  authMode?: "oauth" | "service_account";
  accountEmail?: string | null;
  lastConnectedAt?: string | null;
  lastUsedAt?: string | null;
  lastError?: string | null;
};

function MetricCard({label, metric, href, note}:{label:string; metric?:Metric; href?:string; note:string}) {
  const body = (
    <article className="h-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-purple-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-500">{label}</p>
        <span className={"rounded-full px-2.5 py-1 text-[10px] font-black " + (metric?.available ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
          {metric?.available ? "LIVE" : "SETUP"}
        </span>
      </div>
      <p className="mt-3 text-4xl font-black text-slate-950">{metric?.available ? metric.count : "—"}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{note}</p>
    </article>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function formatTime(value?: string | null) {
  if (!value) return "未同步";
  try {
    return new Intl.DateTimeFormat("zh-HK", { timeZone:"Asia/Hong_Kong", dateStyle:"medium", timeStyle:"short" }).format(new Date(value));
  } catch { return value; }
}

export default function AdminOperationsPage() {
  const [summary,setSummary]=useState<Summary|null>(null);
  const [drive,setDrive]=useState<DriveStatus|null>(null);
  const [loading,setLoading]=useState(true);
  const [syncing,setSyncing]=useState(false);
  const [message,setMessage]=useState("");
  const [errorText,setErrorText]=useState("");

  async function accessToken() {
    if (!supabase) return "";
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }

  async function request(path:string, init?:RequestInit) {
    const token=await accessToken();
    if (!token) throw new Error("請先登入 Admin。");
    const response=await fetch(path,{
      ...init,
      headers:{ ...(init?.headers||{}), Authorization:"Bearer "+token, "Content-Type":"application/json" },
      cache:"no-store",
    });
    const body=await response.json();
    if(!response.ok) throw new Error(body.error||"Request failed");
    return body;
  }

  async function loadSummary() {
    setLoading(true); setErrorText("");
    try {
      const [ops,driveState]=await Promise.all([
        request("/api/admin/operations-summary"),
        request("/api/admin/google-drive/status"),
      ]);
      setSummary(ops as Summary);
      setDrive(driveState as DriveStatus);
    } catch(error) {
      setErrorText(error instanceof Error ? error.message : "未能讀取營運資料。");
    }
    setLoading(false);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const driveState = params.get("drive");

    if (driveState === "connected") {
      setMessage("Google Drive 已成功連接。可以使用 Sync All Data / Forms。");
    } else if (driveState === "wrong-account") {
      setErrorText("Google Drive 授權帳戶不正確。請使用 familyfun.hongkong@gmail.com。");
    } else if (driveState === "token-error") {
      setErrorText("Google OAuth token exchange 失敗，請重新連接。");
    } else if (driveState === "refresh-token-missing") {
      setErrorText("Google 未提供 refresh token，請重新連接並同意所需權限。");
    } else if (driveState === "state-error") {
      setErrorText("Google OAuth 安全驗證失敗，請重新連接。");
    } else if (driveState === "database-error") {
      setErrorText("Google Drive 已授權，但未能保存 integration，請重試。");
    } else if (driveState === "not-configured") {
      setErrorText("Google Drive OAuth 設定未完整。");
    }

    if (driveState) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    void loadSummary();
  }, []);

  const metrics=summary?.metrics||{};
  const needsAttention=useMemo(()=>(
    (metrics.submittedEvents?.count||0)+(metrics.pendingMerchants?.count||0)+
    (metrics.intakeNew?.count||0)+(metrics.unreadNotifications?.count||0)
  ),[metrics]);

  async function connectDrive() {
    setErrorText("");
    try {
      const body=await request("/api/admin/google-drive/connect",{method:"POST",body:"{}"});
      if(body.url) window.location.href=body.url;
    } catch(error) {
      setErrorText(error instanceof Error ? error.message : "未能連接 Google Drive。");
    }
  }

  async function disconnectDrive() {
    if(!window.confirm("確定要中斷 HK Family Fun Admin 與 Google Drive 的連接？")) return;
    try {
      await request("/api/admin/google-drive/disconnect",{method:"POST",body:"{}"});
      setMessage("Google Drive 已中斷。");
      await loadSummary();
    } catch(error) {
      setErrorText(error instanceof Error ? error.message : "未能中斷 Google Drive。");
    }
  }

  async function syncAll() {
    setSyncing(true); setMessage(""); setErrorText("");
    try {
      const body=await request("/api/admin/google-drive/sync-all",{method:"POST",body:"{}"});
      setMessage("同步完成：讀取 "+(body.rows_read||0)+" 行，寫入 Intake "+(body.rows_upserted||0)+" 行，錯誤 "+(body.errors||0)+"。");
      await loadSummary();
    } catch(error) {
      setErrorText(error instanceof Error ? error.message : "同步失敗。");
    }
    setSyncing(false);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href="/admin" className="text-sm font-black text-purple-700">← 返回 Admin</Link>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-purple-700">One-person Operations</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Data Hub / 營運總控台</h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
                Supabase 係唯一主資料庫；Google Drive、Google Sheets、Forms 同外部來源只做入口。
                一次同步先入 Intake，AI / rule-based normalize 後由 Admin 批准先公開。
              </p>
            </div>
            <button type="button" onClick={()=>void loadSummary()} className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700">重新整理</button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className={"rounded-full px-3 py-1 text-xs font-black "+(needsAttention>0?"bg-amber-100 text-amber-800":"bg-emerald-100 text-emerald-800")}>
              {needsAttention>0 ? "待處理 "+needsAttention+" 項" : "暫無緊急待處理"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">AI 自動做草稿；公開仍要 Admin 批准</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-8">
        {message ? <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</div>:null}
        {errorText ? <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{errorText}</div>:null}
        {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500">正在整理 Supabase / Drive / Admin 數據…</div>:null}

        {summary && !summary.newOpsTablesAvailable ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-900">
            Data Hub migration 尚未完整套用到 Supabase。舊 Events / Merchants 不受影響，但 News、Banner、Social、Intake、Sync Report 需要完成 schema 才可正式使用。
          </div>
        ):null}

        {summary ? <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="待審活動" metric={metrics.submittedEvents} href="/admin/events" note="商戶或匯入後等待你審批。" />
            <MetricCard label="待審商戶" metric={metrics.pendingMerchants} href="/admin/merchants" note="新商戶等待批准。" />
            <MetricCard label="Data Inbox" metric={metrics.intakeNew} href="/admin/intake" note="Drive / Forms / Sheet 新資料待處理。" />
            <MetricCard label="未讀通知" metric={metrics.unreadNotifications} href="/admin/notifications" note="站內營運 queue，不依賴 email。" />
            <MetricCard label="全部活動" metric={metrics.totalEvents} href="/admin/events" note="Supabase events 主資料。" />
            <MetricCard label="已發布活動" metric={metrics.publishedEvents} href="/events" note="公眾目前可見活動。" />
            <MetricCard label="News 草稿" metric={metrics.contentDrafts} href="/admin/content" note="News / Feature / Guide。" />
            <MetricCard label="Active Banner" metric={metrics.activeBanners} href="/admin/promotions" note="廣告及特別宣傳位置。" />
            <MetricCard label="Social Draft" metric={metrics.socialDrafts} href="/admin/social" note="FB / IG / Threads 文案。" />
            <MetricCard label="資料來源" metric={metrics.dataSources} note="Google Sheet / Drive / Form / Website。" />
            <MetricCard label="Sync Runs" metric={metrics.syncRuns} note="每次同步保留 audit trail。" />
            <MetricCard label="商戶總數" metric={metrics.merchants} href="/admin/merchants" note="所有商戶帳戶。" />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <aside className="space-y-5">
              <section className="rounded-[2rem] border border-purple-200 bg-purple-50 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-purple-800">Google Drive Sync</p>
                    <h2 className="mt-1 text-xl font-black text-purple-950">Drive / Sheets / Forms</h2>
                  </div>
                  <span className={"rounded-full px-3 py-1 text-[10px] font-black "+(drive?.connected?"bg-emerald-100 text-emerald-800":"bg-amber-100 text-amber-800")}>
                    {drive?.connected?"CONNECTED":"NOT CONNECTED"}
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-sm font-semibold text-purple-950">
                  <p>Auth mode：{drive?.authMode === "service_account" ? "Service Account（長期）" : "OAuth（測試 / 備用）"}</p>
                  <p>Integration：{drive?.configured?"Ready":"未設定"}</p>
                  <p>Schema：{drive?.schemaReady?"Ready":"未套用"}</p>
                  <p>Account：{drive?.accountEmail||"—"}</p>
                  <p>Last used：{formatTime(drive?.lastUsedAt)}</p>
                </div>
                <div className="mt-5 grid gap-2">
                  {!drive?.connected ? (
                    <>
                      <button type="button" onClick={()=>void connectDrive()} disabled={!drive?.configured} className="rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
                        暫時用 OAuth 連接 Google Sheets
                      </button>
                      <a
                        href="https://console.cloud.google.com/auth/audience"
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-purple-300 bg-white px-5 py-3 text-center text-sm font-black text-purple-800"
                      >
                        Google Auth Platform：加入 Test User ↗
                      </a>
                    </>
                  ):<>
                    <button type="button" onClick={()=>void syncAll()} disabled={syncing} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                      {syncing?"同步中…":"Sync All Data / Forms"}
                    </button>
                    {drive?.authMode !== "service_account" ? (
                      <button type="button" onClick={()=>void disconnectDrive()} className="rounded-2xl border border-purple-300 bg-white px-5 py-3 text-sm font-black text-purple-800">中斷 OAuth</button>
                    ) : null}
                  </>}
                </div>
                {drive?.authMode === "service_account" ? (
                  <p className="mt-4 text-xs font-bold leading-6 text-emerald-900">
                    正式模式：唔需要 Google OAuth consent；只要相關 Google Sheets 已分享俾以上 Service Account，就可以長期自動同步。
                  </p>
                ) : (
                  <p className="mt-4 text-xs font-bold leading-6 text-amber-900">
                    OAuth Testing 只適合驗證流程；Google Test User 授權會定期失效。正式營運會改用 Service Account。
                  </p>
                )}
              </section>

              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-black text-slate-950">每日最短流程</p>
                <ol className="mt-4 space-y-3 text-sm font-bold leading-6 text-slate-700">
                  <li>1. 按 Sync All / 自動收表單</li>
                  <li>2. 系統去重、分類、補資料、生成草稿</li>
                  <li>3. 你只睇 exception / 待審</li>
                  <li>4. Approve → Website publish</li>
                  <li>5. 同一資料 → News + Social Draft</li>
                </ol>
              </section>
            </aside>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-purple-700">External Sources</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Google Drive / Forms / Sheets</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Supabase = Source of Truth</span>
              </div>
              <div className="mt-5 space-y-3">
                {summary.sources.length ? summary.sources.map(source=>(
                  <article key={source.id||source.source_key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-900">{source.display_name||source.source_key}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{source.source_type} · {source.sheet_name||"—"} · {source.sync_mode||"manual"}</p>
                      </div>
                      <span className={"rounded-full px-2.5 py-1 text-[10px] font-black "+(source.last_sync_status==="success"?"bg-emerald-100 text-emerald-700":"bg-slate-200 text-slate-600")}>
                        {source.last_sync_status||"NOT SYNCED"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Last sync: {formatTime(source.last_sync_at)}</p>
                    {source.last_sync_message?<p className="mt-2 text-xs font-semibold text-slate-600">{source.last_sync_message}</p>:null}
                    {source.source_url?<a href={source.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-black text-purple-700">打開來源 ↗</a>:null}
                  </article>
                )):<div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm font-semibold text-slate-500">套用 Data Hub migration 後會顯示已登記資料來源。</div>}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <Link href="/admin/content" className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="font-black text-rose-950">News / Feature</p>
                  <p className="mt-1 text-xs leading-5 text-rose-800">整版圖片專題、活動介紹、攻略、Sponsored Feature。</p>
                </Link>
                <Link href="/admin/promotions" className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-black text-amber-950">Promotion Banner</p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">Hero 後、首頁中段、Events、News、Article inline。</p>
                </Link>
                <Link href="/admin/social" className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <p className="font-black text-violet-950">AI Social Factory</p>
                  <p className="mt-1 text-xs leading-5 text-violet-800">由已核實 Event / News 生成社交草稿。</p>
                </Link>
              </div>
            </section>
          </div>
        </>:null}
      </section>
    </main>
  );
}
