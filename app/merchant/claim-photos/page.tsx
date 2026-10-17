"use client";
import { useCallback,useEffect,useState, type ChangeEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
type Claim={id:string;event_id:string;organization_name:string;status:string};
type Proposal={id:string;claim_id:string;event_id:string;image_url:string;status:string;created_at:string};
export default function ClaimPhotosPage(){
 const [claims,setClaims]=useState<Claim[]>([]);
 const [proposals,setProposals]=useState<Proposal[]>([]);
 const [active,setActive]=useState("");
 const [file,setFile]=useState<File|null>(null);
 const [note,setNote]=useState("");
 const [rights,setRights]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const load=useCallback(async()=>{
  if(!supabase)return;
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setMessage("請先登入商戶帳戶");return;}
  const [a,b]=await Promise.all([
   supabase.from("event_claim_requests").select("id,event_id,organization_name,status").eq("claimant_user_id",user.id).order("created_at",{ascending:false}),
   supabase.from("event_claim_image_proposals").select("id,claim_id,event_id,image_url,status,created_at").order("created_at",{ascending:false})
  ]);
  if(a.error||b.error){setMessage(a.error?.message||b.error?.message||"讀取失敗");return;}
  setClaims((a.data||[]) as Claim[]);setProposals((b.data||[]) as Proposal[]);
 },[]);
 useEffect(()=>{void load()},[load]);
 function choose(e:ChangeEvent<HTMLInputElement>){
  const f=e.target.files?.[0]||null;
  if(f&&(!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>5*1024*1024)){
   setMessage("只接受 JPG、PNG、WebP，檔案不可超過 5MB");setFile(null);return;
  }
  setFile(f);setMessage("");
 }
 async function submit(){
  if(!supabase||busy)return;
  const claim=claims.find(c=>c.id===active&&c.status==="approved");
  if(!claim||!file||!rights){setMessage("請選擇已核實活動、圖片及確認授權");return;}
  setBusy(true);setMessage("");
  try{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user)throw new Error("請先登入");
   const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
   const path=`${user.id}/${claim.id}/${crypto.randomUUID()}.${ext}`;
   const uploaded=await supabase.storage.from("event-claim-images").upload(path,file,{contentType:file.type,upsert:false});
   if(uploaded.error)throw uploaded.error;
   const url=supabase.storage.from("event-claim-images").getPublicUrl(path).data.publicUrl;
   const saved=await supabase.from("event_claim_image_proposals").insert({
    claim_id:claim.id,event_id:claim.event_id,submitted_by:user.id,image_url:url,
    copyright_confirmed:true,note:note.trim()||null
   });
   if(saved.error)throw saved.error;
   setMessage("圖片已提交，等待 HK Family Fun 審批後才會顯示。");
   setFile(null);setNote("");setRights(false);await load();
  }catch(e){setMessage(e instanceof Error?e.message:"提交失敗");}
  finally{setBusy(false);}
 }
 return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"><div className="mx-auto max-w-3xl">
  <Link href="/merchant/dashboard" className="font-bold text-purple-700">← 商戶後台</Link>
  <h1 className="mt-4 text-3xl font-black">認領活動・補充海報圖片</h1>
  <p className="mt-2 text-sm text-slate-600">活動認領通過後，主辦單位可在此上載官方圖片，HK Family Fun 批准後更新原有活動封面。</p>
  <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
   <label className="block text-sm font-bold">選擇已核實活動
    <select value={active} onChange={e=>setActive(e.target.value)} className="mt-2 w-full rounded-xl border p-3">
     <option value="">請選擇</option>{claims.filter(c=>c.status==="approved").map(c=><option key={c.id} value={c.id}>{c.organization_name} — {c.event_id}</option>)}
    </select>
   </label>
   {claims.length>0&&!claims.some(c=>c.status==="approved")&&<p className="mt-3 text-sm text-amber-700">認領申請仍待審核，批准後可上載圖片。</p>}
   <label className="mt-4 block text-sm font-bold">活動圖片（最大 5MB）
    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} className="mt-2 block w-full text-sm"/>
   </label>
   <label className="mt-4 block text-sm font-bold">補充說明
    <textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} className="mt-2 min-h-20 w-full rounded-xl border p-3"/>
   </label>
   <label className="mt-3 flex gap-2 text-sm"><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>本人確認擁有圖片使用及授權權利。</label>
   <button onClick={()=>void submit()} disabled={busy||!active||!file||!rights} className="mt-4 rounded-xl bg-purple-700 px-5 py-3 font-bold text-white disabled:opacity-40">提交圖片審批</button>
  </section>
  {message&&<p role="status" className="mt-4 rounded-xl bg-purple-50 p-3 text-sm">{message}</p>}
  <h2 className="mt-8 text-lg font-bold">提交紀錄</h2>
  <div className="mt-3 space-y-2">{proposals.map(p=><div key={p.id} className="rounded-xl border bg-white p-3 text-sm"><span className="font-bold">{p.status==="pending"?"待審核":p.status==="approved"?"已批准":"已拒絕"}</span> · <Link href={`/events/${p.event_id}`} className="text-purple-700 underline">查看活動</Link></div>)}</div>
 </div></main>
}