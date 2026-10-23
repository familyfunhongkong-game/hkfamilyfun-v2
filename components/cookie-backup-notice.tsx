"use client";

import { useEffect, useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";
import { saveEssentialBackup } from "@/lib/privacy/cookie-consent";

/**
 * If the POST worked but the browser refused its Set-Cookie header, a privacy-safe
 * essential-only choice can still be remembered locally. Never activate analytics.
 */
export default function CookieBackupNotice({ locale }: { locale: AppLocale }) {
  const [outcome, setOutcome] = useState<"saved" | "blocked" | null>(null);
  useEffect(() => {
    setOutcome(saveEssentialBackup() ? "saved" : "blocked");
  }, []);
  if (!outcome) return null;
  const message = {
    "zh-Hant": outcome === "saved"
      ? "已在這個瀏覽器的本機網站儲存中記住「只使用必要 Cookies」。不會開啟流量分析；若清除網站資料，需重新選擇。"
      : "瀏覽器同時封鎖 Cookies 及本機網站儲存，無法記住選擇。你仍可使用公開活動功能，可選流量分析維持關閉。",
    "zh-Hans": outcome === "saved"
      ? "已在此浏览器的本地网站存储中记住“仅使用必要 Cookies”。不会开启流量分析；清除网站数据后需重新选择。"
      : "浏览器同时阻止了 Cookies 和本地网站存储，无法保存选择。仍可使用公开活动，流量分析保持关闭。",
    en: outcome === "saved"
      ? "Essential-only has been remembered using local site storage in this browser. Analytics remains off; clearing site data will reset the choice."
      : "Your browser blocks both cookies and local site storage, so the choice cannot persist. Analytics remains off, and public events remain available.",
  }[locale];
  return (
    <p role="status" aria-live="polite"
      className={`mt-3 rounded-xl border px-4 py-3 text-sm font-semibold leading-6 ${outcome === "saved" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-950"}`}>
      {message}
    </p>
  );
}
