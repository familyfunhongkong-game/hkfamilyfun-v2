import Link from "next/link";
import { Search } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-100/50 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-secondary-100/50 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="max-w-3xl">
          <span className="mb-4 inline-flex rounded-full bg-white px-4 py-1.5 text-sm font-medium text-primary-700 shadow-sm">
            🎈 香港親子活動一站式搜尋
          </span>
          <h1 className="mb-4 text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
            發掘香港最棒的
            <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              {" "}
              親子活動
            </span>
          </h1>
          <p className="mb-8 max-w-2xl text-lg leading-relaxed text-gray-600">
            從免費社區活動到特色工作坊，幫助家長快速找到適合小朋友年齡、地區及興趣的精彩體驗。
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary-700"
            >
              <Search size={18} />
              立即搜尋活動
            </Link>
            <Link
              href="/merchant-join"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              商戶免費登記
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
