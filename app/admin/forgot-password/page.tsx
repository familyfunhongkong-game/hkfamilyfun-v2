"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isStaging = typeof window !== "undefined" &&
    window.location.hostname.startsWith("hkfamilyfun-staging");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setErrorMessage("");
    setSuccessMessage("");

    const client = supabase;
    if (!client) {
      setErrorMessage("系統暫時未能連接帳戶服務，請稍後再試。");
      return;
    }

    setIsSubmitting(true);
    try {
      // A stable environment URL, not the random Vercel Preview hostname:
      // recovery URLs must be present in the Auth redirect allowlist.
      const configuredSite = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
      const base = isStaging
        ? "https://hkfamilyfun-staging.vercel.app"
        : configuredSite.startsWith("https://")
          ? new URL(configuredSite).origin
          : window.location.origin;
      // Do not append "?return=admin" here: exact redirect allowlists can
      // reject the extra query string and silently fall back to Site URL.
      const redirectTo = base + "/merchant/update-password";
      const { error } = await client.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo },
      );
      if (error) {
        if (error.code === "email_address_not_authorized") {
          setErrorMessage("電郵服務未授權寄送至此地址，請管理員檢查 Supabase SMTP 設定。");
        } else if (error.status === 429) {
          setErrorMessage("重設申請太頻密，請稍後再試。");
        } else {
          setErrorMessage("暫時無法完成重設密碼申請，請稍後再試或聯絡管理員。");
        }
        return;
      }
      // Supabase deliberately returns success for unknown addresses.
      // Do not claim email delivery was verified from this response.
      setSuccessMessage(
        "申請已提交。如這個環境已有對應的登入帳戶，而且郵件服務正常，便會收到重設密碼連結。請檢查收件箱及垃圾郵件。",
      );
    } catch {
      setErrorMessage("連線發生問題，請重新整理頁面後再試。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-black text-purple-700">HK Family Fun Admin</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">重設 Admin 密碼</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            輸入已授權 Admin 帳戶電郵，我們會發送重設密碼連結。
          </p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-600">
            Admin Portal 仍然只使用電郵 + 密碼登入；重設密碼不會啟用 QR Code 或雙重認證。
          </div>
          {isStaging ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-6 text-amber-900">
              你正在使用 Staging 測試環境。測試環境與正式網站的登入帳戶完全分開；
              如果尚未在 Staging Supabase Auth 建立管理員測試帳戶，按「發送」亦不會收到重設郵件。
              請先由授權管理員建立測試帳戶及核對電郵設定。
            </div>
          ) : null}

          {errorMessage ? (
            <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
              {successMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Admin 電郵</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "發送中…" : "發送重設密碼電郵"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/admin/login" className="text-sm font-bold text-purple-700 hover:text-purple-900">
              返回 Admin 登入
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
