"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import {
  clearAnalyticsIdentifiers,
  readConsent,
  saveConsent,
  type ConsentChoice,
} from "@/lib/privacy/cookie-consent";

type Copy = {
  title: string;
  summary: string;
  reject: string;
  accept: string;
  settings: string;
  save: string;
  close: string;
  details: string;
  privacy: string;
  essential: string;
  essentialDescription: string;
  analytics: string;
  analyticsDescription: string;
  active: string;
};

const copy: Record<AppLocale, Copy> = {
  "zh-Hant": {
    title: "你的 Cookies 選擇",
    summary: "必要 Cookies 用於登入及語言設定。只有經你同意，我們才會記錄網站瀏覽及活動互動作流量分析。",
    reject: "全部拒絕",
    accept: "全部接受",
    settings: "管理設定",
    save: "儲存選擇",
    close: "關閉設定",
    details: "Cookies 政策",
    privacy: "私隱政策",
    essential: "必要 Cookies",
    essentialDescription: "身份驗證、保安、語言及記住你的 Cookies 選擇；不能關閉。",
    analytics: "流量分析（可選）",
    analyticsDescription: "使用訪客及工作階段識別碼，統計頁面、活動瀏覽及外部連結點擊。",
    active: "必需",
  },
  "zh-Hans": {
    title: "你的 Cookies 选择",
    summary: "必要 Cookies 用于登录及语言设置。仅在你同意后，我们才会记录网站浏览与活动互动用于流量分析。",
    reject: "全部拒绝",
    accept: "全部接受",
    settings: "管理设置",
    save: "保存选择",
    close: "关闭设置",
    details: "Cookies 政策",
    privacy: "隐私政策",
    essential: "必要 Cookies",
    essentialDescription: "身份验证、安全、语言和记住 Cookies 选择；无法关闭。",
    analytics: "流量分析（可选）",
    analyticsDescription: "使用访客和会话识别码，统计页面、活动浏览与外部链接点击。",
    active: "必需",
  },
  en: {
    title: "Your cookie choices",
    summary: "Essential cookies support sign-in and language preferences. With your permission, we also measure visits and activity interactions.",
    reject: "Reject all",
    accept: "Accept all",
    settings: "Manage choices",
    save: "Save choices",
    close: "Close settings",
    details: "Cookie Policy",
    privacy: "Privacy Policy",
    essential: "Essential cookies",
    essentialDescription: "Authentication, security, language and remembering your preference; cannot be disabled.",
    analytics: "Analytics (optional)",
    analyticsDescription: "Uses visitor and session IDs to measure page views, event views and outbound clicks.",
    active: "Required",
  },
};

