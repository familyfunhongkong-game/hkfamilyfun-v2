"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const client = supabase;

    if (!client) {
      setMessage("系統暫時未能連接帳戶服務，請稍後再試。");
      return;
    }

    setSubmitting(true);

    const { error: signInError } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setSubmitting(false);
      setMessage("電郵或密碼不正確。");
      return;
    }

    const { data: isAdmin, error: adminError } =
      await client.rpc("is_platform_admin");

    if (adminError || isAdmin !== true) {
      await client.auth.signOut();
      setSubmitting(false);
      setMessage("此帳戶沒有 HK Family Fun 管理員權限。");
      return;
    }

    setSubmitting(false);
    router.replace("/admin/events");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-black text-purple-700">
            HK Family Fun Admin
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            管理員登入
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            只供已獲授權的平台管理員使用。權限會由 Supabase 資料庫再次驗證。
          </p>

          {message ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
              {message}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                管理員電郵
              </span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                密碼
              </span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "正在驗證權限…" : "登入 Admin"}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link
              href="/merchant/login"
              className="font-bold text-slate-500 hover:text-purple-700"
            >
              商戶登入
            </Link>
            <Link
              href="/"
              className="font-bold text-purple-700 hover:text-purple-900"
            >
              返回 HK Family Fun
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
