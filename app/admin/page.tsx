"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

const groups = [
  {
    title: "每日營運",
    description: "一個人管理網站時，先由呢度處理真正需要你決定嘅工作。",
    cards: [
      { href: "/admin/operations", title: "Operations Hub", description: "Supabase、Google Drive、表單、同步狀態、待處理數據及營運指標集中管理。", tone: "purple" },
      { href: "/admin/reports", title: "Reports / QA", description: "集中睇活動資料缺漏、過期公開、同步錯誤、Intake backlog 同內容營運狀態。", tone: "rose" },
      { href: "/admin/notifications", title: "通知中心", description: "新商戶、待審活動及系統狀態更新。", tone: "amber" },
      { href: "/admin/events", title: "活動審批", description: "草稿、待審、已批准、已發布、拒絕及封存活動。", tone: "emerald" },
      { href: "/admin/merchants", title: "商戶審批", description: "批准、拒絕、暫停商戶帳戶及檢查提交資料。", tone: "sky" },
    ],
  },
  {
    title: "內容與增長",
    description: "活動資料只輸入一次，再重用做網站內容、專題及社交媒體。",
    cards: [
      { href: "/admin/content", title: "News / Feature CMS", description: "圖片主導嘅完整專題頁，可做活動介紹、親子攻略、合作內容及 Sponsored Feature。", tone: "rose" },
      { href: "/admin/advertising", title: "Advertising CRM", description: "商戶廣告查詢、報價、付款確認、排期、Banner 關聯及完成紀錄。", tone: "amber" },
      { href: "/admin/promotions", title: "Promotion Banner", description: "管理商戶廣告、特別活動宣傳 Banner、上落架日期、位置及 Sponsored 標示。", tone: "amber" },
      { href: "/admin/social", title: "AI Social Content", description: "由已核實 Event / News 資料生成 FB、IG、Threads 草稿，避免重打資料。", tone: "violet" },
      { href: "/merchant/events/import", title: "智能匯入活動", description: "由活動 URL / PDF 建立可編輯草稿，再由 Admin 審批。", tone: "slate" },
    ],
  },
  {
    title: "系統",
    description: "少做 IT 維護，多做內容及商戶營運。",
    cards: [
      { href: "/admin/system", title: "系統狀態", description: "檢查 Supabase、Data Hub、Google Drive、Calendar、AI、Email 同 launch readiness。", tone: "slate" },
      { href: "/news", title: "查看 News / Feature", description: "查看公開圖片主導 editorial 頁面。", tone: "rose" },
      { href: "/events", title: "查看公開活動網站", description: "檢查家長端 Event / Today / Calendar / Map 實際顯示。", tone: "emerald" },
    ],
  },
] as const;

const toneClasses: Record<string, string> = {
  purple: "border-purple-200 bg-purple-50/60 hover:border-purple-400",
  amber: "border-amber-200 bg-amber-50/60 hover:border-amber-400",
  emerald: "border-emerald-200 bg-emerald-50/60 hover:border-emerald-400",
  sky: "border-sky-200 bg-sky-50/60 hover:border-sky-400",
  rose: "border-rose-200 bg-rose-50/60 hover:border-rose-400",
  violet: "border-violet-200 bg-violet-50/60 hover:border-violet-400",
  slate: "border-slate-200 bg-white hover:border-slate-400",
};

export default function AdminHomePage() {
  const [driveWorking, setDriveWorking] = useState(false);
  const [driveError, setDriveError] = useState("");

  async function connectGoogleDrive() {
    if (!supabase) {
      setDriveError("Supabase client 未初始化。");
      return;
    }

    setDriveWorking(true);
    setDriveError("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("請先登入 Admin。");

      const response = await fetch("/api/admin/google-drive/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: "{}",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "未能連接 Google Drive。");
      if (!body.url) throw new Error("Google OAuth URL 未能建立。");

      window.location.href = body.url;
    } catch (error) {
      setDriveError(error instanceof Error ? error.message : "未能連接 Google Drive。");
      setDriveWorking(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-8">
          <p className="text-sm font-black text-purple-700">HK Family Fun Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">後台營運中心</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
            設計俾一個人營運：資料一次輸入，Supabase 做主資料庫，Google Drive / Forms 做來源同文件層，
            AI 協助整理及出文案；任何公開活動、News 或 Sponsored 內容仍由你最後審批。
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-800">Single source of truth</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">AI-assisted</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">Human approval before publish</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] space-y-9 px-4 py-8">
        <section className="rounded-[2rem] border border-purple-200 bg-gradient-to-r from-purple-50 via-white to-emerald-50 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-700">Google Drive Sync</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">連接 Family Fun Google Drive</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                連接 familyfun.hongkong@gmail.com 後，Google Sheets / Forms 資料可以由 Admin 同步入 Data Inbox，再做 Normalize、查重同審批。
              </p>
              {driveError ? (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{driveError}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void connectGoogleDrive()}
                disabled={driveWorking}
                className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-purple-800 disabled:opacity-50"
              >
                {driveWorking ? "開啟 Google 授權…" : "連接 Family Fun Google Drive"}
              </button>
              <Link
                href="/admin/operations"
                className="rounded-full border border-purple-200 bg-white px-5 py-3 text-sm font-black text-purple-700"
              >
                打開 Operations Hub
              </Link>
            </div>
          </div>
        </section>
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="text-xl font-black text-slate-950">{group.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{group.description}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {group.cards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className={"rounded-3xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md " + toneClasses[card.tone]}
                >
                  <h3 className="text-lg font-black text-slate-950">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                  <p className="mt-5 text-sm font-black text-purple-700">進入管理 →</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
