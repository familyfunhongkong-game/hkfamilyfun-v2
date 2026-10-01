import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  normalizeLocale,
  type AppLocale,
} from "@/lib/i18n/config";

export async function getServerLocale(): Promise<AppLocale> {
  try {
    const store = await cookies();
    return normalizeLocale(store.get(LOCALE_COOKIE)?.value || DEFAULT_LOCALE);
  } catch {
    return DEFAULT_LOCALE;
  }
}
