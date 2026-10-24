"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { socialSignInAvailability } from "@/lib/merchant-google-provider";

export default function MerchantLoginPanel() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);

  const signInWithSocial = async (provider: "google" | "facebook") => {
    if (socialLoading) return;
    const label = provider === "google" ? "Google" : "Facebook";
    setErrorMessage("");
    setSocialLoading(provider);
    try {
      const availability = await socialSignInAvailability(provider);
      if (availability !== "enabled") {
        setErrorMessage(
          availability === "disabled"
            ? `${label} 登入尚未啟用，請暫時使用電郵及密碼登入。`
            : `暫時未能核實 ${label} 登入設定，請稍後重試或使用電郵登入。`,
        );
        return;
      }
      if (!supabase) {
        setErrorMessage("登入服務暫時無法連線，請稍後重試。");
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/merchant/dashboard` },
      });
      if (error) {
        setErrorMessage(`${label} 登入未能啟動。請檢查登入設定或使用電郵及密碼登入。`);
      }
    } catch {
      setErrorMessage(`${label} 登入暫時未能使用，請稍後重試或使用電郵登入。`);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const client = supabase;

    if (!client) {
      setErrorMessage("登入服務暫時未能使用，請稍後再試。");
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
    <div className="w-full">
      <div className="mx-auto max-w-xl">
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

          <div className="mt-6 grid gap-3">
            <button type="button" disabled={socialLoading !== null}
              onClick={() => void signInWithSocial("google")}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-950 hover:bg-slate-50 disabled:opacity-60">
              <span aria-hidden="true" className="font-black text-blue-600">G</span>
              {socialLoading === "google" ? "正在連接 Google…" : "使用 Google 登入"}
            </button>
            <button type="button" disabled={socialLoading !== null}
              onClick={() => void signInWithSocial("facebook")}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-bold text-white hover:bg-[#166FE5] disabled:opacity-60">
              <span aria-hidden="true" className="text-lg font-black">f</span>
              {socialLoading === "facebook" ? "正在連接 Facebook…" : "使用 Facebook 登入"}
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">首次使用 Google 或 Facebook 登入，請登入後完成商戶登記。</p>
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
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="h-4 w-4 accent-purple-700" />
                顯示密碼
              </label>
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
              href="/merchant/account?mode=register"
              className="font-semibold text-primary-600 hover:text-primary-700"
            >
              免費登記
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
