"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Totals = { visitors:number; sessions:number; pageViews:number; eventViews:number; ctaClicks:number };
type Trend = { date:string; visitors:number; sessions:number; pageViews:number; eventViews:number; ctaClicks:number };
type Row = { label:string; views:number; clicks?:number };
type EventRow = { id:string; title:string; category:string; district:string; views:number; clicks:number };
type PageRow = { path:string; views:number };
type Summary = {
  totals: Totals;
  trend: Trend[];
  topPages: PageRow[];
  topEvents: EventRow[];
  categories: Row[];
  districts: Row[];
  devices: Row[];
  referrers: Row[];
};

const empty: Summary = {
  totals:{visitors:0,sessions:0,pageViews:0,eventViews:0,ctaClicks:0},
  trend:[],topPages:[],topEvents:[],categories:[],districts:[],devices:[],referrers:[]
};

const ranges = [
  {key:"today",label:"今日"},
  {key:"7d",label:"7日"},
  {key:"30d",label:"30日"},
  {key:"month",label:"本月"},
  {key:"year",label:"今年"},
] as const;

function startFor(range:string){
  const now=new Date();
  if(range==="today"){ const d=new Date(); d.setHours(0,0,0,0); return d; }
  if(range==="7d") return new Date(now.getTime()-6*86400000);
  if(range==="30d") return new Date(now.getTime()-29*86400000);
  if(range==="month") return new Date(now.getFullYear(),now.getMonth(),1);
  return new Date(now.getFullYear(),0,1);
}

function Metric({label,value,sub}:{label:string;value:number;sub?:string}){
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[.12em] text-slate-400">{label}</p>
    <p className="mt-2 text-3xl font-black text-slate-950">{value.toLocaleString()}</p>
    {sub?<p className="mt-1 text-xs font-bold text-slate-500">{sub}</p>:null}
  </div>;
}

function Bars({rows}:{rows:Row[]}){
  const max=Math.max(1,...rows.map(r=>r.views));
  return <div className="space-y-3">{rows.length?rows.map((r,i)=><div key={r.label+i}>
    <div className="mb-1 flex items-center justify-between gap-3 text-xs">
      <span className="truncate font-bold text-slate-700">{r.label}</span>
      <span className="shrink-0 font-black text-slate-500">{r.views.toLocaleString()}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-purple-600" style={{width:`${Math.max(4,(r.views/max)*100)}%`}} /></div>
  </div>):<p className="text-sm text-slate-400">暫時未有數據。</p>}</div>;
}

