import Link from "next/link";
import { CONTACT_EMAIL, NAV_LINKS, SITE_NAME } from "@/lib/constants";
import { getWhatsAppUrl } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 text-sm font-bold text-white">
                親
              </span>
              <span className="font-bold text-gray-900">{SITE_NAME}</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              一站式搜尋香港親子活動，幫助家長輕鬆找到適合小朋友的精彩體驗。
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-gray-900">快速連結</h3>
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-primary-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-gray-900">聯絡我們</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                WhatsApp:{" "}
                <a
                  href={getWhatsAppUrl("你好，我想查詢 HK Family Fun 平台。")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  5701 8297
                </a>
              </li>
              <li>
                Email:{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-primary-600 hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} {SITE_NAME}. 保留所有權利。
        </div>
      </div>
    </footer>
  );
}
