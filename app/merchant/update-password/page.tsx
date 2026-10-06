"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

export default function MerchantUpdatePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [portalContext, setPortalContext] = useState<"merchant" | "admin">("merchant");

  useEffect(() => {
    const client = supabase;

    if (!client) {
      setErrorMessage("系統暫時未能連接帳戶服務，請稍後再試。");
      setIsChecking(false);
      return;
    }

    let active = true;

    const isAdminReturn =
      new URLSearchParams(window.location.search).get("return") === "admin";
    setPortalContext(isAdminReturn ? "admin" : "merchant");

    const recoveryMarker =
      new URLSearchParams(window.location.search).get("type") === "recovery" ||
      new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "recovery";

    if (recoveryMarker) {
      void client.auth.getSession().then(({ data }) => {
        if (!active) return;
        if (data.session) {
          setHasRecoverySession(true);
          setIsChecking(false);
        }
      });
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY") {
        setHasRecoverySession(Boolean(session));
        setIsChecking(false);
        return;
      }

      if (event === "SIGNED_OUT") {
        setHasRecoverySession(false);
        setIsChecking(false);
      }
    });

    // A normal authenticated session must never unlock the password-recovery form.
    // PASSWORD_RECOVERY is the primary signal. The URL recovery marker + valid
    // session fallback covers the race where Supabase parsed the recovery URL
    // before this component subscribed to auth state changes.
    const verificationTimeout = window.setTimeout(() => {
      if (!active) return;
      setIsChecking(false);
    }, 5000);

    return () => {
      active = false;
      window.clearTimeout(verificationTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const client = supabase;

    if (!client) {
      setErrorMessage("系統暫時未能連接帳戶服務，請稍後再試。");
      return;
    }

    if (!hasRecoverySession) {
      setErrorMessage("重設密碼連結無效或已過期，請重新申請。");
      return;
    }

    if (newPassword.length < 12) {
      setErrorMessage("新密碼最少需要 12 個字元。");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("兩次輸入的密碼不相同。");
      return;
    }

    setIsSubmitting(true);

    const { error } = await client.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setIsSubmitting(false);
      setErrorMessage("未能更新密碼。請重新申請重設密碼連結後再試。");
      return;
    }

    setSuccessMessage("密碼已成功更新。");
    setNewPassword("");
    setConfirmPassword("");

    await client.auth.signOut();

    setHasRecoverySession(false);
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <p className={portalContext === "admin" ? "text-sm font-black text-purple-700" : "text-sm font-semibold text-primary-600"}>
            {portalContext === "admin" ? "HK Family Fun Admin" : "HK Family Fun Merchant Portal"}
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">設定新密碼</h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            新密碼最少需要 12 個字元。
          </p>

          {isChecking ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              正在驗證重設密碼連結…
            </div>
          ) : null}

          {!isChecking && !hasRecoverySession && !successMessage ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              重設密碼連結無效或已過期，請重新申請。
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
              {successMessage}
            </div>
          ) : null}

          {!isChecking && hasRecoverySession && !successMessage ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  新密碼
                </span>
                <input
                  required
                  minLength={12}
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  再次輸入新密碼
                </span>
                <input
                  required
                  minLength={12}
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "更新中…" : "更新密碼"}
              </button>
            </form>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 text-center text-sm">
            {!hasRecoverySession && !successMessage ? (
              <Link
                href={portalContext === "admin" ? "/admin/forgot-password" : "/merchant/forgot-password"}
                className={portalContext === "admin" ? "font-semibold text-purple-700 hover:text-purple-900" : "font-semibold text-primary-600 hover:text-primary-700"}
              >
                重新申請重設密碼
              </Link>
            ) : null}

            <Link
              href={portalContext === "admin" ? "/admin/login" : "/merchant/login"}
              className="font-semibold text-slate-600 hover:text-slate-900"
            >
              {portalContext === "admin" ? "返回 Admin 登入" : "返回商戶登入"}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
