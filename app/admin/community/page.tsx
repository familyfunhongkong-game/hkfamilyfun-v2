"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Tip = {id:string;display_name:string;title:string;body:string;district:string;category:string;event_date:string|null;source_url:string|null;status:"pending"|"approved"|"rejected";created_at:string;reviewed_at:string|null};
type Filter = "pending"|"approved"|"rejected"|"all";
const tags:Record<Tip["status"],string>={pending:"待審批",approved:"已公開",rejected:"已拒絕"};
export default function AdminCommunityPage(){
  const [rows,setRows]=useState<Tip[]>([]);
  const [filter,setFilter]=useState<Filter>("pending");
  const [busy,setBusy]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const load=useCallback(async()=>{
    if(!supabase){setMessage("無法連接資料庫。");setLoading(false);return;}
    setLoading(true);
    let q=supabase.from("community_tips").select("id,display_name,title,body,district,category,event_date,source_url,status,created_at,reviewed_at").order("created_at",{ascending:false}).limit(100);
    if(filter!=="all")q=q.eq("status",filter);
    const {data,error}=await q;
    setRows((data||[]) as Tip[]);
    setMessage(error?"無法讀取社區投稿：請確認 Migration 及管理員權限已部署。":"");
    setLoading(false);
  },[filter]);
  useEffect(()=>{void load();},[load]);
  async function review(row:Tip,status:"approved"|"rejected"){
    if(!supabase)return;
    if(!window.confirm(status==="approved"?"確認公開呢則社區投稿？此動作不會建立正式活動。":"確認拒絕呢則投稿？"))return;
    setBusy(row.id);setMessage("");
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user){setMessage("登入狀態已失效，請重新登入。");setBusy(null);return;}
    const {data,error}=await supabase.from("community_tips").update({status,reviewed_at:new Date().toISOString(),reviewed_by:user.id}).eq("id",row.id).eq("status","pending").select("id");
    if(error||!data?.length)setMessage("審批失敗或帖文已經由其他管理員處理，請重新整理。");
    else setRows(current=>current.filter(item=>item.id!==row.id));
    setBusy(null);
  }
  return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950"><div className="mx-auto max-w-5xl">
    <div className="flex flex-wrap items-center gap-4"><Link href="/admin" className="text-sm font-bold text-purple-700">← 返回後台</Link><Link href="/admin/community/replies" className="text-sm font-bold text-purple-700 underline">管理社區留言 →</Link></div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black text-purple-700">Community Moderation</p><h1 className="mt-2 text-3xl font-black">社區報料審批</h1><p className="mt-2 text-sm text-slate-600">社區分享與官方活動資料分開。只有批准嘅投稿先會公開顯示。</p></div>
    <button type="button" onClick={()=>void load()} className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-bold">重新整理</button></div>
    <div className="mt-6 flex flex-wrap gap-2">{(["pending","approved","rejected","all"] as Filter[]).map(v=><button key={v} type="button" onClick={()=>setFilter(v)} className={`rounded-full px-4 py-2 text-sm font-bold ${filter===v?"bg-purple-700 text-white":"border border-slate-200 bg-white text-slate-700"}`}>{v==="all"?"全部":tags[v]}</button>)}</div>
    {message&&<p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{message}</p>}
    {loading?<p className="mt-6">載入中...</p>:rows.length===0?<p className="mt-6 rounded-2xl bg-white p-8 text-sm text-slate-600">目前沒有此類投稿。</p>:<div className="mt-6 grid gap-4">{rows.map(row=><article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="font-black text-slate-800">{row.display_name}</span><span>· {row.district}</span><span>· {row.category}</span><span>· {new Date(row.created_at).toLocaleString("zh-HK",{timeZone:"Asia/Hong_Kong"})}</span><span className="rounded-full bg-slate-100 px-2 py-1">{tags[row.status]}</span></div>
      <h2 className="mt-3 text-lg font-black">{row.title}</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{row.body}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">{row.event_date&&<span>日期：{row.event_date}</span>}{row.source_url&&<a href={row.source_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="font-bold text-blue-700 underline">查看原始連結 ↗</a>}</div>
      {row.status==="pending"&&<div className="mt-5 flex flex-wrap gap-3"><button disabled={busy===row.id} type="button" onClick={()=>void review(row,"approved")} className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">批准社區公開</button><button disabled={busy===row.id} type="button" onClick={()=>void review(row,"rejected")} className="rounded-full border border-rose-300 px-5 py-2 text-sm font-bold text-rose-700 disabled:opacity-50">拒絕</button></div>}
    </article>)}</div>}
  </div></main>;
}
