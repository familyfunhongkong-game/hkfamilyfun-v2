"use client";

import Link from "next/link";

const groups = [
  {
    title: "每日營運",
    description: "一個人管理網站時，先由呢度處理真正需要你決定嘅工作。",
    cards: [
      { href: "/admin/operations", title: "Operations Hub", description: "Supabase、Google Drive、表單、同步狀態、待處理數據及營運指標集中管理。", tone: "purple" },
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
      { href: "/admin/promotions", title: "Promotion Banner", description: "管理商戶廣告、特別活動宣傳 Banner、上落架日期、位置及 Sponsored 標示。", tone: "amber" },
      { href: "/admin/social", title: "AI Social Content", description: "由已核實 Event / News 資料生成 FB、IG、Threads 草稿，避免重打資料。", tone: "violet" },
      { href: "/merchant/events/import", title: "智能匯入活動", description: "由活動 URL / PDF 建立可編輯草稿，再由 Admin 審批。", tone: "slate" },
    ],
  },
  {
    title: "系統",
    description: "少做 IT 維護，多做內容及商戶營運。",
    cards: [
      { href: "/admin/system", title: "系統狀態", description: "檢查 Supabase、Resend、Google Calendar、環境變數及 launch readiness。", tone: "slate" },
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
