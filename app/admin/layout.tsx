"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AccessState =
  | "checking"
  | "signed_out"
  | "forbidden"
  | "allowed"
  | "error";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [accessState, setAccessState] =
    useState<AccessState>("checking");
  const [currentEmail, setCurrentEmail] = useState("");

  useEffect(() => {
    if (pathname === "/admin/login") return;

    const client = supabase;
    let ignore = false;

    async function verifyAdmin() {
      if (!client) {
        if (!ignore) setAccessState("error");
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();

      if (ignore) return;

      if (userError || !user) {
        setCurrentEmail("");
        setAccessState("signed_out");
        return;
      }

      setCurrentEmail(
        String(user.email || "")
          .trim()
          .toLowerCase(),
      );

      const { data: isAdmin, error: adminError } =
        await client.rpc("is_platform_admin");

      if (ignore) return;

      if (adminError) {
        console.error("Admin permission check failed:", adminError);
        setAccessState("error");
        return;
      }

      setAccessState(isAdmin === true ? "allowed" : "forbidden");
    }

    void verifyAdmin();

    if (!client) {
      return () => {
        ignore = true;
      };
    }

    const { data } = client.auth.onAuthStateChange(() => {
      void verifyAdmin();
    });

    return () => {
      ignore = true;
      data.subscription.unsubscribe();
    };
  }, [pathname]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (accessState === "allowed") {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        {accessState === "checking" ? (
          <>
            <p className="text-sm font-black text-purple-700">
              HK Family Fun Admin
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              正在驗證管理員權限
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              系統正在以資料庫權限規則確認登入狀態。
            </p>
          </>
        ) : null}

        {accessState === "signed_out" ? (
          <>
            <p className="text-sm font-black text-amber-700">
              需要登入
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              Admin 頁面已受保護
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              請先使用已授權管理員帳戶登入。
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/admin/login"
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
            <p className="text-sm font-black text-rose-700">
              沒有管理員權限
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              此帳戶不能進入 Admin
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              目前登入帳戶：{currentEmail || "未知"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Admin 權限由 Supabase platform-admin 規則控制。
            </p>
          </>
        ) : null}

        {accessState === "error" ? (
          <>
            <p className="text-sm font-black text-rose-700">
              系統連線錯誤
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              暫時無法驗證 Admin 權限
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              請重新登入後再試。
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}
