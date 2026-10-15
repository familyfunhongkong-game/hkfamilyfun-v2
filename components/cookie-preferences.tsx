"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { clearAnalyticsIdentifiers, readConsent, saveConsent, type ConsentChoice } from "@/lib/privacy/cookie-consent";

type Copy = {
  title: string; summary: string; essential: string; analytics: string;
  essentialOnly: string; accept: string; settings: string; save: string;
  close: string; details: string; required: string; optional: string;
};

const copy: Record<AppLocale, Copy> = {
  "zh-Hant": {
    title: "Cookies 與私隱選擇",
    summary: "我們使用必要的登入和語言設定，以及在你同意後使用流量分析，了解哪些親子活動最受歡迎。拒絕分析不會影響網站基本功能。",
    essential: "必要功能", analytics: "匿名化用途並不保證：分析使用持續訪客識別碼，記錄頁面及活動互動。",
    essentialOnly: "只使用必要功能", accept: "同意流量分析",
    settings: "管理設定", save: "儲存選擇", close: "關閉",
    details: "Cookies 及儲存詳情", required: "必須啟用：身份驗證、保安、語言和偏好紀錄。",
    optional: "流量分析（可選擇）：會儲存訪客及工作階段 ID，記錄瀏覽與活動連結點擊。",
  },
  "zh-Hans": {
    title: "Cookies 与隐私选择",
    summary: "我们使用必要的登录和语言设置，并仅在你同意后使用流量分析，了解哪些亲子活动更受欢迎。拒绝分析不影响网站基本功能。",
    essential: "必要功能", analytics: "分析使用持久访客识别码，并非保证完全匿名。",
    essentialOnly: "仅使用必要功能", accept: "同意流量分析",
    settings: "管理设置", save: "保存选择", close: "关闭",
    details: "Cookies 与存储详情", required: "必须启用：身份验证、安全、语言和偏好记录。",
    optional: "流量分析（可选）：储存访客和会话 ID，记录页面浏览及活动链接点击。",
  },
  en: {
    title: "Cookies & Privacy Choices",
    summary: "We use essential sign-in and language preferences. With your permission, we also measure which family activities are popular. Rejecting analytics will not affect basic features.",
    essential: "Essential functions", analytics: "Analytics uses a persistent visitor identifier and is not guaranteed to be anonymous.",
    essentialOnly: "Essential only", accept: "Allow analytics",
    settings: "Manage settings", save: "Save preferences", close: "Close",
    details: "Cookie & storage details", required: "Always active: authentication, security, language and your preference.",
    optional: "Optional analytics: stores visitor/session IDs and records page views and event-link interactions.",
  },
};

export default function CookiePreferences({ locale }: { locale: AppLocale }) {
  const [choice, setChoice] = useState<ConsentChoice>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const c = copy[locale];

  useEffect(() => {
    const stored = readConsent();
    setChoice(stored);
    setAnalytics(stored === "analytics");
    setOpen(stored === null);
    setReady(true);
    // Stop old pre-consent identifiers from earlier website releases being reused.
    if (stored !== "analytics") clearAnalyticsIdentifiers();

    function openPreferences() {
      setAnalytics(readConsent() === "analytics");
      setCustomizing(true);
      setOpen(true);
    }
    window.addEventListener("hkff:open-cookie-settings", openPreferences);
    return () => window.removeEventListener("hkff:open-cookie-settings", openPreferences);
  }, []);

  function apply(next: "analytics" | "essential") {
    saveConsent(next);
    setChoice(next);
    setAnalytics(next === "analytics");
    setCustomizing(false);
    setOpen(false);
  }

  if (!ready || !open) return null;

  return <section
    aria-label={c.title}
    role="region"
    className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[90] mx-auto max-w-xl rounded-2xl border border-purple-200 bg-white p-4 text-slate-900 shadow-2xl sm:inset-x-6 sm:p-5 lg:bottom-5"
  >
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-base font-black sm:text-lg">{c.title}</h2>
      {choice !== null ? (
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-sm text-slate-500 hover:bg-slate-100" aria-label={c.close}>✕</button>
      ) : null}
    </div>
    <p className="mt-2 text-sm leading-6 text-slate-600">{c.summary}</p>
    {customizing && (
      <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold">{c.essential}<span className="mt-1 block text-xs font-normal text-slate-600">{c.required}</span></p>
          <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">Always on</span>
        </div>
        <label className="flex cursor-pointer items-start justify-between gap-3 border-t border-slate-200 pt-3">
          <span className="text-sm font-bold">{c.optional}<span className="mt-1 block text-xs font-normal text-slate-600">{c.analytics}</span></span>
          <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-purple-700" aria-label={c.optional}/>
        </label>
      </div>
    )}
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {customizing ? (
        <button type="button" onClick={() => apply(analytics ? "analytics" : "essential")}
          className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-bold text-white">{c.save}</button>
      ) : (
        <>
          <button type="button" onClick={() => apply("essential")} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800">{c.essentialOnly}</button>
          <button type="button" onClick={() => apply("analytics")} className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-bold text-white">{c.accept}</button>
          <button type="button" onClick={() => setCustomizing(true)} className="rounded-xl px-3 py-2.5 text-sm font-bold text-purple-800 hover:bg-purple-50">{c.settings}</button>
        </>
      )}
      <Link href="/cookies" className="self-center text-xs font-semibold text-purple-800 underline">{c.details}</Link>
    </div>
  </section>;
}

/** Always-accessible footer control; withdrawing opt-in never requires a login. */
export function CookieSettingsButton({ locale }: { locale: AppLocale }) {
  const label = locale === "en" ? "Cookie settings" : locale === "zh-Hans" ? "Cookies 设置" : "Cookies 設定";
  return <button type="button" className="hover:text-purple-700"
    onClick={() => window.dispatchEvent(new Event("hkff:open-cookie-settings"))}>
    {label}
  </button>;
}
