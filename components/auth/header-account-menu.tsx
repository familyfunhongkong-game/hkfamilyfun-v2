"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { forgetLocalFavoritesOnLogout } from "@/lib/favorites/cloud-sync";

type Locale = "zh-Hant" | "zh-Hans" | "en";
const dictionary = {
  "zh-Hant": { login: "登入", account: "我的帳戶", parent: "家長登入／免費註冊", center: "會員中心／偏好", saved: "我的收藏", logout: "登出", loggingOut: "登出中…", merchant: "商戶登入", merchantRegister: "商戶免費登記", admin: "管理員登入", failed: "登出失敗，請稍後再試。" },
  "zh-Hans": { login: "登录", account: "我的账户", parent: "家长登录／免费注册", center: "会员中心／偏好", saved: "我的收藏", logout: "退出登录", loggingOut: "退出中…", merchant: "商户登录", merchantRegister: "商户免费登记", admin: "管理员登录", failed: "退出失败，请稍后重试。" },
  en: { login: "Sign in", account: "My account", parent: "Parent sign in / free account", center: "Account & preferences", saved: "Saved activities", logout: "Sign out", loggingOut: "Signing out…", merchant: "Merchant sign in", merchantRegister: "Free merchant registration", admin: "Admin sign in", failed: "Sign out failed. Please try again." },
} as const;

export default function HeaderAccountMenu({ locale }: { locale: Locale }) {
  const t = dictionary[locale];
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) { setChecking(false); return; }
    let active = true;
    void client.auth.getUser().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (!sessionError) setEmail(data.user?.email || "");
      setChecking(false);
    }).catch(() => { if (active) setChecking(false); });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setEmail(session?.user?.email || "");
      setChecking(false);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function logout() {
    const client = supabase;
    if (!client || busy) return;
    setBusy(true);
    setError("");
    const { error: logoutError } = await client.auth.signOut();
    if (logoutError) {
      setError(t.failed);
      setBusy(false);
      return;
    }
    forgetLocalFavoritesOnLogout();
    setEmail("");
    setBusy(false);
    if (menuRef.current) menuRef.current.open = false;
    router.replace("/");
    router.refresh();
  }

  const linkStyle = "block rounded-xl px-3 py-3 text-sm font-semibold text-slate-800 hover:bg-purple-50 hover:text-purple-700";
  return (
    <details ref={menuRef} className="group relative">
      <summary className="flex min-h-10 max-w-44 cursor-pointer list-none items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-purple-300 hover:text-purple-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700 [&::-webkit-details-marker]:hidden"
        aria-label={email ? t.account : t.login}>
        <span className="truncate">{checking ? t.login : email ? t.account : t.login}</span>
        <span aria-hidden="true" className="text-slate-400">⌄</span>
      </summary>
      <div className="absolute right-0 top-full z-[80] mt-2 w-64 max-w-[calc(100vw-1rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
        {email ? (
          <>
            <p className="break-all rounded-xl bg-purple-50 px-3 py-2 text-xs text-purple-900">{email}</p>
            <Link href="/account" className={linkStyle}>{t.center}</Link>
            <Link href="/favorites" className={linkStyle}>{t.saved}</Link>
            <button type="button" onClick={() => void logout()} disabled={busy}
              className="mt-1 block min-h-11 w-full rounded-xl border border-rose-200 px-3 py-2 text-left text-sm font-black text-rose-700 hover:bg-rose-50 disabled:opacity-50">
              {busy ? t.loggingOut : t.logout}
            </button>
            {error ? <p role="alert" className="px-2 py-2 text-xs text-rose-700">{error}</p> : null}
          </>
        ) : (
          <>
            <Link href="/login" className="block rounded-xl px-3 py-3 text-sm font-black text-purple-700 hover:bg-purple-50">{t.parent}</Link>
            <Link href="/account" className={linkStyle}>{t.center}</Link>
          </>
        )}
        <div className="my-1 border-t border-slate-100" />
        <Link href="/merchant/account?mode=login" className={linkStyle}>{t.merchant}</Link>
        <Link href="/merchant/account?mode=register" className={linkStyle}>{t.merchantRegister}</Link>
        <div className="my-1 border-t border-slate-100" />
        <Link href="/admin/login" className={linkStyle}>{t.admin}</Link>
      </div>
    </details>
  );
}
