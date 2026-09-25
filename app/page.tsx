import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedEvents } from "@/lib/supabase/events";
import FamilyFunMotionHero from "@/components/home/FamilyFunMotionHero";
import SafeEventImage from "@/components/events/SafeEventImage";
import PromoBannerSlot from "@/components/ads/PromoBannerSlot";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export const dynamic = "force-dynamic";

const discoveryChips = [
  { label: "今日", href: "/events?date=today", icon: "☀️" },
  { label: "聽日", href: "/events?date=tomorrow", icon: "🌤️" },
  { label: "今個週末", href: "/events?date=weekend", icon: "🎈" },
  { label: "免費", href: "/events?price=free", icon: "🎁" },
  { label: "室內", href: "/events?indoor=true", icon: "🏠" },
  { label: "SEN 友善", href: "/events?sen=true", icon: "💛" },
  { label: "市集", href: "/events?category=market", icon: "🛍️" },
  { label: "工作坊", href: "/events?category=workshop", icon: "🎨" },
];

const categoryTiles = [
  { label: "商場活動", href: "/events?category=mall", icon: "🏬", tone: "bg-rose-50" },
  { label: "展覽博物館", href: "/events?category=exhibition", icon: "🏛️", tone: "bg-blue-50" },
  { label: "戶外放電", href: "/events?category=outdoor", icon: "🌿", tone: "bg-emerald-50" },
  { label: "運動體驗", href: "/events?category=sports", icon: "⚽", tone: "bg-amber-50" },
  { label: "藝術創作", href: "/events?category=arts", icon: "🖍️", tone: "bg-violet-50" },
  { label: "一家去食", href: "/events?category=cooking", icon: "🥟", tone: "bg-orange-50" },
];

export default async function HomePage() {
  const events = await getPublishedEvents();
  const featured = events.filter((event) => event.featured);
  const upcoming = (featured.length ? featured : events).slice(0, 8);

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
          <div className="grid gap-8 xl:grid-cols-[0.88fr_1.12fr] xl:items-center">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <img
                  src="/familyfun-logo-original.png"
                  alt="HK Family Fun"
                  width={88}
                  height={88}
                  className="h-[76px] w-[76px] rounded-2xl object-contain shadow-sm ring-1 ring-slate-200"
                />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-700">
                    HK Family Fun
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-500">香港親子活動搜尋平台</p>
                </div>
              </div>

              <h1 className="mt-6 text-[2.55rem] font-black leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-[3.55rem]">
                今日帶小朋友
                <br />
                <span className="text-purple-700">去邊度玩？</span>
              </h1>

              <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
                唔使逐個網站搵。用日期、地區、港鐵、價錢同活動類型，一次過搵香港親子好去處。
              </p>

              <form
                action="/events"
                className="mt-7 flex max-w-2xl items-center gap-2 rounded-[1.4rem] border border-slate-200 bg-white p-2 shadow-[0_16px_45px_rgba(15,23,42,0.09)]"
              >
                <span className="pl-3 text-xl" aria-hidden="true">🔎</span>
                <input
                  type="search"
                  name="q"
                  placeholder="搜尋活動、地區、商場、港鐵站..."
                  className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 sm:text-base"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-700"
                >
                  搜尋
                </button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                {discoveryChips.slice(0, 6).map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-700 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <Link href="/calendar" className="font-black text-slate-900 hover:text-purple-700">
                  📅 活動日曆
                </Link>
                <Link href="/events/map" className="font-black text-slate-900 hover:text-purple-700">
                  📍 地圖探索
                </Link>
                <Link href="/favorites" className="font-black text-slate-900 hover:text-purple-700">
                  ❤️ 我的收藏
                </Link>
              </div>
            </div>

            <FamilyFunMotionHero />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-8 lg:overflow-visible">
          {discoveryChips.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="min-w-[132px] rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md lg:min-w-0"
            >
              <div className="text-2xl">{item.icon}</div>
              <p className="mt-2 text-sm font-black text-slate-900">{item.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 pb-4 sm:px-6 lg:px-8">
        <Link
          href="/events"
          className="group relative block min-h-[280px] overflow-hidden rounded-[2rem] bg-slate-900 shadow-sm ring-1 ring-black/5 sm:min-h-[340px]"
        >
          <img
            src="/images/familyfun-life-ai.webp"
            alt="一家四口探索市集、博物館、香港小旅行及親子美食"
            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
          <div className="relative z-10 flex min-h-[280px] max-w-xl flex-col justify-end p-6 text-white sm:min-h-[340px] sm:p-9">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-black text-slate-900">
                FAMILY FUN PICKS
              </span>
              <span className="rounded-full bg-black/35 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">
                AI 示意圖
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              玩、食、行、學，
              <br />
              一家人搵啱心水先出發。
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/85 sm:text-base">
              市集 · 博物館 · 香港小旅行 · 親子美食
            </p>
            <span className="mt-5 inline-flex w-fit rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950">
              探索全部活動 →
            </span>
          </div>
        </Link>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-700">Discover</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              今期值得去
            </h2>
          </div>
          <Link href="/events" className="text-sm font-black text-purple-700 hover:text-purple-900">
            查看全部 →
          </Link>
        </div>

        {upcoming.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {upcoming.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <SafeEventImage
                    src={event.image}
                    alt={event.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
                  />
                  <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-black text-purple-700 shadow-sm">
                    {event.price || "查看詳情"}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs font-black text-purple-700">
                    {event.date} · {event.district}
                  </p>
                  <h3 className="mt-2 line-clamp-2 text-lg font-black leading-snug text-slate-950">
                    {event.title}
                  </h3>
                  <p className="mt-2 line-clamp-1 text-xs font-medium text-slate-500">
                    {event.organizer}
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

      <section className="mx-auto max-w-[1500px] px-4 py-2 sm:px-6 lg:px-8">
        <PromoBannerSlot />
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-slate-950 p-6 text-white sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-300">
                Quick Pick
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">唔知去邊？揀一個心情。</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/65">
                參考日本、韓國活動平台做法，先畀家長用「目的」揀，再慢慢收窄日期同地點。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {categoryTiles.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`rounded-2xl p-4 text-slate-950 transition hover:-translate-y-0.5 ${item.tone}`}
                >
                  <div className="text-2xl">{item.icon}</div>
                  <p className="mt-2 text-sm font-black">{item.label}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Link
            href="/events/map"
            className="group rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6 transition hover:border-emerald-200 sm:p-8"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Near you</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">用地圖搵附近活動</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              地區、港鐵站、地址一次睇，減少家長來回切換頁面。
            </p>
            <span className="mt-5 inline-flex rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white">
              開啟地圖探索 →
            </span>
          </Link>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-700">For merchants</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">活動主辦可以自己投稿</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              建立活動、上載圖片、預覽，再提交 HK Family Fun 審批。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/merchant/register" className="rounded-full bg-purple-700 px-4 py-2.5 text-sm font-black text-white">
                免費登記
              </Link>
              <Link href="/merchant/login" className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700">
                商戶登入
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
