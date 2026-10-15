"use client";

import Link from "next/link";
import MerchantCollectionNotice from "@/components/MerchantCollectionNotice";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { CURRENT_MERCHANT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from "@/lib/merchant-legal";

export default function MerchantCompleteRegistration() {
 const router = useRouter();
 const [email,setEmail] = useState("");
 const [businessName,setBusinessName] = useState("");
 const [contactName,setContactName] = useState("");
 const [contactPhone,setContactPhone] = useState("");
 const [websiteUrl,setWebsiteUrl] = useState("");
 const [accepted,setAccepted] = useState(false);
 const [loading,setLoading] = useState(true);
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState("");
 useEffect(() => {
  let active=true;
  (async()=>{
   if(!supabase){if(active){setError("暫時無法連接系統。");setLoading(false);}return;}
   const {data}=await supabase.auth.getUser();
   if(!active)return;
   if (!data.user){router.replace("/merchant/login");return;}
   setEmail(data.user.email || "");
   setContactName(String(data.user.user_metadata?.display_name || ""));
   setBusinessName(String(data.user.user_metadata?.business_name || ""));
   const {data:merchant}=await supabase.from("merchants").select("id").eq("owner_user_id",data.user.id).maybeSingle();
   if(merchant?.id){router.replace("/merchant/dashboard");return;}
   setLoading(false);
  })();
  return()=>{active=false;};
 },[router]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");
  if(!accepted || !businessName.trim() || !contactName.trim()){setError("請填寫必要資料及同意條款。");return;}
  if(!supabase){setError("系統暫時無法連接。");return;}
  setBusy(true);
  const {data}=await supabase.auth.getUser();
  if(!data.user?.email){setBusy(false);setError("登入已過期，請重新登入。");return;}
  const {error:insertError}=await supabase.from("merchants").insert({
   owner_user_id:data.user.id,
   business_name:businessName.trim(),
   contact_name:contactName.trim(),
   contact_email:data.user.email,
   contact_phone:contactPhone.trim() || null,
   website_url:websiteUrl.trim() || null,
   status:"pending",
   terms_accepted_at:new Date().toISOString(),
   terms_version:CURRENT_MERCHANT_TERMS_VERSION,
   privacy_accepted_at:new Date().toISOString(),
   privacy_version:CURRENT_PRIVACY_VERSION
  });
  setBusy(false);
  if(insertError){setError("未能建立商戶申請，請檢查資料或聯絡平台支援。");return;}
  router.replace("/merchant/dashboard");
 }
 if(loading)return <main className="mx-auto max-w-xl p-8">正在檢查你的帳戶…</main>;
 return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="mx-auto max-w-xl rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
  <p className="text-sm font-bold text-purple-700">HK Family Fun Merchant Portal</p>
  <h1 className="mt-2 text-3xl font-black">完成商戶登記</h1>
  <p className="mt-3 text-sm leading-6 text-slate-600">你已擁有經驗證的登入帳戶，毋須再次註冊或收取驗證 Email。請填寫商戶資料，提交管理員審批。</p>
  <p className="mt-3 rounded-xl bg-purple-50 px-4 py-3 text-sm font-bold text-purple-900">登入電郵：{email}</p>
  {error?<p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>:null}
  <div className="mt-5"><MerchantCollectionNotice /></div>
  <form onSubmit={submit} className="mt-6 space-y-5">
   <label className="block text-sm font-bold">商戶／機構名稱 *<input required value={businessName} onChange={e=>setBusinessName(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
   <label className="block text-sm font-bold">聯絡人姓名 *<input required value={contactName} onChange={e=>setContactName(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
   <label className="block text-sm font-bold">聯絡電話<input value={contactPhone} onChange={e=>setContactPhone(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
   <label className="block text-sm font-bold">商戶網站<input type="url" value={websiteUrl} onChange={e=>setWebsiteUrl(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
   <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="mt-1"/><span>我同意<Link href="/merchant-terms" target="_blank" className="mx-1 font-bold text-purple-700 underline">商戶條款</Link>及<Link href="/privacy" target="_blank" className="mx-1 font-bold text-purple-700 underline">私隱政策</Link>。</span></label>
   <button disabled={busy||!accepted} className="w-full rounded-xl bg-purple-700 px-5 py-4 font-bold text-white disabled:opacity-50">{busy?"正在提交…":"提交商戶審批"}</button>
  </form>
 </div></main>;
}
