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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 text-lg font-bold text-white shadow-md">
            親
          </span>
          <div>
            <p className="text-lg font-bold text-gray-900">{SITE_NAME}</p>
            <p className="text-xs text-gray-500">香港親子活動搜尋平台</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-600"
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
          className="rounded-lg p-2 text-gray-600 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "關閉選單" : "開啟選單"}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div
        className={cn(
          "border-t border-gray-100 bg-white md:hidden",
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
