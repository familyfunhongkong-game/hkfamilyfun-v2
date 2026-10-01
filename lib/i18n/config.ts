export const SUPPORTED_LOCALES = ["zh-Hant", "zh-Hans", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "zh-Hant";
export const LOCALE_COOKIE = "hkff_locale";

export function normalizeLocale(value?: string | null): AppLocale {
  const text = String(value || "").trim().toLowerCase();

  if (
    text === "zh-hans" ||
    text === "zh-cn" ||
    text === "zh-sg" ||
    text === "sc" ||
    text === "cn"
  ) {
    return "zh-Hans";
  }

  if (
    text === "en" ||
    text.startsWith("en-")
  ) {
    return "en";
  }

  return "zh-Hant";
}

export function localeLabel(locale: AppLocale) {
  if (locale === "zh-Hans") return "简";
  if (locale === "en") return "EN";
  return "繁";
}

export function localeHtmlLang(locale: AppLocale) {
  if (locale === "zh-Hans") return "zh-Hans";
  if (locale === "en") return "en";
  return "zh-Hant-HK";
}

export function localizedText(
  locale: AppLocale,
  values: {
    tc?: string | null;
    sc?: string | null;
    en?: string | null;
    fallback?: string | null;
  },
) {
  const tc = String(values.tc || "").trim();
  const sc = String(values.sc || "").trim();
  const en = String(values.en || "").trim();
  const fallback = String(values.fallback || "").trim();

  if (locale === "zh-Hans") return sc || tc || en || fallback;
  if (locale === "en") return en || tc || sc || fallback;
  return tc || sc || en || fallback;
}
