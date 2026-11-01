"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function FacebookAuthCallback() {
  const [status, setStatus] = useState("正在驗證登入…");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function complete() {
      if (!supabase) {
        if (active) setStatus("登入服務未設定。");
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const providerError = params.get("error") || fragment.get("error");
      if (providerError) {
        if (active) setStatus("登入未完成，請返回登入頁再試一次。");
        return;
      }

      // Our existing shared supabase-js browser client uses automatic OAuth
      // URL/session detection. Calling exchangeCodeForSession here as well
      // could consume the same one-time code twice, causing invalid_grant.
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!active) return;
        if (error || !data.user) {
          setStatus("無法完成登入，請返回登入頁重新嘗試。");
          return;
        }
        window.history.replaceState(null, "", "/auth/callback");
        setStatus("登入成功！");
        setSuccess(true);
      } catch {
        if (active) setStatus("登入服務暫時無法連線，請稍後再試。");
      }
    }

    void complete();
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">HK Family Fun 會員登入</h1>
      <p role="status" className="mt-4 text-slate-700">{status}</p>
      <div className="mt-6 flex gap-4">
        <Link href={success ? "/favorites" : "/login"} className="rounded-xl bg-purple-700 px-5 py-3 font-semibold text-white">
          {success ? "查看收藏活動" : "返回登入"}
        </Link>
        <Link href="/events" className="rounded-xl border border-slate-300 px-5 py-3 font-semibold">搜尋活動</Link>
      </div>
    </main>
  );
}
