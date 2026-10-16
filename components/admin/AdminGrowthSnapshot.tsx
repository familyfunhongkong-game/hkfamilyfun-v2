"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Overview = {
  totals: {
    accounts: number;
    merchants: number;
    pendingMerchants: number;
    events: number;
    publishedEvents: number;
    unreadNotifications: number | null;
  };
  analytics: { available: boolean; totals?: { visitors: number } };
};
const metrics = [
  { key: "accounts", title: "註冊帳戶", tone: "bg-sky-50 text-sky-800 border-sky-200" },
  { key: "merchants", title: "商戶總數", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  { key: "events", title: "活動總數", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
] as const;

export default function AdminGrowthSnapshot() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!supabase) return;
        const { data: auth } = await supabase.auth.getSession();
        const token = auth.session?.access_token;
        if (!token) return;
        const response = await fetch("/api/admin/dashboard", {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
        });
        if (!response.ok) throw new Error("暫時未能讀取營運數據。");
        const result = await response.json() as Overview;
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError("數據暫時未能載入；可直接打開完整 Dashboard 重試。");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);
  return <section className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-purple-700">Business Dashboard</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">今日營運總覽</h2>
        <p className="mt-1 text-sm text-slate-600">訪客、用戶、商戶、活動及審批工作集中睇。</p>
      </div>
      <Link href="/admin/dashboard" className="rounded-xl bg-purple-700 px-5 py-2.5 text-center text-sm font-black text-white hover:bg-purple-800">
        查看完整圖表與名單 →
      </Link>
    </div>
    {error && <p className="mt-4 text-xs text-amber-800" role="status">{error}</p>}
    {!data && !error && <p className="mt-4 text-xs text-slate-500" role="status">正在讀取即時資料…</p>}
    {data && <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
        <p className="text-xs font-bold text-purple-800">已同意追蹤訪客（30 日）</p>
        <p className="mt-2 text-3xl font-black text-slate-950">
          {data.analytics.available ? data.analytics.totals?.visitors?.toLocaleString() : "—"}
        </p>
        <p className="mt-1 text-xs text-purple-700">不等於全部訪客</p>
      </div>
      {metrics.map(item => <div key={item.key} className={`rounded-2xl border p-4 ${item.tone}`}>
        <p className="text-xs font-bold">{item.title}</p>
        <p className="mt-2 text-3xl font-black text-slate-950">{data.totals[item.key].toLocaleString()}</p>
        <p className="mt-1 text-xs">
          {item.key === "merchants" ? `待審批 ${data.totals.pendingMerchants}`
            : item.key === "events" ? `已發布 ${data.totals.publishedEvents}` : "包含商戶及管理員"}
        </p>
      </div>)}
      <Link href="/admin/notifications" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 hover:border-rose-400">
        <p className="text-xs font-bold">未讀通知</p>
        <p className="mt-2 text-3xl font-black text-slate-950">{data.totals.unreadNotifications === null ? "—" : data.totals.unreadNotifications.toLocaleString()}</p>
        <p className="mt-1 text-xs">查看待辦事項 →</p>
      </Link>
    </div>}
  </section>;
}
