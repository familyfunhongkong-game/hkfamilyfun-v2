import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type AppLocale,
} from "@/lib/i18n/config";

export function getClientLocale(): AppLocale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;

  return normalizeLocale(document.documentElement.lang);
}
