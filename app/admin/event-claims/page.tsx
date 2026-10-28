"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Claim = {
  id: string; event_id: string; organization_name: string; contact_name: string;
  official_email: string; evidence_url: string | null; explanation: string;
  image_note: string | null; status: string; created_at: string; review_note: string | null;
};
export default function EventClaimsAdmin() {
  const [authorized,setAuthorized] = useState(false);
  const [loading,setLoading] = useState(true);
  const [claims,setClaims] = useState<Claim[]>([]);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState("");
  const [notes,setNotes] = useState<Record<string,string>>({});
  const refresh = useCallback(async () => {
    if (!supabase) { setError("資料庫未設定"); setLoading(false); return; }
    const { data: isAdmin, error: authError } = await supabase.rpc("is_super_admin");
    if (authError || isAdmin !== true) { setAuthorized(false);setError("只有管理員可以審批認領申請");setLoading(false);return; }
    setAuthorized(true);
    const { data, error: loadError } = await supabase.from("event_claim_requests")
      .select("id,event_id,organization_name,contact_name,official_email,evidence_url,explanation,image_note,status,created_at,review_note")
      .order("created_at",{ascending:false}).limit(200);
    setError(loadError?.message || "");
    setClaims((data || []) as Claim[]);
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); },[refresh]);
  async function review(claim:Claim,approve:boolean) {
    if (!supabase || busy) return;
    setBusy(claim.id);setError("");
    const { error: reviewError } = await supabase.rpc("review_event_claim",{
      p_claim_id:claim.id,p_approve:approve,p_review_note:notes[claim.id]||null
    });
    setBusy("");
    if (reviewError) { setError(reviewError.message);return; }
    await refresh();
  }
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-5xl">
      <Link href="/admin" className="text-sm font-semibold text-purple-700">← 返回管理後台</Link>
      <h1 className="mt-4 text-3xl font-black">活動認領申請審批</h1>
      <p className="mt-2 text-sm text-slate-600">先核實主辦單位身分，才考慮授權圖片和活動資料管理。批准申請並不自動轉移活動擁有權。</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {loading ? <p className="mt-6">正在載入…</p> : !authorized ? null : claims.length===0 ? <p className="mt-6">目前沒有認領申請。</p> :
      <div className="mt-6 space-y-4">{claims.map(claim=><section key={claim.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{claim.organization_name}</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{claim.status}</span>
        </div>
        <p className="mt-2 text-sm">聯絡人：{claim.contact_name} · {claim.official_email}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{claim.explanation}</p>
        {claim.image_note && <p className="mt-2 text-sm">補充圖片：{claim.image_note}</p>}
        {claim.evidence_url && /^https?:\/\//i.test(claim.evidence_url) &&
          <a className="mt-2 block break-all text-sm font-semibold text-purple-700 underline" href={claim.evidence_url} target="_blank" rel="noopener noreferrer">查看身份證明連結</a>}
        <Link href={`/events/${claim.event_id}`} className="mt-2 block text-sm font-semibold text-purple-700 underline">查看原活動</Link>
        {claim.status==="pending" && <div className="mt-4 space-y-3">
          <textarea aria-label="審批備註" placeholder="審批備註／核實方式" maxLength={1000} value={notes[claim.id]||""}
            onChange={e=>setNotes(v=>({...v,[claim.id]:e.target.value}))}
            className="w-full rounded-xl border border-slate-300 p-3 text-sm"/>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy===claim.id} onClick={()=>void review(claim,true)} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">已核實・批准申請</button>
            <button disabled={busy===claim.id} onClick={()=>void review(claim,false)} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-800 disabled:opacity-50">拒絕申請</button>
          </div>
        </div>}
      </section>)}</div>}
    </div>
  </main>;
}
