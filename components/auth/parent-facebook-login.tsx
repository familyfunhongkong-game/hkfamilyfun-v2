"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { socialSignInAvailability } from "@/lib/merchant-google-provider";

// Match the existing Meta publication gate used by the merchant login.
// Provider enabled in Supabase does not mean that Meta has published the app.
const facebookPublished = process.env.NEXT_PUBLIC_FACEBOOK_LOGIN_LIVE === "true";

export default function ParentFacebookLogin() {
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [providerReady, setProviderReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setEmail(session?.user.email ?? null);
    });
    if (facebookPublished) {
      void socialSignInAvailability("facebook").then((status) => {
        if (active) setProviderReady(status === "enabled");
      });
    }
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function login() {
    if (!facebookPublished || !providerReady) {
      setError("Facebook 登入尚未正式開放，請稍後再試。");
      return;
    }
    if (!supabase) {
      setError("登入服務未設定，請聯絡網站管理員。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) setError("未能連接 Facebook，請稍後再試。");
    } catch {
      setError("Facebook 登入出現連線問題，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) setError("登出失敗，請再試一次。");
    } catch {
      setError("登出時出現連線問題，請再試一次。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5" aria-label="家長會員登入">
      <h2 className="text-lg font-bold text-slate-900">家長會員</h2>
      <p className="mt-2 text-sm text-slate-600">家長可免費瀏覽及收藏活動。Facebook 會員登入啟用後，無需另設密碼。</p>
      {email ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-800">已登入：{email}</p>
          <Link href="/favorites" className="inline-block rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white">查看收藏活動</Link>
          <button type="button" onClick={() => void logout()} disabled={busy} className="ml-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold disabled:opacity-50">登出</button>
        </div>
      ) : facebookPublished && providerReady ? (
        <button type="button" onClick={() => void login()} disabled={busy || !supabase} className="mt-4 w-full rounded-xl bg-[#1877F2] px-4 py-3 font-bold text-white hover:bg-[#1466d1] disabled:opacity-50">
          {busy ? "正在連接 Facebook…" : "使用 Facebook 繼續"}
        </button>
      ) : (
        <p className="mt-4 rounded-xl border border-blue-100 bg-white p-3 text-sm text-slate-600">Facebook 登入暫未公開；你仍可繼續搜尋及收藏活動。</p>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
