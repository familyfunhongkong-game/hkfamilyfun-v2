import Link from "next/link";
import type { Metadata } from "next";
import MerchantLoginPanel from "@/components/merchant/merchant-login-panel";
import MerchantRegisterPanel from "@/components/merchant/merchant-register-panel";

export const metadata: Metadata = {
  title: "商戶登入及免費登記",
  description: "HK Family Fun 商戶帳戶：登入管理活動，或免費登記提交親子活動。",
  robots: { index: false, follow: false },
};

export default async function MerchantAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const mode = (await searchParams).mode === "register" ? "register" : "login";
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-9 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-xl">
        <nav aria-label="商戶帳戶" className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <Link
            href="/merchant/account?mode=login"
            aria-current={mode === "login" ? "page" : undefined}
            className={`flex min-h-12 items-center justify-center rounded-xl px-4 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700 ${mode === "login" ? "bg-purple-700 text-white shadow-sm" : "text-slate-700 hover:bg-purple-50"}`}
          >
            商戶登入
          </Link>
          <Link
            href="/merchant/account?mode=register"
            aria-current={mode === "register" ? "page" : undefined}
            className={`flex min-h-12 items-center justify-center rounded-xl px-4 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700 ${mode === "register" ? "bg-purple-700 text-white shadow-sm" : "text-slate-700 hover:bg-purple-50"}`}
          >
            免費登記
          </Link>
        </nav>
        {mode === "register" ? <MerchantRegisterPanel /> : <MerchantLoginPanel />}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-slate-500">
          <Link className="hover:text-purple-700" href="/">返回首頁</Link>
          <span aria-hidden="true">·</span>
          <Link className="hover:text-purple-700" href="/admin/login">管理員登入</Link>
        </div>
      </div>
    </main>
  );
}
