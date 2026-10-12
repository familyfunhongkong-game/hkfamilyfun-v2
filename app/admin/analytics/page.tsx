"use client";

import { useEffect, useMemo, useState } from "react";
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

  useEffect(()=>{ void load(); },[range]);

  async function load(){
    setLoading(true); setError("");
    if(!supabase){ setError("Supabase client 未初始化。"); setLoading(false); return; }
    const {data:result,error:e}=await supabase.rpc("admin_site_analytics_summary",{p_start:startFor(range).toISOString()});
    if(e){ setError(e.message); setData(empty); }
    else setData((result as Summary)||empty);
    setLoading(false);
  }

  const ctr=useMemo(()=>data.totals.eventViews?((data.totals.ctaClicks/data.totals.eventViews)*100).toFixed(1):"0.0",[data]);

  return <main className="min-h-screen bg-slate-50">
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[1500px] px-4 py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-sm font-black text-purple-700">Admin Analytics</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">網站流量與活動表現</h1>
          <p className="mt-2 text-sm text-slate-500">匿名 first-party analytics，不儲姓名、Email、電話或 raw IP。</p></div>
          <div className="flex flex-wrap gap-2">{ranges.map(r=><button key={r.key} onClick={()=>setRange(r.key)} className={`rounded-full px-4 py-2 text-sm font-black ${range===r.key?"bg-purple-700 text-white":"border border-slate-300 bg-white text-slate-600"}`}>{r.label}</button>)}</div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[1500px] space-y-6 px-4 py-7">
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
