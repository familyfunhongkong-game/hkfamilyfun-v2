"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase/client";
type Reply={id:string;display_name:string;body:string;created_at:string};
export default function CommunityReplies({postId}:{postId:string}){
 const [open,setOpen]=useState(false);
 const [replies,setReplies]=useState<Reply[]>([]);
 const [name,setName]=useState("");
 const [body,setBody]=useState("");
 const [loading,setLoading]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 useEffect(()=>{
  if(!open||!supabase)return;
  let active=true;const client=supabase;
  async function load(){
   setLoading(true);
   const {data,error:loadError}=await client.from("community_tip_replies")
     .select("id,display_name,body,created_at").eq("post_id",postId).eq("status","approved")
     .order("created_at",{ascending:true}).limit(100);
   if(active){setReplies((data??[]) as Reply[]);setError(loadError?"未能載入留言。":"");setLoading(false);}
  }
  void load();return()=>{active=false;};
 },[open,postId]);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");setSuccess("");
  if(!supabase)return;
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("請先登入免費會員再留言。");return;}
  if(!name.trim()||!body.trim()){setError("請填寫稱呼及留言。");return;}
  setSaving(true);
  const {error:writeError}=await supabase.from("community_tip_replies").insert({
   post_id:postId,author_id:user.id,display_name:name.trim(),body:body.trim(),status:"pending"
  });
  setSaving(false);
  if(writeError){setError("留言提交失敗，請檢查內容或稍後再試。");return;}
  setBody("");setSuccess("留言已提交，審核後會公開。");
 }
 return <div className="mt-3 border-t border-slate-100 pt-3">
  <button type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open}
   className="text-sm font-bold text-purple-700 underline underline-offset-2">{open?"收起留言":"查看留言／回覆"}</button>
  {open&&<div className="mt-3 space-y-3">
   {loading?<p className="text-sm text-slate-500">載入留言中...</p>:replies.length===0?<p className="text-sm text-slate-500">暫時未有公開留言。</p>:
    replies.map(r=><div key={r.id} className="rounded-xl bg-slate-50 p-3">
      <div className="flex flex-wrap gap-2 text-xs text-slate-500"><strong className="text-slate-800">{r.display_name}</strong><span>{new Date(r.created_at).toLocaleString("zh-HK",{timeZone:"Asia/Hong_Kong"})}</span></div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{r.body}</p>
     </div>)}
   <form onSubmit={submit} className="space-y-2">
    <label className="block text-sm font-bold text-slate-700">加入討論</label>
    <input aria-label="留言者名稱" className="w-full rounded-xl border border-slate-200 p-3 text-sm" maxLength={50} value={name} onChange={e=>setName(e.target.value)} placeholder="你的稱呼" required/>
    <textarea aria-label="留言內容" className="w-full rounded-xl border border-slate-200 p-3 text-sm" maxLength={1000} rows={3} value={body} onChange={e=>setBody(e.target.value)} placeholder="分享活動經驗、問時間、問費用..." required/>
    <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={saving} className="rounded-full bg-purple-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving?"提交中...":"提交留言"}</button><Link href="/login" className="text-xs text-slate-600 underline">登入／免費註冊</Link></div>
    <p className="text-xs text-slate-500">請勿分享兒童個人資料。留言經審批後公開。</p>
    {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
    {success&&<p role="status" className="text-sm text-emerald-700">{success}</p>}
   </form>
  </div>}
 </div>;
}
