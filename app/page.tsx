import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedEvents } from "@/lib/supabase/events";
import FamilyFunMotionHero from "@/components/home/FamilyFunMotionHero";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "/",
  },
};

export const dynamic = "force-dynamic";

const quickActions = [
  {
    title: "今日活動",
    subtitle: "即睇今日仍然有效的親子節目",
    href: "/today",
    tone: "bg-pink-50 border-pink-100 text-pink-700",
    icon: "⏰",
  },
  {
    title: "活動日曆",
    subtitle: "按日期計劃平日及週末親子時間",
    href: "/calendar",
    tone: "bg-blue-50 border-blue-100 text-blue-700",
    icon: "🗓️",
  },
  {
    title: "地點探索",
    subtitle: "按地區、港鐵站及地址搵活動",
    href: "/events/map",
    tone: "bg-teal-50 border-teal-100 text-teal-700",
    icon: "📍",
  },
];

const categories = [
  { label: "免費活動", href: "/events?price=free", icon: "🎁" },
  { label: "商場活動", href: "/events?category=mall", icon: "🏬" },
  { label: "工作坊", href: "/events?category=workshop", icon: "🎨" },
  { label: "SEN 友善", href: "/events?sen=true", icon: "💛" },
  { label: "室內活動", href: "/events?indoor=true", icon: "🏠" },
  { label: "今個週末", href: "/events?date=weekend", icon: "🌈" },
];

export default async function HomePage() {
  const events = await getPublishedEvents();
  const featured = events.filter((event) => event.featured);
  const upcoming = (featured.length ? featured : events).slice(0, 6);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-b from-white via-purple-50/40 to-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-black text-purple-700">
              HK Family Fun 香港親子活動平台
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
              香港親子活動，
              <br />
              一站搵齊。
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              按日期、地區、港鐵站、價錢及活動類型搜尋親子活動。
              活動報名會連接主辦單位官方渠道，HK Family Fun 現階段不代收活動款項。
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/events"
                className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-purple-800"
              >
                搜尋親子活動
              </Link>
              <Link
                href="/calendar"
                className="rounded-full border border-blue-300 bg-blue-50 px-5 py-3 text-sm font-black text-blue-700"
              >
                開啟活動日曆
              </Link>
              <Link
                href="/merchant-join"
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
              >
                商戶加入
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {quickActions.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`rounded-3xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${item.tone}`}
                >
                  <div className="text-2xl">{item.icon}</div>
                  <h2 className="mt-2 text-base font-black text-slate-950">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {item.subtitle}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <FamilyFunMotionHero />

            <div className="rounded-[2rem] border border-purple-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-purple-700">最新已發布活動</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {events.length ? `現有 ${events.length} 個有效活動` : "新活動正在整理中"}
                  </h2>
                </div>
                <Link
                  href="/events"
                  className="rounded-full bg-purple-50 px-4 py-2 text-xs font-black text-purple-700"
                >
                  查看全部
                </Link>
              </div>

              {events[0] ? (
                <Link
                  href={`/events/${events[0].id}`}
                  className="mt-4 grid gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[110px_1fr] sm:items-center"
                >
                  <img
                    src={events[0].image}
                    alt=""
                    className="h-24 w-full rounded-xl object-cover sm:w-[110px]"
                  />
                  <div>
                    <p className="text-xs font-black text-purple-700">
                      {events[0].date} · {events[0].district}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-base font-black text-slate-950">
                      {events[0].title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {events[0].organizer}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                  暫未有有效公開活動；平台不會以示範活動冒充真實活動。
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-purple-700">快速探索</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              用你最常用的方法搵活動
            </h2>
          </div>
          <Link
            href="/events"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
          >
            查看全部活動
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {categories.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md"
            >
              <div className="text-3xl">{item.icon}</div>
              <p className="mt-3 text-sm font-black text-slate-900">
                {item.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-pink-700">活動精選</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              即將舉行
            </h2>
          </div>
          <Link
            href="/calendar"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            用日曆查看
          </Link>
        </div>

        {upcoming.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <img
                  src={event.image}
                  alt=""
                  className="h-48 w-full object-cover"
                />
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
                      {event.date}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {event.price || "詳情請見官方網站"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-black text-slate-950">
                    {event.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {event.organizer} · {event.district}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            暫未有即將舉行的已發布活動。
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-teal-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-black text-teal-700">地點探索</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              按地區、港鐵站及地址搵活動
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              活動資料會使用主辦單位提供的地址連接 Google Maps，不會使用示範座標。
            </p>
            <Link
              href="/events/map"
              className="mt-5 inline-flex rounded-full bg-teal-600 px-5 py-3 text-sm font-black text-white"
            >
              開啟地點探索
            </Link>
          </div>

          <div className="rounded-[2rem] border border-purple-100 bg-slate-950 p-6 text-white shadow-sm">
            <p className="text-sm font-black text-purple-200">Merchant Portal</p>
            <h2 className="mt-2 text-2xl font-black">
              商戶自己管理活動，再交平台審批
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/75">
              已有活動網頁可使用智能網址匯入建立草稿；亦可以手動補資料、上載圖片、預覽後提交審批。
              所有匯入結果都需要人工核對，不會自動發布。
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["1", "建立草稿"],
                ["2", "提交審批"],
                ["3", "批准後發布"],
              ].map(([step, label]) => (
                <div
                  key={step}
                  className="rounded-2xl bg-white/10 px-4 py-4 text-center"
                >
                  <p className="text-xl font-black">{step}</p>
                  <p className="mt-1 text-xs font-bold text-white/80">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/merchant/register"
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-purple-700"
              >
                免費登記商戶
              </Link>
              <Link
                href="/merchant/login"
                className="rounded-full border border-white/30 px-5 py-3 text-sm font-black text-white"
              >
                商戶登入
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
