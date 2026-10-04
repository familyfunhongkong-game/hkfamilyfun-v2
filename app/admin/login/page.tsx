"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function checkExistingSession() {
      const client = supabase;

      if (!client) {
        if (!ignore) setIsCheckingSession(false);
        return;
      }

      const {
        data: { user },
      } = await client.auth.getUser();

      if (!user) {
        if (!ignore) setIsCheckingSession(false);
        return;
      }

      const { data: isAdmin } = await client.rpc("is_platform_admin");

      if (ignore) return;

      if (isAdmin === true) {
        router.replace("/admin");
        return;
      }

      setIsCheckingSession(false);
    }

    void checkExistingSession();

    return () => {
      ignore = true;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const client = supabase;

    if (!client) {
      setErrorMessage("系統暫時未能連接帳戶服務，請稍後再試。");
      return;
    }

    setIsSubmitting(true);

    const { error: signInError } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setIsSubmitting(false);

      if (signInError.message.toLowerCase().includes("email not confirmed")) {
        setErrorMessage("請先到電郵信箱確認帳戶，再重新登入。");
        return;
      }

      setErrorMessage("電郵或密碼不正確。");
      return;
    }

    const { data: isAdmin, error: adminError } =
      await client.rpc("is_platform_admin");

    if (adminError || isAdmin !== true) {
      await client.auth.signOut();
      setIsSubmitting(false);
      setPassword("");
      setErrorMessage("此帳戶沒有 HK Family Fun Admin 權限。");
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-black text-purple-700">
            HK Family Fun Admin
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            管理員登入
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            使用已授權 Admin 帳戶的電郵及密碼登入。
          </p>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-600">
            此 Admin Portal 採用電郵 + 密碼登入，毋須 QR Code 或雙重認證。
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"
            >
              {errorMessage}
            </div>
          ) : null}

          {isCheckingSession ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              正在檢查登入狀態…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  電郵
                </span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  inputMode="email"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  密碼
                </span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />
              </label>

              <div className="flex items-center justify-between gap-3">
                <Link
                  href="/merchant/forgot-password"
                  className="text-sm font-bold text-purple-700 hover:text-purple-900"
                >
                  忘記密碼？
                </Link>
                <span className="text-xs font-semibold text-slate-400">
                  Password only
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "驗證中…" : "登入 Admin Portal"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/events"
              className="text-sm font-bold text-slate-500 hover:text-slate-900"
            >
              返回公開網站
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
