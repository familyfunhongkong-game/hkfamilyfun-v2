import type { AppLocale } from "@/lib/i18n/config";

function parseISODate(value?: string | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const result = new Date(Date.UTC(year, month - 1, day));
  if (
    result.getUTCFullYear() !== year ||
    result.getUTCMonth() !== month - 1 ||
    result.getUTCDate() !== day
  ) return null;
  return result;
}

/** Display Hong Kong calendar dates without losing the year across year boundaries. */
export function formatEventCardDate(
  dateText: string | undefined,
  endText: string | undefined,
  locale: AppLocale,
  compact = false,
): string {
  const start = parseISODate(dateText);
  if (!start) return locale === "en" ? "Date TBC" : "日期待定";
  const end = parseISODate(endText);
  const crossYear = !!end && end.getUTCFullYear() !== start.getUTCFullYear();
  const compactFormat = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    if (locale === "en") {
      return `${day}/${String(month).padStart(2, "0")}/${year}`;
    }
    return `${crossYear ? `${year}年` : ""}${month}月${day}日`;
  };
  const longFormatter = new Intl.DateTimeFormat(
    locale === "en" ? "en-HK" : locale === "zh-Hans" ? "zh-CN" : "zh-HK",
    {
      ...(crossYear ? { year: "numeric" as const } : {}),
      month: "short",
      day: "numeric",
      weekday: "short",
      timeZone: "UTC",
    },
  );
  const fmt = compact ? compactFormat : (date: Date) => longFormatter.format(date);
  const first = fmt(start);
  return end && start.getTime() !== end.getTime() ? `${first} – ${fmt(end)}` : first;
}
