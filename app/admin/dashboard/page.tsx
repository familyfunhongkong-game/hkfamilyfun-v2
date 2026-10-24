"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowUpRight, Bookmark,
  CalendarDays, ChartColumnIncreasing, Clock3, RefreshCw,
  ShieldCheck, Store, Users, UserRoundPlus,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Count = { label: string; count: number };
type Trend = {
  date: string; pageViews: number; accountSignups: number;
  merchantSignups: number; eventsCreated: number;
};
type Merchant = {
  id: string; business_name: string; status: string; contact_email: string | null;
  created_at: string; events: number;
};
type Account = { id: string; email: string | null; created_at: string; role: "audience" | "merchant" | "admin" };
type EventRow = {
  id: string; title: string; status: string; category: string;
  created_at: string; merchant_id: string | null;
};
type Dashboard = {
  checkedAt: string;
  period: string;
  reportRange?: {from:string;to:string;days:number};
  comparison?: {previousPeriod:string;current:Record<string,number|null>;previous:Record<string,number|null>;previousAnalyticsError?:string|null};
  totals: {
    accounts: number; audienceAccounts: number; adminAccounts: number;
    merchantAccounts: number; merchants: number; pendingMerchants: number;
    approvedMerchants: number; events: number; publishedEvents: number;
    draftEvents: number; reviewEvents: number; activePublished: number;
    freePublished: number; senPublished: number;
    newAccountsMonth: number; newMerchantsMonth: number;
    unreadNotifications: number | null;
  };
  analytics: {
    available: boolean; consentedOnly: boolean; error?: string;
    totals?: { visitors: number; sessions: number; pageViews: number; eventViews: number; ctaClicks: number };
    topPages?: Array<{ path: string; views: number }>;
    topEvents?: Array<{ id: string; title: string; views: number; clicks: number }>;
    devices?: Array<{ label: string; views: number }>;
    referrers?: Array<{ label: string; views: number }>;
  };
  categories: Count[]; allCategories: Count[]; districts: Count[];
  eventStatuses: Count[]; merchantStatuses: Count[];
  pricing: Count[]; trend: Trend[];
  merchants: Merchant[]; recentAccounts: Account[]; recentEvents: EventRow[];
  favorites: { available: boolean; reason: string };
};

