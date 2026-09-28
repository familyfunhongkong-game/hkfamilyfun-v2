"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Check = {
  ready: boolean;
  label: string;
  detail: string;
};

type Health = {
  ok: boolean;
  readyCount: number;
  totalChecks: number;
  allReady: boolean;
  checks: Record<string, Check>;
};

export default function AdminSystemHealthPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadHealth() {
    setLoading(true);
    setError("");

    if (!supabase) {
      setError("Supabase client 未初始化。");
      setLoading(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setError("請先登入 Admin。");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/system-health", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const body = await response.json();

      if (!response.ok) {
        setError(body.error || "未能讀取系統狀態。");
        setLoading(false);
        return;
      }

      setHealth(body as Health);
    } catch {
      setError("未能連接 System Health API。");
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadHealth();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Link href="/admin" className="text-sm font-black text-purple-700">
            ← 返回 Admin
          </Link>
          <h1 className="mt-3 text-3xl font-black text-slate-950">
            System Health
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            只顯示必要服務是否已設定，不會顯示任何 API key、password 或 secret。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-500">Launch readiness</p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              {health ? `${health.readyCount} / ${health.totalChecks} services ready` : "Checking..."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadHealth()}
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700"
          >
            重新檢查
          </button>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-600">
            正在檢查...
          </div>
        ) : null}

        {health ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {Object.entries(health.checks).map(([key, item]) => (
              <article
                key={key}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-black text-slate-950">{item.label}</h2>
                  <span
                    className={
                      item.ready
                        ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
                        : "rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700"
                    }
                  >
                    {item.ready ? "READY" : "ACTION REQUIRED"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.detail}
                </p>
              </article>
            ))}
          </div>
        ) : null}

        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          Custom domain切換唔屬於自動health check。只有當功能、資料、Admin/Merchant流程同外部服務全部QA完成後，先切換 hkfamilyfun.com。
        </div>
      </section>
    </main>
  );
}
