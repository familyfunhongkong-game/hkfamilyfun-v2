"use client";

import Link from "next/link";
import MerchantCollectionNotice from "@/components/MerchantCollectionNotice";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { socialSignInAvailability } from "@/lib/merchant-google-provider";
import {
  CURRENT_MERCHANT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from "@/lib/merchant-legal";

export default function MerchantRegisterPanel() {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);
  const [availableSocial, setAvailableSocial] = useState({ google: false, facebook: false });

  useEffect(() => {
    let active = true;
    void Promise.all([
      socialSignInAvailability("google"),
      socialSignInAvailability("facebook"),
    ]).then(([google, facebook]) => {
      if (active) setAvailableSocial({ google: google === "enabled", facebook: facebook === "enabled" });
    }).catch(() => {
      if (active) setAvailableSocial({ google: false, facebook: false });
    });
    return () => { active = false; };
  }, []);


  const signInWithSocial = async (provider: "google" | "facebook") => {
    if (socialLoading) return;
    const label = provider === "google" ? "Google" : "Facebook";
    setErrorMessage("");
    setSocialLoading(provider);
    try {
      const availability = await socialSignInAvailability(provider);
      if (availability !== "enabled") {
        setErrorMessage(`暫時未能使用 ${label} 登入，請改用電郵登入。`);
        return;
      }
      if (!supabase) {
        setErrorMessage("登入服務暫時無法連線，請稍後重試。");
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/merchant/dashboard` },
      });
      if (error) {
        setErrorMessage(`${label} 登入未能啟動。請檢查登入設定或使用電郵及密碼登入。`);
      }
    } catch {
      setErrorMessage(`${label} 登入暫時未能使用，請稍後重試或使用電郵登入。`);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!supabase) {
      setErrorMessage("註冊服務暫時未能連接，請稍後再試。");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("密碼最少需要 8 個字元。");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("兩次輸入的密碼不一致。");
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage("請先閱讀並同意商戶條款及私隱政策。");
      return;
    }

    setIsSubmitting(true);

    const acceptedAt = new Date().toISOString();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/merchant/login`,
        data: {
          account_type: "merchant",
          display_name: contactName,
          business_name: businessName,
          contact_name: contactName,
          contact_phone: contactPhone,
          website_url: websiteUrl,
          terms_accepted: true,
          terms_accepted_at: acceptedAt,
          terms_version: CURRENT_MERCHANT_TERMS_VERSION,
          privacy_accepted: true,
          privacy_accepted_at: acceptedAt,
          privacy_version: CURRENT_PRIVACY_VERSION,
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      const detail = error.message?.toLowerCase() || "";
      setErrorMessage(
        detail.includes("password") && (detail.includes("short") || detail.includes("length"))
          ? "密碼未符合帳戶安全要求，請使用至少 8 個字元，並嘗試混合英文字母及數字。"
          : detail.includes("rate") || detail.includes("email rate")
            ? "系統暫時限制發送驗證電郵，請稍後再試。"
            : detail.includes("already registered") || detail.includes("already exists")
              ? "此電郵可能已有帳戶，請直接登入或重設密碼。"
              : "未能完成登記，請稍後重試；如已有帳戶，請使用下方登入或忘記密碼連結。"
      );
      return;
    }

    // Supabase may return 200 with a masked/fake user on an existing email.
    // That is intentionally not a successful merchant registration.
    if (!data.user || data.user.identities?.length === 0) {
      setMessage(
        "如果此電郵已經註冊，系統不會另外建立帳戶或再寄出確認信。請使用原有帳戶登入；如忘記密碼，可使用重設密碼功能。"
      );
      return;
    }

    setMessage(
      "登記申請已送出。如果這是全新帳戶，請檢查電郵並完成驗證，然後登入 Merchant Portal。帳戶通過審批前不會公開活動。"
    );
  };

  return (
    <div className="w-full">
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-primary-600">
            HK Family Fun Merchant Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            商戶免費登記
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            登記後可免費建立活動草稿、上載活動圖片、預覽 Event Post，並提交平台審批；一般活動正常刊登不收費。
          </p>

          {message ? (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {message}
            </div>
          ) : null}

          {errorMessage ? (
            <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {(availableSocial.google || availableSocial.facebook) && (
          <>
          <div className="mt-6 grid gap-3">
            {availableSocial.google && <button type="button" disabled={socialLoading !== null}
              onClick={() => void signInWithSocial("google")}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-950 hover:bg-slate-50 disabled:opacity-60">
              <span aria-hidden="true" className="font-black text-blue-600">G</span>
              {socialLoading === "google" ? "正在連接 Google…" : "使用 Google 登入"}
            </button>}
            {availableSocial.facebook && <button type="button" disabled={socialLoading !== null}
              onClick={() => void signInWithSocial("facebook")}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-bold text-white hover:bg-[#166FE5] disabled:opacity-60">
              <span aria-hidden="true" className="text-lg font-black">f</span>
              {socialLoading === "facebook" ? "正在連接 Facebook…" : "使用 Facebook 登入"}
            </button>}
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">首次使用 Google 或 Facebook 登入，請登入後完成商戶資料及審批申請。</p>
          <div className="my-5 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-200" />或使用電郵建立帳戶<span className="h-px flex-1 bg-slate-200" /></div>
          </>
          )}
          <div className="mt-5"><MerchantCollectionNotice /></div>
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                商戶／機構名稱 *
              </span>
              <input
                required
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="例如：ABC 親子教育中心"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                聯絡人姓名 *
              </span>
              <input
                required
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="請輸入聯絡人姓名"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                聯絡電話
              </span>
              <input
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                placeholder="例如：5701 8297"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                商戶網站（可選）
              </span>
              <input
                type="url"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                商戶電郵 *
              </span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                密碼 *
              </span>
              <input
                required
                minLength={8}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="最少 8 個字元"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                再次輸入密碼 *
              </span>
              <input
                required
                minLength={8}
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="再次輸入密碼"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input
                required
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm leading-6 text-slate-600">
                我已閱讀並同意{" "}
                <Link
                  href="/merchant-terms"
                  target="_blank"
                  className="font-semibold text-primary-600 hover:text-primary-700"
                >
                  商戶條款及活動提交政策
                </Link>
                {" "}及{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-semibold text-primary-600 hover:text-primary-700"
                >
                  私隱政策
                </Link>
                。
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting || !acceptedTerms}
              className="w-full rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "正在建立帳戶…" : "建立商戶帳戶"}
            </button>
          </form>

          <div className="mt-5 flex justify-center gap-5 text-sm font-semibold text-primary-700">
            <Link href="/merchant/account?mode=login" className="underline">已有帳戶？登入</Link>
            <Link href="/merchant/forgot-password" className="underline">收唔到確認信／忘記密碼？</Link>
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            已有商戶帳戶？{" "}
            <Link
              href="/merchant/account?mode=login"
              className="font-semibold text-primary-600 hover:text-primary-700"
            >
              立即登入
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
