"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { forgetLocalFavoritesOnLogout, synchronizeCloudFavorites } from "@/lib/favorites/cloud-sync";

type Mode = "login" | "register";
export default function ParentEmailAccount() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [busy, setBusy] = useState(false);
  // SSR forms are visible before React hydrates. Prevent pre-hydration
  // native form submits that would navigate to /login? without authenticating.
  const [interactive, setInteractive] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    queueMicrotask(() => { if (live) setInteractive(true); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (alive) setMemberEmail(data.user?.email || "");
      if (alive && data.user) void synchronizeCloudFavorites();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setMemberEmail(session?.user?.email || "");
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setError("會員登入服務未設定。"); return; }
    if (password.length < 10 || password.length > 72) {
      setError("密碼須為 10 至 72 個字元。");
      return;
    }
    setBusy(true); setNotice(""); setError("");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (mode === "register") {
        const { data, error: failure } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: window.location.origin + "/login" },
        });
        if (failure) throw failure;
        setPassword("");
        if (data.session) {
          const result = await synchronizeCloudFavorites();
          setNotice(result.error ? "帳戶已建立，雲端收藏暫未同步：" + result.error : "已建立免費帳戶，收藏已同步。");
        } else {
          // Supabase intentionally returns a successful-looking response for an
          // already registered email. Never promise an email was actually sent.
          setNotice("如果這是新帳戶，請查看收件箱或垃圾郵件中的確認電郵。如你曾經註冊，此操作不會建立另一個帳戶，請改用「會員登入」或「忘記密碼」。");
        }
      } else {
        const { error: failure } = await supabase.auth.signInWithPassword({
          email: normalizedEmail, password,
        });
        if (failure) throw failure;
        setPassword("");
        const result = await synchronizeCloudFavorites();
        setNotice(result.error ? "已登入；雲端收藏暫時未能同步：" + result.error : "登入成功，雲端收藏已同步。");
      }
    } catch {
      setError(mode === "login"
        ? "登入失敗。請核對電郵、密碼及電郵確認狀態。"
        : "未能完成註冊。如已有帳戶，請直接登入。");
    } finally { setBusy(false); }
  }

  async function resendConfirmation() {
    if (!supabase || !email.trim()) {
      setError("請先輸入電郵地址。");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: failure } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: window.location.origin + "/login" },
      });
      if (failure) {
        setError(failure.message.toLowerCase().includes("rate limit") ||
          failure.message.toLowerCase().includes("seconds")
          ? "驗證郵件請求過於頻繁，請稍後再試。"
          : "暫時無法重新發送確認電郵，請稍後再試。如帳戶已驗證，請直接登入或重設密碼。");
      } else {
        setNotice("如果此電郵仍有待驗證，系統會重新寄出確認連結；如已完成驗證，請直接登入。請檢查垃圾郵件。");
      }
    } catch {
      setError("郵件服務暫時無法連線，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!supabase || !email.trim()) {
      setError("請先輸入需要重設密碼嘅電郵地址。");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    const { error: failure } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin + "/account/reset-password",
    });
    setBusy(false);
    if (failure) setError("重設郵件暫時無法發送，請稍後重試。");
    else setNotice("如帳戶存在，系統會寄出重設密碼郵件。請檢查收件箱及垃圾郵件夾。");
  }

  async function logout() {
    if (!supabase) return;
    setBusy(true); setError(""); setNotice("");
    const { error: failure } = await supabase.auth.signOut();
    if (failure) setError("登出失敗，請再試。");
    else {
      forgetLocalFavoritesOnLogout();
      setMemberEmail("");
      setNotice("已登出。此裝置嘅會員收藏快取已清除。");
    }
    setBusy(false);
  }

  return (
    <section className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm sm:p-7" aria-label="家長會員登入及免費註冊">
      <h2 className="text-xl font-black">家長免費會員</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">免費註冊，跨裝置保存活動收藏同搜尋偏好；瀏覽親子活動仍然毋須登入。</p>
      {memberEmail ? (
        <div className="mt-5 space-y-3">
          <p className="text-sm font-semibold text-emerald-800">已登入：{memberEmail}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/account" className="rounded-xl bg-purple-700 px-4 py-3 text-sm font-bold text-white">會員中心／偏好設定</Link>
            <Link href="/favorites" className="rounded-xl border border-purple-300 px-4 py-3 text-sm font-bold text-purple-800">我的收藏</Link>
            <button type="button" disabled={busy} onClick={() => void logout()} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold disabled:opacity-60">登出</button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 flex gap-2" role="tablist" aria-label="家長會員帳戶操作">
            {(["login", "register"] as const).map((option) => (
              <button key={option} type="button" role="tab" aria-selected={mode === option}
                onClick={() => { setMode(option); setError(""); setNotice(""); }}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${mode === option ? "bg-purple-700 text-white" : "bg-purple-50 text-purple-800"}`}>
                {option === "login" ? "會員登入" : "免費註冊"}
              </button>
            ))}
          </div>
          <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-3">
            <label className="block text-sm font-bold text-slate-700">
              電郵地址
              <input type="email" autoComplete="email" required value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base" placeholder="name@example.com"/>
            </label>
            <label className="block text-sm font-bold text-slate-700">
              密碼（至少 10 字元）
              <input type="password" minLength={10} maxLength={72}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                required value={password} onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base"/>
            </label>
            <button type="submit" disabled={busy || !interactive} className="w-full rounded-xl bg-purple-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
              {busy ? "處理中…" : mode === "login" ? "登入免費會員" : "建立免費帳戶"}
            </button>
          </form>
          {mode === "login" ? (
            <button type="button" disabled={busy} onClick={() => void resetPassword()}
              className="mt-3 text-sm font-bold text-purple-700 disabled:opacity-50">忘記密碼？發送重設電郵</button>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-xs leading-5 text-slate-500">建立會員帳戶代表同意網站服務條款及私隱政策，活動收藏只供本人帳戶使用。</p>
              <p className="text-xs leading-5 text-slate-600">已經註冊？請先按「會員登入」。如果未能登入，可以重設密碼；只有尚未確認的帳戶才會收到重新發送的驗證信。</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <button type="button" disabled={busy} onClick={() => { setMode("login"); setError(""); setNotice(""); }}
                  className="text-sm font-bold text-purple-700 underline disabled:opacity-50">返回會員登入／忘記密碼</button>
                <button type="button" disabled={busy} onClick={() => void resendConfirmation()}
                  className="text-sm font-bold text-slate-700 underline disabled:opacity-50">未收到信？重新發送驗證電郵</button>
              </div>
            </div>
          )}
        </>
      )}
      {notice ? (
        <div role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
          <p>{notice}</p>
          {mode === "register" ? (
            <button type="button" className="mt-2 font-bold underline" onClick={() => { setMode("login"); setNotice(""); setError(""); }}>
              已有帳戶？轉到會員登入／忘記密碼
            </button>
          ) : null}
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
    </section>
  );
}
