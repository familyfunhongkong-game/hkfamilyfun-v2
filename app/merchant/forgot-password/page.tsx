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

    if (!supabase) {
      setErrorMessage("ç³»çµ±æš«æ™‚æœªèƒ½é€£æŽ¥å¸³æˆ¶æœå‹™ï¼Œè«‹ç¨å¾Œå†è©¦ã€‚");
      return;
    }

    setIsSubmitting(true);
    const redirectTo = `${window.location.origin}/merchant/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage("æš«æ™‚æœªèƒ½ç™¼é€é‡è¨­å¯†ç¢¼é›»éƒµï¼Œè«‹ç¨å¾Œå†è©¦ã€‚");
      return;
    }

    setSuccessMessage("å¦‚å¸³æˆ¶å­˜åœ¨ï¼Œæˆ‘å€‘å·²ç™¼é€é‡è¨­å¯†ç¢¼é€£çµåˆ°ä½ çš„é›»éƒµã€‚è«‹æª¢æŸ¥æ”¶ä»¶ç®±åŠåžƒåœ¾éƒµä»¶ã€‚");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-primary-600">HK Family Fun Merchant Portal</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">é‡è¨­å¯†ç¢¼</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">è¼¸å…¥ä½ çš„å•†æˆ¶å¸³æˆ¶é›»éƒµï¼Œæˆ‘å€‘æœƒç™¼é€é‡è¨­å¯†ç¢¼é€£çµã€‚</p>

          {errorMessage ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
          ) : null}

          {successMessage ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">{successMessage}</div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">é›»éƒµ</span>
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
              {isSubmitting ? "ç™¼é€ä¸­â€¦" : "ç™¼é€é‡è¨­å¯†ç¢¼é›»éƒµ"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            <Link href="/merchant/login" className="font-semibold text-primary-600 hover:text-primary-700">è¿”å›žå•†æˆ¶ç™»å…¥</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
