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
        <div className="mt-7 rounded-2xl border border-purple-100 bg-purple-50 px-5 py-5 text-sm font-bold leading-6 text-purple-900">
          <p>如有活動投稿或查詢，暫請透過官方 WhatsApp 留言，我哋會按次序回覆。</p>
          <a
            href="https://wa.me/85257018297"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-purple-700 px-7 py-3 text-sm font-black text-white hover:bg-purple-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700"
          >
            WhatsApp 留言 · 5701 8297 ↗
          </a>
          <p className="mt-3 text-xs font-medium text-slate-600">建議以文字留言，方便我哋核對活動及聯絡資料。</p>
        </div>
      </section>
    </main>
  );
}
