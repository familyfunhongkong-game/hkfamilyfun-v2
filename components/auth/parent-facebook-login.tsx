"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function ParentFacebookLogin() {
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  async function login() {
    if (!supabase) { setError("登入服務未設定，請聯絡網站管理員。"); return; }
    setBusy(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) { setError(authError.message); setBusy(false); }
  }
  async function logout() {
    if (!supabase) return;
    setBusy(true);
    const { error: authError } = await supabase.auth.signOut();
    if (authError) setError(authError.message);
    setBusy(false);
  }
  return (
    <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5" aria-label="家長會員登入">
      <h2 className="text-lg font-bold text-slate-900">家長會員</h2>
      <p className="mt-2 text-sm text-slate-600">使用 Facebook 登入，無需另設密碼。商戶及管理員請使用下方專用入口。</p>
      {email ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-800">已登入：{email}</p>
          <Link href="/favorites" className="inline-block rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white">查看收藏活動</Link>
          <button type="button" onClick={logout} disabled={busy} className="ml-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold disabled:opacity-50">登出</button>
        </div>
      ) : (
        <button type="button" onClick={login} disabled={busy || !supabase} className="mt-4 w-full rounded-xl bg-[#1877F2] px-4 py-3 font-bold text-white hover:bg-[#1466d1] disabled:opacity-50">
          {busy ? "正在連接 Facebook…" : "使用 Facebook 繼續"}
        </button>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
