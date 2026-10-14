"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { googleSignInAvailability } from "@/lib/merchant-google-provider";

export default function MerchantLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const signInWithGoogle = async () => {
    if (googleLoading) return;
    setErrorMessage("");
    setGoogleLoading(true);
    const status = await googleSignInAvailability();
    if (status !== "enabled") {
      setErrorMessage(status === "disabled"
        ? "Google 登入尚未啟用。請使用電郵及密碼登入，或等管理員完成 Google 設定。"
        : "暫時無法確認 Google 登入狀態。請稍後重試或使用電郵及密碼登入。");
      setGoogleLoading(false);
      return;
    }
    if (!supabase) {
      setErrorMessage("登入服務暫時未能連接。");
      setGoogleLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/merchant/dashboard` },
    });
    if (error) setErrorMessage("Google 登入未能啟動，請稍後重試或使用電郵登入。");
    setGoogleLoading(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const client = supabase;

    if (!client) {
      setErrorMessage("Supabase 尚未設定，請檢查系統連線設定。");
      return;
    }

    setIsSubmitting(true);

    const { error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setErrorMessage("請先到電郵信箱確認帳戶，再重新登入。");
        return;
      }

      setErrorMessage("電郵或密碼不正確。");
      return;
    }

    router.replace("/merchant/dashboard");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-primary-600">
            HK Family Fun Merchant Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">商戶登入</h1>

          <p className="mt-3 text-sm text-slate-600">
            管理你的活動草稿、圖片和提交審批狀態。
          </p>

          {errorMessage ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <button type="button" disabled={googleLoading} onClick={() => void signInWithGoogle()}
            className="mt-6 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-950 hover:bg-slate-50 disabled:opacity-60">
            {googleLoading ? "正在檢查 Google 登入…" : "使用 Google 登入"}
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">首次以 Google 登入，可登入後完成商戶登記。</p>
          <div className="mt-5 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-200" />或使用電郵及密碼<span className="h-px flex-1 bg-slate-200" /></div>
          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                電郵
              </span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                密碼
              </span>
              <input
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <div className="flex justify-end">
              <Link
                href="/merchant/forgot-password"
                className="text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                忘記密碼？
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "登入中…" : "登入 Merchant Portal"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            未有商戶帳戶？{" "}
            <Link
              href="/merchant/register"
              className="font-semibold text-primary-600 hover:text-primary-700"
            >
              免費登記
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
