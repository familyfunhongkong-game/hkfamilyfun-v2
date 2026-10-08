"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Check = {
  required: boolean;
  ready: boolean;
  label: string;
  detail: string;
};

type Cutover = {
  runtimeMode: "staging" | "live";
  runtimeHost: string;
  canonicalLiveUrl: string;
  buildSha: string | null;
  siteUrlLive: boolean;
  appUrlLive: boolean;
  apiUrlLive: boolean;
  adminDriveCallbackLive: boolean;
  calendarCallbackMode: "explicit" | "request-origin";
  configReady: boolean;
  liveServingRebuild: boolean;
};

type ContentQuality = {
  queryReady: boolean;
  publishedTotal: number;
  currentFutureTotal: number;
  missingImage: number;
  currentFutureMissingImage: number;
  missingPublishedAt: number;
  currentFutureCoreIncomplete: number;
  currentFutureGoogleEventReady: number;
  currentFutureMissingImageItems: Array<{
    id: string;
    title: string;
    startDate?: string | null;
    endDate?: string | null;
  }>;
  currentFutureCoreIncompleteItems: Array<{
    id: string;
    title: string;
    startDate?: string | null;
    endDate?: string | null;
    missing: string[];
  }>;
};

type Health = {
  ok: boolean;
  readyCount: number;
  totalChecks: number;
  requiredReadyCount: number;
  requiredTotalChecks: number;
  optionalReadyCount: number;
  optionalTotalChecks: number;
  allReady: boolean;
  cutover: Cutover;
  contentQuality: ContentQuality;
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

  const cutoverItems = health
    ? [
        { label: "NEXT_PUBLIC_SITE_URL", ready: health.cutover.siteUrlLive },
        { label: "NEXT_PUBLIC_APP_URL", ready: health.cutover.appUrlLive },
        { label: "NEXT_PUBLIC_API_URL", ready: health.cutover.apiUrlLive },
        {
          label: "Google Drive live callback",
          ready: health.cutover.adminDriveCallbackLive,
        },
      ]
    : [];

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
              {health
                ? `Core ${health.requiredReadyCount} / ${health.requiredTotalChecks} ready`
                : "Checking..."}
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
                        : item.required
                          ? "rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700"
                          : "rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700"
                    }
                  >
                    {item.ready
                      ? item.required
                        ? "READY"
                        : "OPTIONAL READY"
                      : item.required
                        ? "ACTION REQUIRED"
                        : "OPTIONAL / FALLBACK"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.detail}
                </p>
              </article>
            ))}
          </div>
        ) : null}

        {health ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-purple-700">Published Content Quality</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {health.contentQuality.currentFutureMissingImage === 0
                    ? "Current / Future 公開活動圖片完整"
                    : `${health.contentQuality.currentFutureMissingImage} 個 Current / Future 活動仍用 fallback 圖`}
                </h2>
              </div>
              <span
                className={
                  health.contentQuality.currentFutureMissingImage === 0
                    ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
                    : "rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700"
                }
              >
                {health.contentQuality.currentFutureCoreIncomplete === 0
                  ? "CONTENT READY"
                  : "CORE DATA FOLLOW-UP"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {[
                ["Published", health.contentQuality.publishedTotal],
                ["Current/Future", health.contentQuality.currentFutureTotal],
                ["Core incomplete", health.contentQuality.currentFutureCoreIncomplete],
                ["Google Event Ready", health.contentQuality.currentFutureGoogleEventReady],
                ["Current/Future 缺實圖", health.contentQuality.currentFutureMissingImage],
                ["缺 published_at", health.contentQuality.missingPublishedAt],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <p className="text-xs font-bold text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
                </div>
              ))}
            </div>

            {health.contentQuality.currentFutureCoreIncompleteItems.length ? (
              <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-black text-rose-900">
                  Current/Future 已發布活動仍缺核心資料
                </p>
                <div className="mt-3 space-y-2">
                  {health.contentQuality.currentFutureCoreIncompleteItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/admin/events/${item.id}`}
                      className="block rounded-2xl border border-rose-200 bg-white px-4 py-3 hover:bg-rose-50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-rose-950">{item.title}</span>
                        <span className="text-xs font-bold text-rose-700">
                          {item.startDate || "日期待定"}
                          {item.endDate && item.endDate !== item.startDate
                            ? ` → ${item.endDate}`
                            : ""}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-bold leading-5 text-rose-700">
                        缺少：{item.missing.join("、")}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {health.contentQuality.currentFutureMissingImageItems.length ? (
              <div className="mt-4 space-y-2">
                {health.contentQuality.currentFutureMissingImageItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/admin/events/${item.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm hover:bg-amber-100"
                  >
                    <span className="font-bold text-amber-950">{item.title}</span>
                    <span className="text-xs font-bold text-amber-700">
                      {item.startDate || "日期待定"}
                      {item.endDate && item.endDate !== item.startDate
                        ? ` → ${item.endDate}`
                        : ""}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}

            <p className="mt-4 text-xs leading-6 text-slate-500">
              Core completeness 會檢查活動名稱、日期、地址、圖片、收費、CTA、年齡及主辦方。
              缺實圖不會造成 broken image；網站會使用 branded fallback，但 Current/Future Published
              event 如果缺核心資料會令 launch health 變成 ACTION REQUIRED。歷史 Published 缺 published_at
              只作資料治理提示，系統唔會補寫假發佈時間。
            </p>
          </section>
        ) : null}

        {health ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-purple-700">Domain Cutover Readiness</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {health.cutover.runtimeMode === "live"
                    ? "LIVE DOMAIN"
                    : "STAGING — 尚未切正式 Domain"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Runtime host: {health.cutover.runtimeHost}
                  {health.cutover.buildSha
                    ? ` · Build ${health.cutover.buildSha.slice(0, 8)}`
                    : ""}
                </p>
              </div>
              <span
                className={
                  health.cutover.configReady
                    ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
                    : "rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700"
                }
              >
                {health.cutover.configReady
                  ? "CUTOVER CONFIG READY"
                  : "CUTOVER CONFIG PENDING"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {cutoverItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm font-bold text-slate-700">{item.label}</span>
                  <span
                    className={
                      item.ready
                        ? "text-xs font-black text-emerald-700"
                        : "text-xs font-black text-amber-700"
                    }
                  >
                    {item.ready ? "LIVE READY" : "STAGING / PENDING"}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs leading-6 text-slate-500">
              正式切站前保持 STAGING / PENDING 係正常。只有開始 cutover 時，先按
              CUTOVER_RUNBOOK 將 Production URL / Google callback 轉去
              https://www.hkfamilyfun.com；Preview 仍保留 staging URL。
            </p>
          </section>
        ) : null}

        {health?.allReady ? (
          <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold leading-6 text-emerald-900">
            Core launch services 已通過設定檢查。Optional 功能（例如 AI）未設定時會使用安全 fallback，不會阻塞核心營運。
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            仍有 Core service 需要處理。Custom domain 只應在功能、資料、Admin/Merchant流程同核心外部服務完成 QA 後切換。
          </div>
        )}
      </section>
    </main>
  );
}