export default function CookiePreferences({ locale }: { locale: AppLocale }) {
  const [choice, setChoice] = useState<ConsentChoice>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const bannerRef = useRef<HTMLElement | null>(null);
  const c = copy[locale];

  useEffect(() => {
    const stored = readConsent();
    setChoice(stored);
    setAnalytics(stored === "analytics");
    setOpen(stored === null);
    setReady(true);
    // Retire identifiers from earlier versions when consent is absent or withdrawn.
    if (stored !== "analytics") clearAnalyticsIdentifiers();

    function openPreferences() {
      const previous = readConsent();
      setChoice(previous);
      setAnalytics(previous === "analytics");
      setCustomizing(true);
      setOpen(true);
    }
    window.addEventListener("hkff:open-cookie-settings", openPreferences);
    return () => window.removeEventListener("hkff:open-cookie-settings", openPreferences);
  }, []);

  // A fixed consent notice must never make the footer or legal links unreachable.
  // Reserve scrollable space below the document while it is visible. The space
  // grows when the visitor opens detailed settings and disappears after a choice.
  useEffect(() => {
    if (!open) return;
    const banner = bannerRef.current;
    if (!banner) return;

    const body = document.body;
    const originalInlinePadding = body.style.paddingBottom;
    const basePadding = Number.parseFloat(window.getComputedStyle(body).paddingBottom) || 0;
    const updateSpace = () => {
      const offset = Number.parseFloat(window.getComputedStyle(banner).bottom) || 0;
      const bannerHeight = banner.getBoundingClientRect().height;
      body.style.paddingBottom = `${basePadding + bannerHeight + offset + 16}px`;
    };

    const resizeObserver = new ResizeObserver(updateSpace);
    resizeObserver.observe(banner);
    window.addEventListener("resize", updateSpace);
    updateSpace();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSpace);
      body.style.paddingBottom = originalInlinePadding;
    };
  }, [open, customizing]);

  function apply(next: "analytics" | "essential") {
    saveConsent(next);
    setChoice(next);
    setAnalytics(next === "analytics");
    setCustomizing(false);
    setOpen(false);
  }

  if (!ready || !open) return null;

  const buttonBase = "min-h-11 rounded-xl border px-3 py-2.5 text-center text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700 sm:text-sm";
  const neutralButton = buttonBase + " border-slate-300 bg-white text-slate-900 hover:bg-slate-100";
  const choiceButton = buttonBase + " border-purple-700 bg-purple-50 text-purple-900 hover:bg-purple-100";

  return (
    <section
      role="region"
      ref={bannerRef}
      aria-label={c.title}
      className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[90] mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_10px_45px_rgba(15,23,42,0.2)] sm:inset-x-5 sm:p-5 lg:bottom-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-7">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-extrabold tracking-tight sm:text-base">{c.title}</h2>
            {choice !== null && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={c.close}
                className="rounded-md px-2 text-lg leading-none text-slate-500 hover:bg-slate-100 lg:hidden"
              >
                ×
              </button>
            )}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">{c.summary}</p>
          <div className="mt-1.5 flex items-center gap-3 text-xs">
            <Link href="/cookies" className="font-semibold text-purple-800 underline underline-offset-2">{c.details}</Link>
            <Link href="/privacy" className="font-semibold text-purple-800 underline underline-offset-2">{c.privacy}</Link>
          </div>
        </div>

        <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:w-[420px]" aria-label={c.title}>
          <button type="button" onClick={() => apply("essential")} className={choiceButton}>{c.reject}</button>
          <button type="button" onClick={() => apply("analytics")} className={choiceButton}>{c.accept}</button>
          {customizing ? (
            <button
              type="button"
              onClick={() => apply(analytics ? "analytics" : "essential")}
              className={neutralButton + " col-span-2 sm:col-span-1"}
            >
              {c.save}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCustomizing(true)}
              aria-expanded={false}
              aria-controls="hkff-cookie-category-settings"
              className={neutralButton + " col-span-2 sm:col-span-1"}
            >
              {c.settings}
            </button>
          )}
        </div>
      </div>

      {customizing && (
        <div
          id="hkff-cookie-category-settings"
          className="mt-4 max-h-[40vh] space-y-3 overflow-y-auto border-t border-slate-200 pt-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <div>
                <h3 className="text-sm font-bold">{c.essential}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">{c.essentialDescription}</p>
              </div>
              <span className="h-fit shrink-0 rounded-full bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600">{c.active}</span>
            </div>
            <label className="flex cursor-pointer justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <span>
                <span className="block text-sm font-bold">{c.analytics}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">{c.analyticsDescription}</span>
              </span>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-purple-700"
                aria-label={c.analytics}
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
}

/** Footer control remains available after consent for opt-out and withdrawal. */
export function CookieSettingsButton({ locale }: { locale: AppLocale }) {
  const label =
    locale === "en" ? "Cookie settings" : locale === "zh-Hans" ? "Cookies 设置" : "Cookies 設定";
  return (
    <button
      type="button"
      className="hover:text-purple-700 focus-visible:underline"
      onClick={() => window.dispatchEvent(new Event("hkff:open-cookie-settings"))}
    >
      {label}
    </button>
  );
}
