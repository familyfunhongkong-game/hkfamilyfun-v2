"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase/client";
type Proposal={id:string;event_id:string;image_url:string;note:string|null;status:string;created_at:string};
export default function ImageReviewPage(){
 const [authorized,setAuthorized]=useState(false);
 const [loading,setLoading]=useState(true);
 const [list,setList]=useState<Proposal[]>([]);
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const refresh=useCallback(async()=>{
  if(!supabase){setError("資料庫未設定");setLoading(false);return;}
  const check=await supabase.rpc("is_super_admin");
  if(check.error||check.data!==true){setError("只有管理員可審批圖片");setLoading(false);return;}
  setAuthorized(true);
  const r=await supabase.from("event_claim_image_proposals").select("id,event_id,image_url,note,status,created_at").order("created_at",{ascending:false}).limit(200);
  setError(r.error?.message||"");setList((r.data||[]) as Proposal[]);setLoading(false);
 },[]);
 useEffect(()=>{void refresh()},[refresh]);
 async function act(p:Proposal,approved:boolean){
  if(!supabase||busy)return;
  setBusy(p.id);setError("");
  const result=await supabase.rpc("review_event_claim_image",{p_id:p.id,p_approve:approved,p_note:notes[p.id]||null});
  setBusy("");
  if(result.error){setError(result.error.message);return;}
  await refresh();
 }
 return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900"><div className="mx-auto max-w-5xl">
  <Link href="/admin" className="text-sm font-bold text-purple-700">← Admin Dashboard</Link>
  <h1 className="mt-4 text-3xl font-black">認領活動圖片審批</h1>
  <p className="mt-2 text-sm text-slate-600">批准後才更新原活動封面。請先核對圖片與原活動相符、版權及內容準確性。</p>
  {error&&<p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm">{error}</p>}
  {loading?<p className="mt-5">正在載入…</p>:authorized&&list.length===0?<p className="mt-5">沒有圖片申請。</p>:null}
  {authorized&&<div className="mt-6 grid gap-5 sm:grid-cols-2">{list.map(p=><article key={p.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
   <div className="aspect-video bg-slate-100"><img src={p.image_url} alt="活動圖片審核預覽" className="h-full w-full object-contain"/></div>
   <div className="space-y-3 p-4">
    <span className="text-sm font-bold">{p.status==="pending"?"待審批":p.status==="approved"?"已批准":"已拒絕"}</span>
    {p.note&&<p className="text-sm">{p.note}</p>}
    <Link href={`/events/${p.event_id}`} target="_blank" className="block text-sm font-bold text-purple-700 underline">查看原活動</Link>
    {p.status==="pending"&&<>
     <textarea aria-label="審批備註" placeholder="審批備註" value={notes[p.id]||""} onChange={e=>setNotes(s=>({...s,[p.id]:e.target.value}))} className="w-full rounded-lg border p-2 text-sm"/>
     <div className="flex gap-2">
      <button disabled={!!busy} onClick={()=>void act(p,true)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">批准圖片</button>
      <button disabled={!!busy} onClick={()=>void act(p,false)} className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800 disabled:opacity-40">拒絕</button>
     </div></>}
   </div></article>)}</div>}
 </div></main>;
}