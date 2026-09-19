"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type AccessState =
  | "checking"
  | "signed_out"
  | "forbidden"
  | "allowed"
  | "error";

const ADMIN_EMAILS = new Set([
  "familyfun.hongkong@gmail.com",
  "info@hkfamilyfun.com",
]);

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [currentEmail, setCurrentEmail] = useState("");

  useEffect(() => {
    let ignore = false;

    async function verifyAdmin() {
      if (!supabase) {
        if (!ignore) setAccessState("error");
        return;
      }

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (ignore) return;

      if (error || !user) {
        setCurrentEmail("");
        setAccessState("signed_out");
        return;
      }

      const email = String(user.email || "").trim().toLowerCase();
      setCurrentEmail(email);
      setAccessState(ADMIN_EMAILS.has(email) ? "allowed" : "forbidden");
    }

    void verifyAdmin();

    const { data } = supabase.auth.onAuthStateChange(() => {
      void verifyAdmin();
    });

    return () => {
      ignore = true;
      data.subscription.unsubscribe();
    };
  }, []);

  if (accessState === "allowed") {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-black text-purple-700">
          HK Family Fun Admin
        </p>

        {accessState === "checking" ? (
          <>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              正在驗證管理員權限
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              系統正在確認登入狀態。
            </p>
          </>
        ) : null}

        {accessState === "signed_out" ? (
          <>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              Admin 頁面已受保護
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              請先使用已授權管理員帳戶登入。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/merchant/login"
                className="rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white"
              >
                前往登入
              </Link>
              <Link
                href="/events"
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700"
              >
                返回活動頁
              </Link>
            </div>
          </>
        ) : null}

        {accessState === "forbidden" ? (
          <>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              此帳戶沒有 Admin 權限
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              目前登入帳戶：{currentEmail || "未知"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Admin 操作同時受前端白名單及 Supabase RLS 保護。
            </p>
          </>
        ) : null}

        {accessState === "error" ? (
          <>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              暫時無法驗證 Admin 權限
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              請重新登入後再試。
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}
