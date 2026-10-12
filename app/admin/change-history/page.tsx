"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Change = {
 id: string;
 entity_type: "merchant" | "event";
 entity_id: string;
 merchant_id: string | null;
 actor_user_id: string | null;
 action: string;
 old_status: string | null;
 new_status: string | null;
 changed_fields: string[];
 summary: string;
 created_at: string;
};

const actionNames: Record<string, string> = {
 created: "建立", updated: "修改資料", submitted: "提交審批",
 status_changed: "更改狀態", deleted: "刪除"
};

export default function ChangeHistory() {
 const [rows, setRows] = useState<Change[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [type, setType] = useState("all");
 const [search, setSearch] = useState("");
 async function refresh() {
   if (!supabase) { setError("無法連接資料庫。"); setLoading(false); return; }
   setLoading(true);
   const { data, error } = await supabase.from("merchant_change_history")
     .select("id,entity_type,entity_id,merchant_id,actor_user_id,action,old_status,new_status,changed_fields,summary,created_at")
     .order("created_at", { ascending: false }).limit(500);
   setError(error?.message || "");
   setRows((data || []) as Change[]);
   setLoading(false);
 }
 useEffect(() => { void refresh(); }, []);
 const shown = useMemo(() => rows.filter(r =>
   (type === "all" || r.entity_type === type) &&
   (!search || [r.summary,r.entity_id,r.merchant_id,r.actor_user_id,...(r.changed_fields || [])]
     .join(" ").toLowerCase().includes(search.trim().toLowerCase()))
 ), [rows,type,search]);
 return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
  <div className="mx-auto max-w-6xl">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><p className="text-sm font-bold text-purple-700">HK Family Fun Admin</p>
     <h1 className="mt-1 text-3xl font-black">商戶及活動變更歷史</h1>
     <p className="mt-2 text-sm text-slate-600">記錄商戶資料、活動建立、修改、提交及審批狀態變更。顯示最近 500 筆；資料不會因標記已讀而消失。</p></div>
    <div className="flex gap-2"><Link href="/admin/notifications" className="rounded-xl border bg-white px-4 py-3 text-sm font-bold">通知中心</Link>
    <button onClick={() => void refresh()} className="rounded-xl bg-purple-700 px-4 py-3 text-sm font-bold text-white">更新紀錄</button></div>
   </div>
   <div className="mt-6 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:grid-cols-[180px_1fr]">
    <select aria-label="選擇紀錄類型" value={type} onChange={e=>setType(e.target.value)} className="rounded-xl border px-3 py-3">
     <option value="all">所有紀錄</option><option value="merchant">商戶</option><option value="event">活動</option>
    </select>
    <input aria-label="搜尋變更歷史" value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜尋商戶、活動或修改欄位" className="rounded-xl border px-4 py-3"/>
   </div>
   {error ? <p className="mt-4 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p> : null}
   {loading ? <p className="mt-8">正在載入紀錄…</p> : <section className="mt-5 space-y-3">
    <p className="text-sm font-semibold text-slate-600">顯示 {shown.length} 筆紀錄</p>
    {shown.length===0 ? <div className="rounded-2xl bg-white p-8 text-slate-600">暫時沒有符合條件的紀錄。</div> : shown.map(r=>
     <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap justify-between gap-3">
       <div><div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-purple-100 px-3 py-1 text-purple-800">{r.entity_type==="merchant"?"商戶":"活動"}</span><span className="rounded-full bg-slate-100 px-3 py-1">{actionNames[r.action]||r.action}</span></div>
       <h2 className="mt-3 font-black">{r.summary.split("｜")[0]}</h2>
       {r.changed_fields?.length ? <p className="mt-2 text-sm text-slate-600">修改欄位：{r.changed_fields.join("、")}</p> : null}
       {r.old_status!==r.new_status ? <p className="mt-1 text-sm text-slate-600">狀態：{r.old_status||"—"} → {r.new_status||"—"}</p> : null}
       <p className="mt-2 text-xs text-slate-500">操作者：{r.actor_user_id || "系統"} · {new Date(r.created_at).toLocaleString("zh-HK",{timeZone:"Asia/Hong_Kong"})}</p></div>
       <Link className="self-start rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white" href={r.entity_type==="merchant"?"/admin/merchants":`/admin/events/${r.entity_id}`}>查看{r.entity_type==="merchant"?"商戶":"活動"}</Link>
      </div>
     </article>)}
   </section>}
  </div>
 </main>;
}
