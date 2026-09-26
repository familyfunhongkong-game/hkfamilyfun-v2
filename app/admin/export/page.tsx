"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Row = Record<string, unknown>;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function todayHongKong(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function AdminExportPage() {
  const [events, setEvents] = useState<Row[]>([]);
  const [merchants, setMerchants] = useState<Row[]>([]);
  const [banners, setBanners] = useState<Row[]>([]);
  const [metrics, setMetrics] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  async function loadData() {
    const client = supabase;
    if (!client) {
      setErrorText("Supabase 尚未初始化。");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorText("");

    const [eventResult, merchantResult, bannerResult, metricResult] =
      await Promise.all([
        client.from("events").select("*").order("created_at", { ascending: true }),
        client.from("merchants").select("*").order("created_at", { ascending: true }),
        client.from("promo_banners").select("*").order("created_at", { ascending: true }),
        client.from("event_metrics_daily").select("*").order("metric_date", { ascending: true }),
      ]);

    const firstError =
      eventResult.error ||
      merchantResult.error ||
      bannerResult.error ||
      metricResult.error;

    if (firstError) {
      setErrorText(firstError.message || "讀取匯出資料失敗。");
      setLoading(false);
      return;
    }

    setEvents((eventResult.data || []) as Row[]);
    setMerchants((merchantResult.data || []) as Row[]);
    setBanners((bannerResult.data || []) as Row[]);
    setMetrics((metricResult.data || []) as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  const summary = useMemo(
    () => ({
      events: events.length,
      merchants: merchants.length,
      banners: banners.length,
      metricRows: metrics.length,
    }),
    [events, merchants, banners, metrics],
  );

  function exportEventsCsv() {
    if (!events.length) return;

    const columns = Array.from(
      new Set(events.flatMap((row) => Object.keys(row))),
    );
    const csv = [
      columns.map(csvCell).join(","),
      ...events.map((row) =>
        columns.map((column) => csvCell(row[column])).join(","),
      ),
    ].join("\r\n");

    downloadText(
      `hk-family-fun-events-${todayHongKong()}.csv`,
      "\uFEFF" + csv,
      "text/csv;charset=utf-8",
    );
  }

  function exportAllJson() {
    const payload = {
      exported_at: new Date().toISOString(),
      timezone: "Asia/Hong_Kong",
      events,
      merchants,
      promo_banners: banners,
      event_metrics_daily: metrics,
    };

    downloadText(
      `hk-family-fun-data-${todayHongKong()}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8",
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-7">
          <Link
            href="/admin"
            className="text-sm font-black text-purple-700 hover:text-purple-900"
          >
            ← 返回 Admin
          </Link>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-purple-700">
            Data Export
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
            匯出平台資料
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            CSV 適合活動清單核對；JSON 保留活動、商戶、Banner 及活動成效資料的完整結構。
            此頁只供已授權 Admin 使用。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-7">
        {errorText ? (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
            {errorText}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["活動", summary.events],
            ["商戶", summary.merchants],
            ["Banner", summary.banners],
            ["Analytics 日資料", summary.metricRows],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-black text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">下載</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            匯出檔只會在你的瀏覽器產生，不會建立公開下載連結。
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading || events.length === 0}
              onClick={exportEventsCsv}
              className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
            >
              匯出 Events CSV
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={exportAllJson}
              className="rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
            >
              匯出完整 JSON
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadData()}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 disabled:opacity-50"
            >
              {loading ? "讀取中..." : "重新整理"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
