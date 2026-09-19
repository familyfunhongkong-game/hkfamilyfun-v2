import Link from "next/link";

export default function FavoritesPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-r from-pink-600 to-purple-700 text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-black text-white/80">收藏</p>
          <h1 className="mt-2 text-4xl font-black">你收藏的活動都在這裡</h1>
          <p className="mt-4 text-sm leading-7 text-white/85">
            收藏感興趣的活動，方便之後再比較日期、地點、收費及報名方式。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-pink-50 text-5xl">
            ♡
          </div>

          <h2 className="mt-6 text-2xl font-black">沒有收藏的活動</h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            去探索更多有趣的活動吧！日後登入帳戶後，收藏活動會保存在這裡。
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/events"
              className="rounded-full bg-pink-600 px-5 py-3 text-sm font-black text-white hover:bg-pink-700"
            >
              瀏覽活動
            </Link>
            <Link
              href="/today"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-pink-300 hover:text-pink-700"
            >
              今日活動
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}