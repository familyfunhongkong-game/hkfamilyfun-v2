import Link from "next/link";
import ParentEmailAccount from "@/components/auth/parent-email-account";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-black text-purple-700">HK Family Fun</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">登入</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          家長可以免費註冊或使用電郵登入，跨裝置保存活動收藏及偏好；搜尋活動仍然毋須登入。
        </p>
        <div className="mt-6"><ParentEmailAccount /></div>
        <p className="mt-6 text-sm font-bold text-slate-600">商戶及管理員專用入口</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/merchant/login"
            className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white"
          >
            商戶登入
          </Link>
          <Link
            href="/admin/login"
            className="rounded-full border border-purple-200 bg-purple-50 px-5 py-3 text-sm font-black text-purple-700"
          >
            Admin 登入
          </Link>
          <Link
            href="/events"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
          >
            搜尋活動
          </Link>
        </div>
      </div>
    </main>
  );
}