function TrendChart({rows}:{rows:Trend[]}){
  const max=Math.max(1,...rows.map(r=>r.pageViews));
  return <div className="flex h-56 items-end gap-1 rounded-2xl bg-slate-50 p-4">
    {rows.length?rows.map((r)=><div key={r.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end">
      <div title={`${r.date}: ${r.pageViews} page views`} className="w-full rounded-t-md bg-purple-600/80" style={{height:`${Math.max(4,(r.pageViews/max)*100)}%`}} />
      <span className="mt-2 hidden text-[9px] font-bold text-slate-400 xl:block">{r.date.slice(5)}</span>
    </div>):<div className="m-auto text-sm text-slate-400">正式公開後會開始累積流量。</div>}
  </div>;
}

export default function AnalyticsPage(){
  const [range,setRange]=useState("30d");
  const [data,setData]=useState<Summary>(empty);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [exporting,setExporting]=useState<"summary"|"events"|null>(null);
  const [exportError,setExportError]=useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    if (!supabase) {
      setError("Supabase client 未初始化。");
      setLoading(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError("Admin 登入已失效，請重新登入。");
      setData(empty);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/analytics?start=${encodeURIComponent(startFor(range).toISOString())}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "未能讀取 Analytics。");
      setData((body.data as Summary) || empty);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "未能讀取 Analytics。");
      setData(empty);
    }
    setLoading(false);
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = useCallback(async (type: "summary" | "events") => {
    if (exporting) return;
    setExportError("");
    setExporting(type);
    try {
      if (!supabase) throw new Error("登入服務未能連接。");
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Admin 登入已失效，請重新登入。");

      const params = new URLSearchParams({
        type,
        start: startFor(range).toISOString(),
      });
      const response = await fetch(`/api/admin/analytics/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(result.error || "CSV 匯出失敗，請稍後再試。");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = type === "events"
        ? `hkff-site-analytics-events-${range}-${date}.csv`
        : `hkff-analytics-summary-${range}-${date}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : "CSV 匯出失敗。");
    } finally {
      setExporting(null);
    }
  }, [range, exporting]);

  const ctr=useMemo(()=>data.totals.eventViews?((data.totals.ctaClicks/data.totals.eventViews)*100).toFixed(1):"0.0",[data]);

  return <main className="min-h-screen bg-slate-50">
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[1500px] px-4 py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-sm font-black text-purple-700">Admin Analytics</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">網站流量與活動表現</h1>
          <p className="mt-2 text-sm text-slate-500">匿名 first-party analytics，不儲姓名、Email、電話或 raw IP。</p></div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">{ranges.map(r=><button key={r.key} onClick={()=>setRange(r.key)} className={`rounded-full px-4 py-2 text-sm font-black ${range===r.key?"bg-purple-700 text-white":"border border-slate-300 bg-white text-slate-600"}`}>{r.label}</button>)}</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={exporting!==null} onClick={()=>void exportCsv("summary")}
                className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-bold text-purple-900 hover:bg-purple-100 disabled:opacity-60">
                {exporting==="summary"?"匯出中…":"下載流量摘要 CSV"}
              </button>
              <button type="button" disabled={exporting!==null} onClick={()=>void exportCsv("events")}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-60">
                {exporting==="events"?"匯出中…":"下載詳細事件 CSV"}
              </button>
            </div>
            <p className="max-w-md text-xs leading-5 text-slate-500">依上方日期範圍匯出 Excel 可開啟的 UTF-8 CSV。詳細紀錄不包含訪客 ID 或 Session ID；每次上限 20,000 筆，避免不完整下載。</p>
          </div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[1500px] space-y-6 px-4 py-7">
      {exportError?<div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{exportError}</div>:null}
      {error?<div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>:null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Visitors" value={data.totals.visitors}/><Metric label="Sessions" value={data.totals.sessions}/>
        <Metric label="Page Views" value={data.totals.pageViews}/><Metric label="Event Views" value={data.totals.eventViews}/>
        <Metric label="CTA Clicks" value={data.totals.ctaClicks}/><Metric label="CTR" value={Number(ctr)} sub="% Event View → CTA"/>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">流量趨勢</h2><span className="text-xs font-bold text-slate-400">{loading?"更新中…":"Hong Kong time"}</span></div>
        <TrendChart rows={data.trend}/>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-black">熱門活動</h2>
          <div className="space-y-3">{data.topEvents.length?data.topEvents.map((e,i)=><div key={e.id} className="rounded-2xl bg-slate-50 p-4">
            <div className="flex gap-3"><span className="font-black text-purple-700">#{i+1}</span><div className="min-w-0 flex-1"><Link className="font-black text-slate-900 hover:text-purple-700" href={`/admin/events/${e.id}`}>{e.title}</Link><p className="mt-1 text-xs text-slate-500">{e.category} · {e.district}</p></div><div className="text-right text-xs font-bold text-slate-500"><p>{e.views} views</p><p>{e.clicks} clicks</p></div></div>
          </div>):<p className="text-sm text-slate-400">暫時未有活動流量。</p>}</div>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-black">熱門頁面</h2><Bars rows={data.topPages.map(p=>({label:p.path,views:p.views}))}/></section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-black">活動類別</h2><Bars rows={data.categories}/></section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-black">地區</h2><Bars rows={data.districts}/></section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-black">裝置</h2><Bars rows={data.devices}/></section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-black">流量來源</h2><Bars rows={data.referrers}/></section>
      </div>
    </section>
  </main>;
}
