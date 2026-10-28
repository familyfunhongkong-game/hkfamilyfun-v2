"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ClaimEventPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id || "");
  const [title, setTitle] = useState("活動");
  const [userId, setUserId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [contactName, setContactName] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [explanation, setExplanation] = useState("");
  const [imageNote, setImageNote] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    if (!supabase) return;
    void Promise.all([
      supabase.auth.getUser(),
      supabase.from("events").select("title_tc,title").eq("id", id).maybeSingle(),
    ]).then(([auth, event]) => {
      if (!active) return;
      setUserId(auth.data.user?.id || "");
      const record = event.data as { title_tc?: string; title?: string } | null;
      setTitle(record?.title_tc || record?.title || "活動");
      setOfficialEmail(auth.data.user?.email || "");
    });
    return () => { active = false; };
  }, [id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!userId) { setMessage("請先登入商戶帳戶。"); return; }
    if (!rightsConfirmed) { setMessage("請先確認你有權代表該活動主辦單位。"); return; }
    setSending(true);
    if (!supabase) { setSending(false); setMessage("系統暫時未能連接，請稍後再試。"); return; }
    const { error } = await supabase.from("event_claim_requests").insert({
      event_id: id,
      claimant_user_id: userId,
      organization_name: organizationName.trim(),
      contact_name: contactName.trim(),
      official_email: officialEmail.trim(),
      evidence_url: evidenceUrl.trim() || null,
      explanation: explanation.trim(),
      image_note: imageNote.trim() || null,
      rights_confirmed: true,
    });
    setSending(false);
    if (error) {
      setMessage(error.code === "23505"
        ? "你已經提交認領申請，請等候審批。"
        : "提交未成功。請檢查資料，或電郵 info@hkfamilyfun.com 查詢。");
      return;
    }
    setSuccess(true);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <Link href={`/events/${id}`} className="text-sm font-bold text-purple-700">← 返回活動詳情</Link>
        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-black">認領活動・補充圖片</h1>
          <p className="mt-2 text-sm text-slate-600">活動：{title}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            如果你是活動主辦單位，可免費提交認領申請。HK Family Fun 核實身份後，
            會協助你補充 Poster、圖片及更新活動資訊。提交申請不會即時改動公開活動。
          </p>
          {!userId ? (
            <div className="mt-6 rounded-2xl bg-purple-50 p-4 text-sm">
              請先 <Link href="/merchant/login" className="font-bold text-purple-700 underline">登入商戶帳戶</Link>，
              或 <Link href="/merchant/register" className="font-bold text-purple-700 underline">免費註冊</Link>，再返回此頁申請。
            </div>
          ) : success ? (
            <div role="status" className="mt-6 rounded-2xl bg-emerald-50 p-5 font-bold text-emerald-800">
              認領申請已提交，現正等候 HK Family Fun 審核。正式核實前不會轉移編輯權限。
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              {[
                ["主辦機構名稱", organizationName, setOrganizationName, "text"],
                ["聯絡人姓名", contactName, setContactName, "text"],
                ["官方電郵", officialEmail, setOfficialEmail, "email"],
                ["官方活動連結／身份證明網址（選填）", evidenceUrl, setEvidenceUrl, "url"],
              ].map(([label, value, setter, type]) => (
                <label key={label as string} className="block text-sm font-bold">
                  {label as string}
                  <input type={type as string} value={value as string}
                    required={label !== "官方活動連結／身份證明網址（選填）"}
                    maxLength={type === "url" ? 1000 : 254}
                    onChange={e => (setter as (v:string)=>void)(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal focus:border-purple-500 focus:outline-none" />
                </label>
              ))}
              <label className="block text-sm font-bold">你與活動的關係／認領原因
                <textarea required minLength={12} maxLength={2000} value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  placeholder="例如：我是主辦機構負責人，可使用機構官方電郵確認身份。"
                  className="mt-1 block min-h-28 w-full rounded-xl border border-slate-300 p-3 font-normal" />
              </label>
              <label className="block text-sm font-bold">希望補充的圖片（選填）
                <textarea maxLength={1000} value={imageNote} onChange={e=>setImageNote(e.target.value)}
                  placeholder="描述需補充的海報或圖片。審批後可在商戶後台上傳原檔。"
                  className="mt-1 block min-h-20 w-full rounded-xl border border-slate-300 p-3 font-normal" />
              </label>
              <label className="flex items-start gap-3 text-sm leading-6">
                <input type="checkbox" checked={rightsConfirmed} onChange={e=>setRightsConfirmed(e.target.checked)} className="mt-1" required />
                <span>我確認有權代表主辦單位提出申請，並有權提供及授權使用相關活動圖片。</span>
              </label>
              {message && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{message}</p>}
              <button disabled={sending} type="submit" className="w-full rounded-2xl bg-purple-700 p-3.5 font-bold text-white disabled:opacity-50">
                {sending ? "提交中…" : "提交認領申請（免費）"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
