"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

export default function MerchantForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const client = supabase;

    if (!client) {
      setErrorMessage("系統暫時未能連接帳戶服務，請稍後再試。");
      return;
    }

    setIsSubmitting(true);

    const redirectTo = `${window.location.origin}/merchant/update-password`;

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
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-primary-600">
            HK Family Fun Merchant Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">重設密碼</h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            輸入你的商戶帳戶電郵，我們會發送重設密碼連結。
          </p>

          {errorMessage ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "發送中…" : "發送重設密碼電郵"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            <Link
              href="/merchant/login"
              className="font-semibold text-primary-600 hover:text-primary-700"
            >
              返回商戶登入
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
