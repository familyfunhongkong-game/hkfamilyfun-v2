import Link from "next/link";

const cards = [
  {
    href: "/admin/events",
    title: "活動審批",
    description: "查看草稿、待審批、已發布、拒絕及封存活動，進入詳情完成審批。",
  },
  {
    href: "/admin/merchants",
    title: "商戶審批",
    description: "管理新商戶登記、批准、拒絕或暫停商戶帳戶。",
  },
  {
    href: "/admin/banners",
    title: "Banner 管理",
    description: "上載合作 Banner、設定首頁／活動頁位置、發布時間、連結及自動到期。",
  },
  {
    href: "/merchant/events/import",
    title: "智能匯入活動",
    description: "由官方活動網址建立可編輯草稿，再交由 Admin 審批。",
  },
  {
    href: "/events",
    title: "查看公開網站",
    description: "檢查已發布活動在家長端的實際顯示效果。",
  },
];

export default function AdminHomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-8">
          <p className="text-sm font-black text-purple-700">
            HK Family Fun Admin
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            後台管理中心
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            集中管理活動、商戶審批、活動匯入及公開網站檢查。
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-4 px-4 py-8 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md"
          >
            <h2 className="text-xl font-black text-slate-950">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {card.description}
            </p>
            <p className="mt-5 text-sm font-black text-purple-700">
              進入管理 →
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
