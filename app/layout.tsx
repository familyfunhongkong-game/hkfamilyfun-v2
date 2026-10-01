import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import LanguageSwitcher from "@/components/language-switcher";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { getMessages } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { localeHtmlLang } from "@/lib/i18n/config";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host")?.toLowerCase() || "";
  const isCanonicalHost =
    host === "hkfamilyfun.com" || host === "www.hkfamilyfun.com";

  return {
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
    alternates: isCanonicalHost ? { canonical: "/" } : undefined,
    openGraph: {
      type: "website",
      locale: "zh_HK",
      siteName: "HK Family Fun",
      url: isCanonicalHost ? "/" : undefined,
      title: "HK Family Fun｜香港親子活動平台",
      description:
        "按日期、地區、港鐵站、價錢及活動類型搜尋香港親子活動。",
      images: [
        {
          url: "/logo.png",
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
      images: ["/logo.png"],
    },
    robots: {
      index: isCanonicalHost,
      follow: isCanonicalHost,
      googleBot: {
        index: isCanonicalHost,
        follow: isCanonicalHost,
      },
    },
  };
}

const parentLinks = [
  { href: "/", key: "navHome", icon: "🏠", hoverClass: "hover:bg-blue-50 hover:text-blue-700" },
  { href: "/calendar", key: "navCalendar", icon: "🗓️", hoverClass: "hover:bg-blue-50 hover:text-blue-700" },
  { href: "/today", key: "navToday", icon: "⏰", hoverClass: "hover:bg-pink-50 hover:text-pink-700" },
  { href: "/events", key: "navSearch", icon: "🔎", hoverClass: "hover:bg-purple-50 hover:text-purple-700" },
  { href: "/events/map", key: "navMap", icon: "🗺️", hoverClass: "hover:bg-teal-50 hover:text-teal-700" },
  { href: "/planner", key: "navPlanner", icon: "✨", hoverClass: "hover:bg-violet-50 hover:text-violet-700" },
  { href: "/tips", key: "navTips", icon: "💬", hoverClass: "hover:bg-violet-50 hover:text-violet-700" },
  { href: "/favorites", key: "navFavorites", icon: "💖", hoverClass: "hover:bg-rose-50 hover:text-rose-700" },
] as const;

function SiteHeader({ locale, m }: { locale: Awaited<ReturnType<typeof getServerLocale>>; m: ReturnType<typeof getMessages> }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:gap-5 lg:px-8 lg:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Image
            src="/logo.png"
            alt="HK Family Fun"
            width={44}
            height={44}
            priority
            className="h-10 w-10 shrink-0 object-contain sm:h-11 sm:w-11"
          />
          <span className="min-w-0">\n            <span className="block truncate text-base font-black leading-tight text-slate-950 sm:text-lg">
              HK Family Fun
            </span>
            <span className="block text-xs text-slate-500">
              {m.platformSubtitle}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-bold text-slate-600 lg:flex">
          {parentLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-3 py-2 transition ${item.hoverClass}`}
            >
              <span className="mr-1">{item.icon}</span>
              {m[item.key]}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/merchant-join"
            className="hidden text-sm font-bold text-slate-600 hover:text-purple-700 xl:inline"
          >
            {m.merchantJoin}
          </Link>

          <Link
            href="/merchant/register"
            className="hidden rounded-full bg-purple-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-purple-800 sm:inline-flex"
          >
            {m.merchantRegister}
          </Link>
          <LanguageSwitcher locale={locale} label={m.language} />
        </div>
      </div>
    </header>
  );
}

function SiteFooter({ m }: { m: ReturnType<typeof getMessages> }) {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="HK Family Fun"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <span>
              <span className="block text-base font-black text-slate-950">
                HK Family Fun
              </span>
              <span className="block text-xs text-slate-500">
                {m.platformSubtitle}
              </span>
            </span>
          </Link>

          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-500">
            {m.footerIntro}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-black text-slate-950">{m.parentArea}</h2>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
            <Link href="/today" className="hover:text-purple-700">
              {m.navToday}
            </Link>
            <Link href="/calendar" className="hover:text-purple-700">
              {m.navCalendar}
            </Link>
            <Link href="/events" className="hover:text-purple-700">
              {m.navSearch}
            </Link>
            <Link href="/events/map" className="hover:text-purple-700">
              {m.navMap}
            </Link>
            <Link href="/tips" className="hover:text-purple-700">
              {m.navTips}
            </Link>
            <Link href="/favorites" className="hover:text-purple-700">
              {m.navFavorites}
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-black text-slate-950">{m.merchantArea}</h2>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
            <Link href="/merchant-join" className="hover:text-purple-700">
              {m.merchantJoin}
            </Link>
            <Link href="/merchant-pricing" className="hover:text-purple-700">
              {m.merchantPlans}
            </Link>
            <Link href="/merchant/register" className="hover:text-purple-700">
              {m.merchantRegister}
            </Link>
            <Link href="/merchant/login" className="hover:text-purple-700">
              {m.merchantLogin}
            </Link>
            <Link href="/merchant/events/import" className="hover:text-purple-700">
              {m.smartImport}
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-black text-slate-950">{m.contactUs}</h2>
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
            {m.paymentNotice}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs text-slate-500 md:flex-row">
          <p>{m.rights}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/about" className="hover:text-purple-700">{m.about}</Link>
            <Link href="/contact" className="hover:text-purple-700">{m.contact}</Link>
            <Link href="/report" className="hover:text-purple-700">{m.report}</Link>
            <Link href="/terms" className="hover:text-purple-700">{m.terms}</Link>
            <Link href="/privacy" className="hover:text-purple-700">{m.privacy}</Link>
            <Link href="/disclaimer" className="hover:text-purple-700">{m.disclaimer}</Link>
            <Link href="/merchant-terms" className="hover:text-purple-700">{m.merchantTerms}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  const m = getMessages(locale);

  return (
    <html lang={localeHtmlLang(locale)}>
      <body className="bg-slate-50 text-slate-950 antialiased">
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-lg transition focus:translate-y-0"
        >
          {m.skipToContent}
        </a>
        <SiteHeader locale={locale} m={m} />
        <div
          id="main-content"
          tabIndex={-1}
          className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0"
        >
          {children}
        </div>
        <SiteFooter m={m} />
        <MobileBottomNav
          ariaLabel={m.parentArea}
          items={[
            { href: "/", label: m.navHome, icon: "🏠" },
            { href: "/today", label: m.navToday, icon: "⏰" },
            { href: "/events", label: m.navSearch, icon: "🔎" },
            { href: "/events/map", label: m.navMap, icon: "🗺️" },
            { href: "/calendar", label: m.navCalendar, icon: "🗓️" },
          ]}
        />
      </body>
    </html>
  );
}