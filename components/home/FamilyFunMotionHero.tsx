import Link from "next/link";

export default function FamilyFunMotionHero() {
  return (
    <div className="familyfun-motion relative overflow-hidden rounded-[2rem] border border-purple-100 bg-gradient-to-br from-violet-100 via-white to-sky-100 p-6 shadow-xl shadow-purple-100/60">
      <div className="pointer-events-none absolute -left-10 top-8 h-32 w-32 rounded-full bg-pink-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-8 bottom-12 h-36 w-36 rounded-full bg-sky-200/50 blur-3xl" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-purple-700 shadow-sm">
            一家出發 · 玩盡香港
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
            玩 · 食 · 飛
          </span>
        </div>

        <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
          一家出發，
          <br />
          今日去邊度玩？
        </h2>

        <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">
          由親子活動、食好西到家庭旅程，用最輕鬆的方法發現下一個 Family Fun Moment。
        </p>

        <div className="relative mt-6 h-56 overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/65 p-4 shadow-inner backdrop-blur">
          <div className="absolute left-5 right-5 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-pink-300 via-amber-300 to-sky-300" />

          <div className="absolute left-[8%] top-[54%] -translate-y-1/2 text-center">
            <div className="familyfun-stop-icon text-4xl">🎡</div>
            <p className="mt-2 rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-700">
              去玩
            </p>
          </div>

          <div className="absolute left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="familyfun-stop-icon familyfun-delay-1 text-4xl">🍜</div>
            <p className="mt-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
              去食
            </p>
          </div>

          <div className="absolute right-[8%] top-[54%] -translate-y-1/2 text-center">
            <div className="familyfun-stop-icon familyfun-delay-2 text-4xl">✈️</div>
            <p className="mt-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
              去旅行
            </p>
          </div>

          <div className="familyfun-family-runner absolute left-3 top-7 z-20 w-28 sm:w-32">
            <img
              src="/logo.png"
              alt="HK Family Fun"
              className="h-auto w-full object-contain drop-shadow-lg"
            />
          </div>

          <div className="familyfun-spark familyfun-spark-1 absolute left-[26%] top-6 text-xl">✨</div>
          <div className="familyfun-spark familyfun-spark-2 absolute left-[63%] top-10 text-lg">⭐</div>
          <div className="familyfun-spark familyfun-spark-3 absolute right-[12%] top-5 text-lg">✨</div>

          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-3 text-[11px] font-bold text-slate-500">
            <span>一家四口彈住出發</span>
            <span>每日發現新活動</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/events"
            className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-purple-800"
          >
            即刻搵活動
          </Link>
          <Link
            href="/events/map"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-purple-300"
          >
            睇附近活動
          </Link>
        </div>
      </div>
    </div>
  );
}
