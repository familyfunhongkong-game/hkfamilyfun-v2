import type { Metadata } from "next";
import Link from "next/link";
import PublicHeader from "@/components/layout/PublicHeader";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.hkfamilyfun.com"),
  title: {
    default: "HK Family Fun｜香港親子活動平台",
    template: "%s｜HK Family Fun",
  },
  description:
    "HK Family Fun 是香港親子活動平台，幫助家長搜尋今日、週末、免費、室內、戶外、SEN 友善及不同地區的親子活動。",
  keywords: [
    "香港親子活動",
    "親子好去處",
    "香港週末活動",
    "免費親子活動",
    "兒童活動",
    "SEN活動",
    "親子工作坊",
    "HK Family Fun",
  ],
  openGraph: {
    type: "website",
    locale: "zh_HK",
    siteName: "HK Family Fun",
    title: "HK Family Fun｜香港親子活動平台",
    description:
      "按日期、地區、港鐵站、價錢及活動類型搜尋香港親子活動。",
    images: [
      {
        url: "/familyfun-logo-original.png",
        width: 100,
        height: 100,
        alt: "HK Family Fun",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HK Family Fun｜香港親子活動平台",
    description:
      "按日期、地區、港鐵站、價錢及活動類型搜尋香港親子活動。",
    images: ["/familyfun-logo-original.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/familyfun-logo-original.png"
              alt="HK Family Fun"
              width={52}
              height={52}
              className="h-12 w-12 rounded-xl object-contain shadow-sm ring-1 ring-slate-200"
            />
            <span>
              <span className="block text-base font-black text-slate-950">
                HK Family Fun
              </span>
              <span className="block text-xs text-slate-500">
                香港親子活動平台
              </span>
            </span>
          </Link>

          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-500">
            一站式搜尋香港親子活動，幫助家長輕鬆找到適合小朋友的精彩體驗。
          </p>
        </div>

        <div>
          <h2 className="text-sm font-black text-slate-950">家長入口</h2>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
            <Link href="/today" className="hover:text-purple-700">
              今日活動
            </Link>
            <Link href="/calendar" className="hover:text-purple-700">
              活動日曆
            </Link>
            <Link href="/events" className="hover:text-purple-700">
              搜尋活動
            </Link>
            <Link href="/events/map" className="hover:text-purple-700">
              地點探索
            </Link>
            <Link href="/tips" className="hover:text-purple-700">
              報料區
            </Link>
            <Link href="/favorites" className="hover:text-purple-700">
              收藏
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-black text-slate-950">商戶專區</h2>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
            <Link href="/merchant-join" className="hover:text-purple-700">
              商戶加入
            </Link>
            <Link href="/merchant-pricing" className="hover:text-purple-700">
              商戶方案
            </Link>
            <Link href="/merchant/register" className="hover:text-purple-700">
              商戶免費登記
            </Link>
            <Link href="/merchant/login" className="hover:text-purple-700">
              商戶登入
            </Link>
            <Link href="/merchant/events/import" className="hover:text-purple-700">
              智能匯入活動
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

          <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
            <a href="https://www.instagram.com/hk.familyfun" target="_blank" rel="noreferrer" className="text-purple-700 hover:text-purple-900">
              Instagram
            </a>
            <a href="https://www.facebook.com/hk.familyfun1112" target="_blank" rel="noreferrer" className="text-purple-700 hover:text-purple-900">
              Facebook
            </a>
            <a href="https://www.threads.com/@hk.familyfun" target="_blank" rel="noreferrer" className="text-purple-700 hover:text-purple-900">
              Threads
            </a>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
            HK Family Fun 現階段不代收活動款項；家長會直接連到商戶官方報名渠道。
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-5">
        <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-3 text-xs text-slate-500 md:flex-row">
          <p>© 2026 HK Family Fun. 保留所有權利。</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/about" className="hover:text-purple-700">關於我們</Link>
            <Link href="/contact" className="hover:text-purple-700">聯絡我們</Link>
            <Link href="/report" className="hover:text-purple-700">報錯／舉報</Link>
            <Link href="/terms" className="hover:text-purple-700">服務條款</Link>
            <Link href="/privacy" className="hover:text-purple-700">私隱政策</Link>
            <Link href="/disclaimer" className="hover:text-purple-700">免責聲明</Link>
            <Link href="/merchant-terms" className="hover:text-purple-700">商戶條款</Link>
          </div>
        </div>
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
        <PublicHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}