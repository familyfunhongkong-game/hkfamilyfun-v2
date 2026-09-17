"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

export default function MerchantLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!supabase) {
      setErrorMessage("Supabase å°šæœªè¨­å®šï¼Œè«‹æª¢æŸ¥ç³»çµ±é€£ç·šè¨­å®šã€‚");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setErrorMessage("è«‹å…ˆåˆ°é›»éƒµä¿¡ç®±ç¢ºèªå¸³æˆ¶ï¼Œå†é‡æ–°ç™»å…¥ã€‚");
        return;
      }
      setErrorMessage("é›»éƒµæˆ–å¯†ç¢¼ä¸æ­£ç¢ºã€‚");
      return;
    }

    router.replace("/merchant/dashboard");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-primary-600">HK Family Fun Merchant Portal</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">å•†æˆ¶ç™»å…¥</h1>
          <p className="mt-3 text-sm text-slate-600">ç®¡ç†ä½ çš„æ´»å‹•è‰ç¨¿ã€åœ–ç‰‡å’Œæäº¤å¯©æ‰¹ç‹€æ…‹ã€‚</p>

          {errorMessage ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
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

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">å¯†ç¢¼</span>
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
              <Link href="/merchant/forgot-password" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                å¿˜è¨˜å¯†ç¢¼ï¼Ÿ
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "ç™»å…¥ä¸­â€¦" : "ç™»å…¥ Merchant Portal"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            æœªæœ‰å•†æˆ¶å¸³æˆ¶ï¼Ÿ{" "}
            <Link href="/merchant/register" className="font-semibold text-primary-600 hover:text-primary-700">
              å…è²»ç™»è¨˜
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
