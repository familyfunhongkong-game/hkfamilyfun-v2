"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const parentLinks = [
  { href: "/", label: "首頁", icon: "🏠" },
  { href: "/calendar", label: "活動日曆", icon: "🗓️" },
  { href: "/today", label: "今日活動", icon: "⏰" },
  { href: "/events", label: "搜尋活動", icon: "🔎" },
  { href: "/events/map", label: "地點探索", icon: "🗺️" },
  { href: "/tips", label: "報料區", icon: "💬" },
  { href: "/favorites", label: "收藏", icon: "💖" },
];

export default function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3"
          onClick={() => setOpen(false)}
          aria-label="HK Family Fun 首頁"
        >
          <img
            src="/logo.png"
            alt="HK Family Fun"
            width={64}
            height={64}
            className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16"
          />
          <span className="min-w-0">
            <span className="block truncate text-lg font-black leading-tight text-slate-950">
              HK Family Fun
            </span>
            <span className="block truncate text-xs text-slate-500">
              香港親子活動平台
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-bold text-slate-600 xl:flex">
          {parentLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl px-3 py-2 transition hover:bg-purple-50 hover:text-purple-700"
            >
              <span className="mr-1" aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-3 xl:flex">
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

        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm xl:hidden"
          aria-label={open ? "關閉選單" : "開啟選單"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-lg xl:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1 sm:grid-cols-2">
            {parentLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700"
              >
                <span className="mr-2" aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mx-auto mt-3 flex max-w-7xl gap-3">
            <Link
              href="/merchant-join"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-full border border-slate-300 px-4 py-3 text-center text-sm font-black text-slate-700"
            >
              商戶加入
            </Link>
            <Link
              href="/merchant/register"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-full bg-purple-700 px-4 py-3 text-center text-sm font-black text-white"
            >
              商戶免費登記
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
