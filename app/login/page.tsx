"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Mode = "login" | "register" | "forgot" | "update";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get("mode");
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorText, setErrorText] = useState("");
  const [signedInEmail, setSignedInEmail] = useState("");

  useEffect(() => {
    const desired: Mode = requestedMode === "register" || requestedMode === "forgot" || requestedMode === "update"
      ? requestedMode : "login";
    setMode(desired);
    setErrorText("");
    setNotice("");
  }, [requestedMode]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    void client.auth.getUser().then(({ data }) => {
      if (active) setSignedInEmail(data.user?.email || "");
    });
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setSignedInEmail(session?.user?.email || "");
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setErrorText("");
    setNotice("");
    if (!supabase) { setErrorText("帳戶服務暫時無法使用，請稍後重試。"); return; }
    if ((mode === "register" || mode === "update") && (password.length < 8 || password !== confirmPassword)) {
      setErrorText("密碼必須至少 8 個字元，兩次輸入亦必須一致。");
      return;
    }
    if (mode === "register" && !accepted) {
      setErrorText("請先同意使用條款及私隱政策。");
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: { account_type: "parent", display_name: name.trim() },
          },
        });
        if (error) throw error;
        setPassword("");
        setConfirmPassword("");
        // Supabase can return an obfuscated existing user. Never expose whether an address exists.
        setNotice(data.user?.identities?.length === 0
          ? "如電郵已登記，請直接登入或使用忘記密碼功能。"
          : "登記已提交。請查看收件箱及垃圾郵件，點擊驗證連結後返回會員登入。");
      } else if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          setErrorText(error.message.toLowerCase().includes("email not confirmed")
            ? "請先完成電郵確認。如未收到電郵，請檢查垃圾郵件。"
            : "未能登入，請檢查電郵及密碼。");
          return;
        }
        if (data.user?.user_metadata?.account_type === "merchant") {
          await supabase.auth.signOut();
          setErrorText("這是商戶帳戶，請使用商戶登入入口。");
          return;
        }
        router.replace("/favorites");
        router.refresh();
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/login?mode=update`,
        });
        if (error) throw error;
        setNotice("如帳戶存在，密碼重設連結將發送到你的電郵。");
      } else {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          setErrorText("重設連結無效或已過期，請重新申請。");
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setNotice("密碼已更新。你可以繼續使用會員帳戶。");
        setPassword("");
        setConfirmPassword("");
      }
    } catch {
      setErrorText("無法完成操作。請檢查輸入資料或稍後再試；如已註冊，請使用登入或重設密碼。");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (error) { setErrorText("登出失敗，請稍後再試。"); return; }
    setSignedInEmail("");
    router.refresh();
  }

  const inputClass = "mt-1 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100";
  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-slate-50 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-lg rounded-3xl border border-purple-100 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-sm font-extrabold text-purple-700">HK Family Fun · 家長會員</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          {mode === "register" ? "免費建立會員帳戶" : mode === "forgot" ? "重設會員密碼" : mode === "update" ? "設定新密碼" : "家長會員登入"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          家長可免費搜尋及瀏覽活動，毋須登入。會員註冊亦完全免費。
        </p>
        {signedInEmail && mode !== "update" ? (
          <div className="mt-6 rounded-2xl border border-purple-100 bg-purple-50 p-4">
            <p className="break-all text-sm font-semibold text-slate-700">已登入：{signedInEmail}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/favorites" className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-bold text-white">查看收藏活動</Link>
              <button type="button" onClick={() => void logout()} disabled={busy} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">登出</button>
            </div>
          </div>
        ) : null}

        {mode === "login" || mode === "register" ? (
          <nav aria-label="會員登入或註冊" className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            {(["login", "register"] as const).map((item) => (
              <Link key={item} href={item === "login" ? "/login" : "/login?mode=register"}
                aria-current={mode === item ? "page" : undefined}
                className={`rounded-lg px-4 py-3 text-center text-sm font-black ${mode === item ? "bg-white text-purple-800 shadow-sm" : "text-slate-600 hover:text-purple-700"}`}>
                {item === "login" ? "會員登入" : "免費註冊"}
              </Link>
            ))}
          </nav>
        ) : null}
        {notice ? <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">{notice}</div> : null}
        {errorText ? <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">{errorText}</div> : null}

        {(!signedInEmail || mode === "update") && !notice ? (
          <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
            {mode === "register" ? <label className="block text-sm font-bold text-slate-700">顯示名稱（選填）
              <input className={inputClass} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoComplete="nickname" placeholder="家長名稱" />
            </label> : null}
            {mode !== "update" ? <label className="block text-sm font-bold text-slate-700">電郵地址
              <input className={inputClass} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label> : null}
            {mode !== "forgot" ? <label className="block text-sm font-bold text-slate-700">{mode === "update" ? "新密碼" : "密碼"}
              <input className={inputClass} type="password" required minLength={mode === "login" ? undefined : 8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            </label> : null}
            {(mode === "register" || mode === "update") ? <label className="block text-sm font-bold text-slate-700">再次輸入密碼
              <input className={inputClass} type="password" minLength={8} required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </label> : null}
            {mode === "register" ? <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <input type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-4 w-4 accent-purple-700" />
              <span>我已閱讀並同意 <Link href="/terms" target="_blank" className="font-bold text-purple-700 underline">使用條款</Link> 及 <Link href="/privacy" target="_blank" className="font-bold text-purple-700 underline">私隱政策</Link>。</span>
            </label> : null}
            <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-purple-700 px-5 py-3 text-base font-black text-white hover:bg-purple-800 disabled:opacity-50">
              {busy ? "處理中…" : mode === "register" ? "免費建立帳戶" : mode === "forgot" ? "發送重設連結" : mode === "update" ? "更新密碼" : "會員登入"}
            </button>
          </form>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-4 text-sm font-bold">
          {mode === "login" ? <Link href="/login?mode=forgot" className="text-purple-700 underline">忘記密碼？</Link> : null}
          {mode === "forgot" || mode === "update" ? <Link href="/login" className="text-purple-700 underline">返回會員登入</Link> : null}
          <Link href="/events" className="text-slate-600 underline">毋須登入，直接睇活動</Link>
        </div>
        <div className="mt-7 border-t border-slate-200 pt-5 text-sm text-slate-600">
          你係活動主辦方？ <Link href="/merchant/account?mode=register" className="font-bold text-purple-700 underline">商戶免費登記</Link>
        </div>
      </div>
    </main>
  );
}
