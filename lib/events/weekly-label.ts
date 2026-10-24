import type { AppLocale } from "@/lib/i18n/config";

/** Human-readable Hong Kong weekday schedule, excluding invalid weekday values. */
export function formatWeeklyDays(days: number[] | undefined, locale: AppLocale): string {
  if (!Array.isArray(days)) return "";
  const normalized = [...new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  if (!normalized.length) return "";
  if (normalized.length === 7) {
    return locale === "en" ? "Every day" : locale === "zh-Hans" ? "每天开放" : "每日開放";
  }
  if (locale === "en") {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `Every ${normalized.map((day) => names[day]).join(", ")}`;
  }
  const chinese = ["日", "一", "二", "三", "四", "五", "六"];
  return `逢星期${normalized.map((day) => chinese[day]).join("、")}`;
}
