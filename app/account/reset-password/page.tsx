"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function ParentResetPasswordPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    // Automatic URL/session detection is enabled in the shared Supabase client.
    // Do NOT exchange one-time OAuth/recovery codes twice.
    void supabase.auth.getUser().then(({ data }) => {
      if (alive) setAuthenticated(Boolean(data.user));
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setAuthenticated(Boolean(session?.user));
    });
    return () => { alive = false; authListener.subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !authenticated) { setError("重設連結未通過驗證。請重新申請密碼重設電郵。"); return; }
    if (password.length < 10 || password.length > 72 || password !== confirm) {
      setError("密碼須為 10–72 個字元，而且兩次輸入必須相同。");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    const { error: failed } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (failed) setError("更新密碼失敗，請重新檢查連結是否已過期。");
    else { setPassword(""); setConfirm(""); setNotice("新密碼已設定，請返回會員登入。"); }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-black">家長會員｜重新設定密碼</h1>
        <p className="mt-2 text-sm text-slate-600">請由最新嘅重設電郵連結進入此頁。</p>
        {authenticated ? (
          <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
            <label className="block text-sm font-bold">新密碼
              <input required type="password" autoComplete="new-password" minLength={10} maxLength={72}
                value={password} onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 p-3"/>
            </label>
            <label className="block text-sm font-bold">確認新密碼
              <input required type="password" autoComplete="new-password" minLength={10} maxLength={72}
                value={confirm} onChange={(event) => setConfirm(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 p-3"/>
            </label>
            <button disabled={busy} className="w-full rounded-xl bg-purple-700 p-3 text-sm font-black text-white disabled:opacity-50">
              {busy ? "處理中…" : "更新密碼"}
            </button>
          </form>
        ) : (
          <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            未偵測到有效重設連結或登入狀態。請從最新電郵再次開啟。
          </p>
        )}
        {error ? <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p> : null}
        {notice ? <p role="status" className="mt-4 text-sm text-emerald-800">{notice}</p> : null}
        <Link href="/login" className="mt-5 inline-flex text-sm font-bold text-purple-700">返回會員登入</Link>
      </div>
    </main>
  );
}