function readableNumber(value: number | undefined | null) {
  return value === null || value === undefined ? "—" : value.toLocaleString("en-HK");
}
function shortDate(value: string) {
  const time = new Date(value);
  return Number.isFinite(time.getTime())
    ? new Intl.DateTimeFormat("zh-HK", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit" }).format(time)
    : "—";
}
function StatCard({
  title, value, note, icon: Icon, tone = "purple", href,
}: {
  title: string; value: number | null | undefined; note: string;
  icon: typeof Users; tone?: "purple" | "blue" | "pink" | "amber" | "emerald" | "slate";
  href?: string;
}) {
  const styles = {
    purple: "border-purple-200 bg-purple-50/70 text-purple-800",
    blue: "border-sky-200 bg-sky-50/70 text-sky-800",
    pink: "border-pink-200 bg-pink-50/70 text-pink-800",
    amber: "border-amber-200 bg-amber-50/70 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };
  const inner = <div className={`rounded-2xl border p-4 shadow-sm ${styles[tone]}`}>
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs font-bold tracking-wide">{title}</p>
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
    </div>
    <p className="mt-3 text-3xl font-black tabular-nums text-slate-950">{readableNumber(value)}</p>
    <p className="mt-1 min-h-8 text-xs leading-5 opacity-80">{note}</p>
  </div>;
  return href ? <Link href={href} className="group block transition hover:-translate-y-0.5" aria-label={title}>{inner}</Link> : inner;
}
function Panel({ title, subtitle, children, href, id }: {
  title: string; subtitle?: string; children: React.ReactNode; href?: string; id?: string;
}) {
  return <section id={id} className="min-w-0 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-5">
      <h2 className="text-lg font-black text-slate-950">
        {href ? <Link href={href} className="inline-flex items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700 text-purple-800 hover:underline">{title}<ArrowUpRight className="h-4 w-4" aria-hidden="true"/></Link> : title}
      </h2>
      {subtitle && <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>}
    </div>
    {children}
  </section>;
}
function GroupBars({ rows, tone = "purple" }: {
  rows: Count[]; tone?: "purple" | "emerald" | "sky" | "amber";
}) {
  const bars = { purple: "bg-purple-600", emerald: "bg-emerald-500", sky: "bg-sky-500", amber: "bg-amber-500" };
  const max = Math.max(1, ...rows.map(x => x.count));
  if (!rows.length) return <p className="text-sm text-slate-500">暫時沒有相關資料。</p>;
  return <div className="space-y-4">{rows.map(x => <div key={x.label}>
    <div className="mb-1.5 flex justify-between gap-2 text-xs">
      <span className="min-w-0 truncate font-semibold text-slate-700" title={x.label}>{x.label}</span>
      <strong className="tabular-nums text-slate-900">{x.count.toLocaleString()}</strong>
    </div>
    <div className="h-2.5 rounded-full bg-slate-100">
      <div className={`h-2.5 rounded-full ${bars[tone]}`}
        style={{ width: `${x.count === 0 ? 0 : Math.max(2, x.count / max * 100)}%` }} />
    </div>
  </div>)}</div>;
}
function ComparisonCard({ label, current, previous }: {label:string;current:number|null|undefined;previous:number|null|undefined}) {
  const value = typeof current==="number" ? current : null;
  const prior = typeof previous==="number" ? previous : null;
  const delta = value !== null && prior !== null ? value - prior : null;
  const percent = delta !== null && prior !== null && prior !== 0 ? (delta/prior)*100 : null;
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold text-slate-600">{label}</p>
    <p className="mt-2 text-2xl font-black tabular-nums text-slate-950">{value===null?"—":value.toLocaleString("zh-HK")}</p>
    <p className="mt-2 text-xs font-bold">
      {delta===null ? <span className="text-slate-500">歷史資料未能取得</span>
       : prior===0 ? <span className="text-slate-500">上期為 0，百分比不適用（變化 {delta>=0?"+":""}{delta}）</span>
       : <span className={delta>0?"text-emerald-700":delta<0?"text-rose-700":"text-slate-600"}>
          {delta>0?"+":""}{delta.toLocaleString("zh-HK")}（{percent!==null&&percent>0?"+":""}{percent?.toFixed(1)}%）
         </span>}
    </p>
    <p className="mt-1 text-[11px] text-slate-500">上期：{prior===null?"—":prior.toLocaleString("zh-HK")}</p>
  </div>;
}
const trendModes = [
  { key: "pageViews", label: "已同意 Page Views", color: "bg-purple-600" },
  { key: "accountSignups", label: "新帳戶", color: "bg-sky-500" },
  { key: "merchantSignups", label: "新商戶", color: "bg-amber-500" },
  { key: "eventsCreated", label: "新增活動", color: "bg-emerald-500" },
] as const;
type TrendKey = (typeof trendModes)[number]["key"];
function TrendBars({ rows, period }: { rows: Trend[]; period: string }) {
  const [series, setSeries] = useState<TrendKey>("pageViews");
  const max = Math.max(1, ...rows.map(x => x[series]));
  const colors: Record<TrendKey, string> = {
    pageViews: "bg-purple-600", accountSignups: "bg-sky-500",
    merchantSignups: "bg-amber-500", eventsCreated: "bg-emerald-500",
  };
  return <>
    <div className="mb-5 flex flex-wrap gap-2" aria-label="趨勢指標選擇">
      {trendModes.map(mode => <button type="button" key={mode.key}
        onClick={() => setSeries(mode.key)}
        aria-pressed={series === mode.key}
        className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${series === mode.key
          ? "border-purple-700 bg-purple-700 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-purple-300"}`}>
        {mode.label}
      </button>)}
    </div>
    <div className="flex h-52 items-end gap-1 rounded-2xl bg-slate-50 px-3 pb-2 pt-5 sm:gap-2" role="img"
      aria-label={`${period}${trendModes.find(m => m.key === series)?.label}柱狀圖`}>
      {rows.map((row, index) => <div key={row.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end">
        <span className="mb-1 text-[9px] font-bold text-slate-700 opacity-0 group-hover:opacity-100">{row[series]}</span>
        <div title={`${row.date}：${row[series]}`}
          className={`w-full rounded-t-md transition-all ${colors[series]}`}
          style={{ height: `${row[series] === 0 ? 2 : Math.max(6, row[series] / max * 168)}px`, opacity: row[series] ? 0.9 : 0.15 }} />
        <span className="mt-2 text-[9px] text-slate-500">{index % 5 === 0 || index === rows.length - 1 ? row.date.slice(5) : " "}</span>
      </div>)}
    </div>
    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full min-w-[580px] text-left text-xs">
        <thead className="bg-slate-50 text-slate-600"><tr>
          <th className="px-3 py-2">日期 (HK)</th>
          <th className="px-3 py-2 text-right">Page Views</th>
          <th className="px-3 py-2 text-right">新帳戶</th>
          <th className="px-3 py-2 text-right">新商戶</th>
          <th className="px-3 py-2 text-right">新增活動</th>
        </tr></thead>
        <tbody>{rows.slice().reverse().slice(0, 10).map(x => <tr key={x.date} className="border-t border-slate-100">
          <td className="px-3 py-2 font-medium">{x.date}</td>
          <td className="px-3 py-2 text-right tabular-nums">{x.pageViews}</td>
          <td className="px-3 py-2 text-right tabular-nums">{x.accountSignups}</td>
          <td className="px-3 py-2 text-right tabular-nums">{x.merchantSignups}</td>
          <td className="px-3 py-2 text-right tabular-nums">{x.eventsCreated}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}
const labels: Record<string,string> = {
  pending: "待審批", approved: "已批准", rejected: "已拒絕",
  suspended: "已暫停", published: "已發布", archived: "已封存",
  draft: "草稿", submitted: "已提交", requires_revision: "需修改",
  audience: "家長／一般用戶", merchant: "商戶", admin: "管理員",
};
function Status({ value }: { value: string }) {
  const tone = value === "approved" || value === "published"
    ? "bg-emerald-50 text-emerald-800"
    : value === "pending" || value === "draft" || value === "submitted"
      ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600";
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
    {labels[value] || value}
  </span>;
}

export default function GrowthDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [merchantFilter, setMerchantFilter] = useState("all");
  const [range, setRange] = useState("30");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [applied, setApplied] = useState({range:"30",from:"",to:""});

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      if (!supabase) throw new Error("登入服務尚未初始化。");
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("請先登入 Admin。");
      const params = new URLSearchParams({range:applied.range});
      if (applied.range === "custom") {params.set("from",applied.from);params.set("to",applied.to);}
      const response = await fetch(`/api/admin/dashboard?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "營運數據載入失敗。");
      setData(body as Dashboard);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "無法載入 Dashboard");
      setData(null);
    } finally {
      setBusy(false);
    }
  }, [applied]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    // The account table is rendered only after the authenticated data request.
    if (data && window.location.hash === "#recent-accounts") {
      window.requestAnimationFrame(() => document.getElementById("recent-accounts")?.scrollIntoView({block: "start"}));
    }
  }, [data]);
  const merchants = useMemo(() => data?.merchants.filter(m =>
    (merchantFilter === "all" || m.status === merchantFilter) &&
    (m.business_name + " " + (m.contact_email || "")).toLowerCase().includes(search.toLowerCase().trim())
  ) || [], [data, search, merchantFilter]);

  return <main className="min-h-screen bg-slate-50 pb-14">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[1500px] px-4 py-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/admin" className="text-xs font-bold text-purple-700 hover:underline">← Admin 營運中心</Link>
            <p className="mt-3 text-xs font-black uppercase tracking-widest text-purple-700">HK Family Fun · Business Intelligence</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">營運數據總覽</h1>
            <p className="mt-2 text-sm text-slate-600">會員增長、商戶、親子活動、審批和流量，一頁管理。全部使用正式資料庫。</p>
            {data && <p className="mt-2 text-xs text-slate-500">更新時間：{shortDate(data.checkedAt)} · 指標中的流量只包括已同意追蹤的訪客</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void load()} disabled={busy}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className="h-4 w-4" aria-hidden /> {busy ? "更新中…" : "重新整理"}
            </button>
            <Link href="/admin/analytics" className="flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-800">
              <ArrowDownToLine className="h-4 w-4" aria-hidden/> Analytics CSV
            </Link>
          </div>
        </div>
      </div>
    </header>

    <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-7">
      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-800">{error}</div>}
      {busy && <div role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">正在讀取真實統計資料…</div>}
      {data && <>
        {data.comparison && <section aria-label="與上一期間比較" className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-lg font-black text-slate-950">與上一期間比較</h2>
          <p className="mt-1 text-xs text-slate-600">本期：{data.period} ｜ 上期：{data.comparison.previousPeriod}（同長度、不重疊香港日曆日）</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <ComparisonCard label="Page Views（已同意追蹤）" current={data.comparison.current.pageViews} previous={data.comparison.previous.pageViews}/>
            <ComparisonCard label="不重複訪客（已同意追蹤）" current={data.comparison.current.visitors} previous={data.comparison.previous.visitors}/>
            <ComparisonCard label="新增帳戶" current={data.comparison.current.accounts} previous={data.comparison.previous.accounts}/>
            <ComparisonCard label="新商戶" current={data.comparison.current.merchants} previous={data.comparison.previous.merchants}/>
            <ComparisonCard label="新建立活動" current={data.comparison.current.events} previous={data.comparison.previous.events}/>
          </div>
          <p className="mt-3 text-xs text-slate-500">增長百分比 =（本期 − 上期）÷ 上期 × 100%；上期為零時不顯示百分比。帳戶／商戶／活動均按建立時間統計，不代表已批准或已公開。</p>
        </section>}
        <section aria-label="重要營運指標">
          <div className="mb-3 flex items-center gap-2"><Activity className="h-5 w-5 text-purple-700"/><h2 className="text-lg font-black">核心 KPI</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <StatCard title="已同意追蹤訪客" value={data.analytics.available ? data.analytics.totals?.visitors : null} note={`${data.period}；不等於全部訪客`} icon={ChartColumnIncreasing} tone="purple" href="/admin/analytics"/>
            <StatCard title="Page Views" value={data.analytics.available ? data.analytics.totals?.pageViews : null} note={`${data.period}；不包含未同意追蹤`} icon={Activity} tone="blue" href="/admin/analytics"/>
            <StatCard title="全部註冊帳戶" value={data.totals.accounts} note={`一般用戶 ${data.totals.audienceAccounts} · 商戶 ${data.totals.merchantAccounts} · Admin ${data.totals.adminAccounts}`} icon={Users} tone="emerald" href="/admin/dashboard#recent-accounts"/>
            <StatCard title="商戶總數" value={data.totals.merchants} note={`已批准 ${data.totals.approvedMerchants} · 待審 ${data.totals.pendingMerchants}`} icon={Store} tone="amber" href="/admin/merchants"/>
            <StatCard title="活動總數" value={data.totals.events} note={`已發布 ${data.totals.publishedEvents} · 草稿 ${data.totals.draftEvents}`} icon={CalendarDays} tone="pink" href="/admin/events"/>
            <StatCard title="待審商戶" value={data.totals.pendingMerchants} note="需管理員批准" icon={Clock3} tone="amber" href="/admin/merchants?status=pending"/>
            <StatCard title="待審活動" value={data.totals.reviewEvents} note="已提交／需修改" icon={ShieldCheck} tone="slate" href="/admin/events?status=submitted"/>
            <StatCard title="目前有效已發布活動" value={data.totals.activePublished} note="依香港今天日期及活動日期" icon={CalendarDays} tone="emerald" href="/admin/events?status=published"/>
            <StatCard title="本月新註冊帳戶" value={data.totals.newAccountsMonth} note="按香港月份" icon={UserRoundPlus} tone="blue" href="/admin/dashboard#recent-accounts"/>
            <StatCard title="未讀 Admin 通知" value={data.totals.unreadNotifications} note="待處理訊息" icon={Activity} tone="pink" href="/admin/notifications"/>
          </div>
        </section>
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 lg:col-span-2">
            <Bookmark className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"/>
            <div><h3 className="font-black text-amber-900">收藏（Saved Events）目前未能統計全站總數</h3>
              <p className="mt-1 text-xs leading-6 text-amber-900">{data.favorites.reason}</p>
            </div>
          </section>
          <section className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
            <p className="text-sm font-black text-purple-900">本月商戶增長</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{data.totals.newMerchantsMonth.toLocaleString()}</p>
            <p className="text-xs text-purple-800">本月新建商戶帳戶</p>
          </section>
        </div>
        {!data.analytics.available && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          流量模組暫不可用：{data.analytics.error || "請稍後再試"}。其他營運數據不受影響。
        </div>}

        <section aria-label="數據日期範圍" className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm font-bold text-slate-800">分析期間</span>
            {([{key:"7",label:"7日"},{key:"30",label:"30日"},{key:"90",label:"90日"},{key:"365",label:"1年"},{key:"custom",label:"自訂日期"}]).map(option=>
              <button key={option.key} type="button" onClick={()=>{setRange(option.key);if(option.key!=="custom")setApplied({range:option.key,from:"",to:""});}}
                aria-pressed={range===option.key}
                className={`rounded-full border px-3 py-2 text-xs font-bold ${range===option.key?"border-purple-700 bg-purple-700 text-white":"border-slate-200 bg-white text-slate-700"}`}>{option.label}</button>)}
          </div>
          {range==="custom" && <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-xs font-bold text-slate-700">開始日期<input aria-label="開始日期" type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 p-2"/></label>
            <label className="text-xs font-bold text-slate-700">結束日期<input aria-label="結束日期" type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 p-2"/></label>
            <button type="button" disabled={!dateFrom||!dateTo||dateFrom>dateTo} onClick={()=>setApplied({range:"custom",from:dateFrom,to:dateTo})} className="rounded-lg bg-purple-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">套用日期</button>
          </div>}
          <p className="mt-3 text-xs text-slate-500">目前顯示：{data.period}。流量及增長趨勢按此範圍；歷史總數與目前狀態不受期間篩選。</p>
        </section>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2"><Panel href="/admin/analytics" title={`增長趨勢 · ${data.period}`} subtitle="香港日曆日；可切換流量／註冊／商戶／新增活動">
            <TrendBars rows={data.trend} period={data.period}/>
          </Panel></div>
          <Panel href="/admin/events" title="活動審批漏斗" subtitle="全部歷史活動狀態，包括封存及未發布">
            <GroupBars rows={data.eventStatuses} tone="purple"/>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/admin/events" className="text-sm font-bold text-purple-700 hover:underline">查看所有活動 <ArrowUpRight className="inline h-4 w-4"/></Link>
            </div>
          </Panel>
        </div>

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          <Panel href="/admin/events?status=published" title="已發布活動類別" subtitle="類別比例以目前 Published 活動計算"><GroupBars rows={data.categories}/></Panel>
          <Panel href="/admin/events?status=published" title="已發布活動地區" subtitle="熱門地區活動供應分布"><GroupBars rows={data.districts} tone="sky"/></Panel>
          <Panel href="/admin/merchants" title="商戶審批分布" subtitle="Approved／Pending／Rejected／Suspended"><GroupBars rows={data.merchantStatuses} tone="amber"/></Panel>
          <Panel href="/admin/events?status=published" title="免費及其他活動" subtitle={`已發布活動：免費 ${data.totals.freePublished} · SEN 標籤 ${data.totals.senPublished}`}>
            <GroupBars rows={data.pricing} tone="emerald"/>
          </Panel>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel href="/admin/merchants" title="最新商戶名單" subtitle="顯示最近 25 個商戶；全部名單及審批請到商戶中心">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="搜尋商戶名稱或電郵" aria-label="搜尋商戶"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400"/>
              <select value={merchantFilter} onChange={e => setMerchantFilter(e.target.value)}
                aria-label="商戶狀態" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="all">全部狀態</option><option value="pending">待審批</option>
                <option value="approved">已批准</option><option value="rejected">已拒絕</option>
                <option value="suspended">已暫停</option>
              </select>
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[450px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">商戶</th><th className="p-3">狀態</th><th className="p-3 text-right">活動數</th><th className="p-3">註冊日期</th></tr></thead>
              <tbody>{merchants.map(m => <tr className="border-t border-slate-100" key={m.id}>
                <td className="max-w-[200px] px-3 py-3"><Link href={`/admin/merchants?merchant_id=${encodeURIComponent(m.id)}#merchant-list`} className="block truncate font-bold text-purple-800 hover:underline focus-visible:outline-2" title={`管理商戶：${m.business_name}`}>{m.business_name}</Link><p className="truncate text-slate-500">{m.contact_email || "沒有電郵"}</p></td>
                <td className="px-3 py-3"><Status value={m.status}/></td>
                <td className="px-3 py-3 text-right font-bold tabular-nums">{m.events}</td>
                <td className="px-3 py-3 whitespace-nowrap text-slate-600">{shortDate(m.created_at)}</td>
              </tr>)}{!merchants.length && <tr><td colSpan={4} className="p-5 text-center text-slate-500">沒有符合條件的商戶。</td></tr>}</tbody>
            </table></div>
            <Link href="/admin/merchants" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-purple-700 hover:underline">進入商戶審批及完整名單 <ArrowUpRight className="h-4 w-4"/></Link>
          </Panel>
          <Panel id="recent-accounts" title="最新註冊帳戶" subtitle="Auth 實際帳戶；同一人多個 Google／Facebook 身分不會重複計算">
            <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">帳戶電郵</th><th className="p-3">身份分類</th><th className="p-3">建立日期</th></tr></thead>
              <tbody>{data.recentAccounts.map(a => <tr key={a.id} className="border-t border-slate-100">
                <td className="max-w-[230px] truncate px-3 py-3 font-semibold text-slate-800">{a.email || "未提供 Email"}</td>
                <td className="px-3 py-3"><Status value={a.role}/></td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{shortDate(a.created_at)}</td>
              </tr>)}{!data.recentAccounts.length && <tr><td colSpan={3} className="p-5 text-slate-500">尚未有註冊紀錄。</td></tr>}</tbody>
            </table></div>
            <p className="mt-4 text-xs leading-5 text-slate-500">此處只顯示最新帳戶紀錄；一般用戶目前沒有後台修改功能。商戶資料請到商戶中心，Admin 角色請由 Super Admin 管理。</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold">
              <Link href="/admin/merchants" className="text-purple-800 underline underline-offset-2">管理商戶 →</Link>
              <Link href="/admin/users" className="text-purple-800 underline underline-offset-2">Admin Users（需 Super Admin）→</Link>
            </div>
          </Panel>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel href="/admin/events" title="最新活動建立紀錄" subtitle="了解新建活動及草稿；完整資料請進入活動審批">
            <div className="overflow-x-auto"><table className="w-full min-w-[460px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">活動</th><th className="p-3">分類</th><th className="p-3">狀態</th><th className="p-3">建立</th></tr></thead>
              <tbody>{data.recentEvents.map(e => <tr key={e.id} className="border-t border-slate-100">
                <td className="max-w-[170px] px-3 py-3"><Link href={`/admin/events/${e.id}`} className="block truncate font-bold text-purple-700 hover:underline">{e.title}</Link></td>
                <td className="max-w-[115px] truncate px-3 py-3">{e.category}</td>
                <td className="px-3 py-3"><Status value={e.status}/></td>
                <td className="whitespace-nowrap px-3 py-3">{shortDate(e.created_at)}</td>
              </tr>)}</tbody>
            </table></div>
          </Panel>
          <Panel href="/admin/analytics" title="流量來源及熱門頁面" subtitle="僅反映已同意追蹤的訪客，非網站全部人流">
            {data.analytics.available ? <div className="grid gap-6 sm:grid-cols-2">
              <div><h3 className="mb-3 text-sm font-black text-slate-800">熱門頁面</h3>
                <GroupBars rows={(data.analytics.topPages || []).slice(0, 7).map(p => ({label:p.path,count:p.views}))} tone="purple"/>
              </div>
              <div><h3 className="mb-3 text-sm font-black text-slate-800">來源網站</h3>
                <GroupBars rows={(data.analytics.referrers || []).slice(0, 7).map(p => ({label:p.label,count:p.views}))} tone="sky"/>
              </div>
            </div> : <p className="text-sm text-amber-700">流量數據目前不可用，請稍後刷新。</p>}
            <Link href="/admin/analytics" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-purple-700 hover:underline">詳細流量分析及 CSV 下載 <ArrowUpRight className="h-4 w-4"/></Link>
          </Panel>
        </div>
      </>}
    </div>
  </main>;
}
