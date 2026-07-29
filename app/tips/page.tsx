import Link from "next/link";

export default function TipsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-black text-white/80">社區報料區</p>
          <h1 className="mt-2 text-4xl font-black">分享你的親子活動發現</h1>
          <p className="mt-4 text-sm leading-7 text-white/85">
            發現更多精彩活動，讓更多香港家庭可以找到適合小朋友的好去處。
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {[
              ["0", "總帖子"],
              ["0", "活躍用戶"],
              ["0", "今日報料"],
            ].map(([number, label]) => (
              <div key={label}>
                <p className="text-4xl font-black">{number}</p>
                <p className="mt-1 text-sm font-bold text-white/80">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
            <input
              placeholder="搜尋帖子內容、作者或標籤..."
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <select className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
              <option>全部地區</option>
              <option>港島</option>
              <option>九龍</option>
              <option>新界</option>
            </select>
            <select className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
              <option>全部港鐵站</option>
            </select>
            <button className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600">
              清除
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-4xl">
            💬
          </div>
          <h2 className="mt-5 text-2xl font-black">暫無帖子</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            快來成為第一個分享的人吧！
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/events"
              className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800"
            >
              瀏覽活動
            </Link>
            <Link
              href="/merchant-join"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
            >
              商戶提交活動
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}