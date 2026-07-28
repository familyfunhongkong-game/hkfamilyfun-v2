import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "HK Family Fun｜香港親子活動搜尋平台",
  description:
    "HK Family Fun 是香港親子活動搜尋平台，幫助家長搜尋今日活動、活動日曆、附近活動、免費活動、SEN 友善活動及商戶活動資訊。",
};

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-black text-white shadow-sm">
            親
          </span>
          <span>
            <span className="block text-lg font-black leading-tight text-slate-950">
              HK Family Fun
            </span>
            <span className="block text-xs text-slate-500">
              香港親子活動搜尋平台
            </span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 text-sm font-bold text-slate-600">
          <Link
            href="/"
            className="rounded-2xl px-3 py-2 hover:bg-blue-50 hover:text-blue-700"
          >
            🏠 首頁
          </Link>

          <Link
            href="/events?view=calendar"
            className="rounded-2xl px-3 py-2 hover:bg-blue-50 hover:text-blue-700"
          >
            🗓️ 活動日曆
          </Link>

          <Link
            href="/events?date=today"
            className="rounded-2xl px-3 py-2 hover:bg-pink-50 hover:text-pink-700"
          >
            ⏰ 今日活動
          </Link>

          <Link
            href="/events"
            className="rounded-2xl px-3 py-2 hover:bg-purple-50 hover:text-purple-700"
          >
            🔎 搜尋活動
          </Link>

          <Link
            href="/events/map"
            className="rounded-2xl px-3 py-2 hover:bg-teal-50 hover:text-teal-700"
          >
            🗺️ 附近活動地圖
          </Link>

          <Link
            href="/report-event"
            className="rounded-2xl px-3 py-2 hover:bg-violet-50 hover:text-violet-700"
          >
            💬 報料區
          </Link>

          <Link
            href="/favorites"
            className="rounded-2xl px-3 py-2 hover:bg-rose-50 hover:text-rose-700"
          >
            💖 收藏
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/merchant-join"
            className="text-sm font-bold text-slate-600 hover:text-purple-700"
          >
            商戶加入
          </Link>

          <Link
            href="/merchant/register"
            className="rounded-full bg-purple-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-purple-800"
          >
            商戶免費登記
          </Link>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-black text-white">
              親
            </span>
            <span>
              <span className="block text-base font-black text-slate-950">
                HK Family Fun
              </span>
              <span className="block text-xs text-slate-500">
                香港親子活動搜尋平台
              </span>
            </span>
          </Link>

          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-500">
            一站式搜尋香港親子活動，幫助家長輕鬆找到適合小朋友的精彩體驗。
          </p>
        </div>

        <div>
          <h2 className="text-sm font-black text-slate-950">快速連結</h2>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
            <Link href="/events?date=today" className="hover:text-purple-700">
              今日活動
            </Link>
            <Link href="/events?view=calendar" className="hover:text-purple-700">
              活動日曆
            </Link>
            <Link href="/events" className="hover:text-purple-700">
              搜尋活動
            </Link>
            <Link href="/events/map" className="hover:text-purple-700">
              附近活動地圖
            </Link>
            <Link href="/merchant-join" className="hover:text-purple-700">
              商戶加入
            </Link>
            <Link href="/merchant-pricing" className="hover:text-purple-700">
              商戶方案
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-black text-slate-950">聯絡我們</h2>
          <div className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
            <p>
              WhatsApp:{" "}
              <a
                href="https://wa.me/85257018297"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-purple-700 hover:text-purple-900"
              >
                5701 8297
              </a>
            </p>
            <p>
              Email:{" "}
              <a
                href="mailto:info@hkfamilyfun.com"
                className="font-bold text-purple-700 hover:text-purple-900"
              >
                info@hkfamilyfun.com
              </a>
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
            HK Family Fun 現階段不代收活動款項；家長會直接連到商戶官方報名渠道。
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-5 text-center text-xs text-slate-500">
        © 2026 HK Family Fun. 保留所有權利。
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="bg-slate-50 text-slate-950 antialiased">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}