"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const client = supabase;
    if (!client) {
      setErrorMessage("系統暫時未能連接帳戶服務，請稍後再試。");
      return;
    }

    setIsSubmitting(true);

    // Keep using the already-tested recovery endpoint so the existing
    // Supabase redirect allowlist continues to apply. The return context
    // only changes portal branding/navigation after recovery.
    const redirectTo =
      window.location.origin + "/merchant/update-password?return=admin";

    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage("暫時未能發送重設密碼電郵，請稍後再試。");
      return;
    }

    setSuccessMessage(
      "如帳戶存在，我們已發送重設密碼連結到你的電郵。請檢查收件箱及垃圾郵件。",
    );
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
