"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Merchant = {
  id: string;
  owner_user_id: string;
  business_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website_url?: string | null;
  description?: string | null;
  status?: string | null;
};

export default function MerchantProfilePage() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const client = supabase;
    if (!client) {
      setMessage("Supabase 尚未初始化。");
      setLoading(false);
      return;
    }

    const { data: userData } = await client.auth.getUser();
    const user = userData.user;

    if (!user) {
      setMessage("請先登入 Merchant Portal。");
      setLoading(false);
      return;
    }

    const { data, error } = await client
      .from("merchants")
      .select("*")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      setMessage(error?.message || "找不到商戶資料。");
      setLoading(false);
      return;
    }

    const m = data as Merchant;
    setMerchant(m);
    setBusinessName(m.business_name || "");
    setContactName(m.contact_name || "");
    setContactPhone(m.contact_phone || "");
    setWebsiteUrl(m.website_url || "");
    setDescription(m.description || "");
    setLoading(false);
  }

  async function save() {
    if (!merchant || !supabase) return;

    if (!businessName.trim()) {
      setMessage("請輸入商戶／機構名稱。");
      return;
    }

    if (websiteUrl.trim()) {
      try {
        const parsed = new URL(websiteUrl.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("invalid");
        }
      } catch {
        setMessage("網站網址格式不正確，請以 https:// 開頭。");
        return;
      }
    }

    setSaving(true);
    setMessage("");

    const { data, error } = await supabase
      .from("merchants")
      .update({
        business_name: businessName.trim(),
        contact_name: contactName.trim() || null,
        contact_phone: contactPhone.trim() || null,
        website_url: websiteUrl.trim() || null,
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", merchant.id)
      .select("*")
      .single();

    if (error) {
      setMessage(`儲存失敗：${error.message}`);
    } else {
      setMerchant(data as Merchant);
      setMessage("商戶資料已儲存。");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center">
          正在讀取商戶資料...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/merchant/dashboard" className="text-sm font-black text-purple-700">
          ← 返回 Merchant Dashboard
        </Link>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-black text-purple-700">Business Profile</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">商戶資料</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            呢份資料只需設定一次。建立活動時會自動沿用主辦方資料；活動本身仍可另外填活動聯絡方式。
          </p>

          {merchant ? (
            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              帳戶狀態：<strong>{merchant.status || "pending"}</strong>
              <br />
              登入 Email：{merchant.contact_email || "未填"}
            </div>
          ) : null}

          {message ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {message}
            </div>
          ) : null}

          <div className="mt-6 space-y-5">
            <Field label="商戶／機構名稱 *" value={businessName} onChange={setBusinessName} />
            <Field label="聯絡人" value={contactName} onChange={setContactName} />
            <Field label="聯絡電話" value={contactPhone} onChange={setContactPhone} />
            <Field label="網站" type="url" value={websiteUrl} onChange={setWebsiteUrl} />

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">商戶簡介</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={1000}
                className="min-h-32 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                placeholder="簡單介紹機構、服務或活動類型。"
              />
            </label>

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !merchant}
              className="w-full rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800 disabled:bg-slate-300"
            >
              {saving ? "正在儲存..." : "儲存商戶資料"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
      />
    </label>
  );
}
