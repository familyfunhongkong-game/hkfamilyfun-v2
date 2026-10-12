import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "網站升級進行中｜HK Family Fun",
  description: "HK Family Fun 正進行系統升級及資料更新，完成後將重新開放。",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-24 w-24 items-center justify-center">
          <Image
            src="/api/brand/family-fun-logo"
            alt="HK Family Fun"
            width={96}
            height={96}
            priority
            unoptimized
            className="h-24 w-24 object-contain"
          />
        </div>
        <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-purple-700">
          HK Family Fun
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          網站升級進行中
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          我哋正為 HK Family Fun 更新活動資料、日曆及網站功能。
          完成測試後會盡快重新開放，感謝你耐心等候。
        </p>
        <div className="mt-7 rounded-2xl border border-purple-100 bg-purple-50 px-5 py-4 text-sm font-bold leading-6 text-purple-900">
          如有活動投稿或查詢，請電郵
          <a className="ml-1 underline" href="mailto:info@hkfamilyfun.com">
            info@hkfamilyfun.com
          </a>
        </div>
      </section>
    </main>
  );
}
