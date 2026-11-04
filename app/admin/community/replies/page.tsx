"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase/client";
type Reply={id:string;post_id:string;display_name:string;body:string;status:string;created_at:string};
export default function AdminCommunityRepliesPage(){
 const [rows,setRows]=useState<Reply[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [message,setMessage]=useState("");
 const [status,setStatus]=useState("pending");
 const load=useCallback(async()=>{
  if(!supabase){setMessage("未能連接資料庫");setLoading(false);return;}
  setLoading(true);const {data,error}=await supabase.from("community_tip_replies")
   .select("id,post_id,display_name,body,status,created_at").eq("status",status).order("created_at",{ascending:false}).limit(100);
  setRows((data??[]) as Reply[]);setMessage(error?"未能讀取留言，請檢查管理員權限及資料庫部署。":"");setLoading(false);
 },[status]);
 useEffect(()=>{void load()},[load]);
 async function review(row:Reply,decision:"approved"|"rejected"){
  if(!supabase||busy)return;
  if(!window.confirm(decision==="approved"?"確認公開呢則留言？":"確認拒絕呢則留言？"))return;
  setBusy(row.id);setMessage("");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setMessage("請重新登入 Admin");setBusy("");return;}
  const {data,error}=await supabase.from("community_tip_replies")
   .update({status:decision,reviewed_at:new Date().toISOString(),reviewed_by:user.id})
   .eq("id",row.id).eq("status","pending").select("id");
  if(error||!data?.length)setMessage("審批未完成，請重新整理。");
  else setRows(v=>v.filter(item=>item.id!==row.id));
  setBusy("");
 }
 return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-5xl">
  <Link href="/admin/community" className="text-sm font-bold text-purple-700">← 社區投稿管理</Link>
  <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">社區留言審批</h1><p className="mt-2 text-sm text-slate-600">審核公開回覆，避免垃圾訊息及公開兒童資料。</p></div>
  <button onClick={()=>void load()} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold">重新整理</button></div>
  <div className="mt-5 flex flex-wrap gap-2">{[{key:"pending",label:"待審批"},{key:"approved",label:"已批准"},{key:"rejected",label:"已拒絕"}].map(item=><button type="button" key={item.key} onClick={()=>setStatus(item.key)} className={`rounded-full px-4 py-2 text-sm font-bold ${status===item.key?"bg-purple-700 text-white":"bg-white text-slate-700 border border-slate-200"}`}>{item.label}</button>)}</div>
  {message&&<p role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{message}</p>}
  {loading?<p className="mt-5 text-sm">載入中...</p>:rows.length===0?<p className="mt-5 rounded-xl bg-white p-5 text-sm text-slate-600">暫時沒有此狀態留言。</p>:
  <div className="mt-5 grid gap-3">{rows.map(item=><article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5">
   <div className="text-xs text-slate-500"><strong className="text-slate-800">{item.display_name}</strong> · {new Date(item.created_at).toLocaleString("zh-HK",{timeZone:"Asia/Hong_Kong"})}</div>
   <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{item.body}</p>
   <p className="mt-2 text-xs text-slate-500">所屬投稿：{item.post_id}</p>
   {item.status==="pending"&&<div className="mt-4 flex gap-2"><button disabled={!!busy} onClick={()=>void review(item,"approved")} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">批准公開</button><button disabled={!!busy} onClick={()=>void review(item,"rejected")} className="rounded-full border border-rose-300 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-50">拒絕</button></div>}
  </article>)}</div>}
 </div></main>;
}
