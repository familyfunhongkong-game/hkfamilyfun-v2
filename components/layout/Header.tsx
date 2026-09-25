"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NAV_LINKS, SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="HK Family Fun"
            width={72}
            height={72}
            className="h-16 w-16 shrink-0 rounded-xl object-contain shadow-sm ring-1 ring-slate-200"
          />
          <div>
            <p className="text-lg font-black tracking-tight text-gray-950">{SITE_NAME}</p>
            <p className="text-xs text-gray-500">香港親子活動搜尋平台</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-2 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-purple-50 hover:text-primary-700"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/merchant-join"
            className="rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            商戶免費登記
          </Link>
        </nav>

        <button
          type="button"
          className="rounded-xl border border-slate-200 bg-white p-2 text-gray-700 lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "關閉選單" : "開啟選單"}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div
        className={cn(
          "border-t border-gray-100 bg-white lg:hidden",
          mobileOpen ? "block" : "hidden"
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/merchant-join"
            className="mt-2 rounded-full bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
            onClick={() => setMobileOpen(false)}
          >
            商戶免費登記
          </Link>
        </nav>
      </div>
    </header>
  );
}
