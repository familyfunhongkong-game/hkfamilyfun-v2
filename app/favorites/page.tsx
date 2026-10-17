"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getClientLocale } from "@/lib/i18n/client";
import { localizedText, type AppLocale } from "@/lib/i18n/config";
import { getExtraPublicMessages } from "@/lib/i18n/public-extra-messages";
import PublicEventCard from "@/components/events/PublicEventCard";
import type { Event } from "@/lib/types";
import { formatEventAge } from "@/lib/events/age-display";
import { addCalendarDays, eventOccursOn } from "@/lib/events/recurrence";

const FAVORITES_STORAGE_KEY = "hkff_favorite_event_ids";

type FavoriteEvent = {
  id: string;
  title_tc?: string | null;
  title_sc?: string | null;
  title_en?: string | null;
  short_description_tc?: string | null;
  short_description_sc?: string | null;
  short_description_en?: string | null;
  organizer_name?: string | null;
  merchant_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  recurrence_type?: string | null;
  recurrence_weekdays?: number[] | null;
  recurrence_include_dates?: string[] | null;
  recurrence_exclude_dates?: string[] | null;
  start_time?: string | null;
  end_time?: string | null;
  district?: string | null;
  mtr_station?: string | null;
  cover_image_url?: string | null;
  price_type?: "free" | "paid" | "mixed" | null;
  price_display_mode?: string | null;
  price_label?: string | null;
  min_price?: number | string | null;
  max_price?: number | string | null;
  age_min?: number | null;
  age_max?: number | null;
  age_groups?: unknown;
  tags?: unknown;
  activity_category?: string | null;
  category?: string | null;
  is_free?: boolean | null;
  is_sen_friendly?: boolean | null;
  is_indoor?: boolean | null;
  registration_url?: string | null;
  booking_url?: string | null;
  official_url?: string | null;
  source_url?: string | null;
};

function readFavoriteIds(): string[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return Array.from(
      new Set(
        parsed
          .map((item) => String(item || "").trim())
          .filter(Boolean),
      ),
    );
  } catch {
    return [];
  }
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 8);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\n，、]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  return [];
}

function priceText(event: FavoriteEvent, locale: AppLocale) {
  const free =
    Boolean(event.is_free) ||
    event.price_type === "free" ||
    String(event.price_display_mode || "").toLowerCase() === "free";

  if (free) return locale === "en" ? "Free" : locale === "zh-Hans" ? "免费" : "免費";
  if (event.price_label?.trim()) return event.price_label.trim();

  const min = Number(event.min_price);
  const max = Number(event.max_price);
  if (Number.isFinite(min) && min >= 0) {
    if (Number.isFinite(max) && max >= 0 && max !== min) return `HK$${min}–${max}`;
    if (min > 0) return `HK$${min}`;
  }

  return locale === "en"
    ? "See official details"
    : locale === "zh-Hans"
      ? "详情请见官方资料"
      : "詳情請見官方資料";
}

function ageText(event: FavoriteEvent, locale: AppLocale) {
  return formatEventAge(
    {
      ageGroups: event.age_groups,
      ageMin: event.age_min,
      ageMax: event.age_max,
    },
    locale,
  );
}

function timeText(event: FavoriteEvent, locale: AppLocale) {
  const start = String(event.start_time || "").slice(0, 5);
  const end = String(event.end_time || "").slice(0, 5);
  if (!start) return locale === "en" ? "Time TBC" : locale === "zh-Hans" ? "时间待定" : "時間待定";
  return end ? `${start} - ${end}` : start;
}

function toPublicEvent(event: FavoriteEvent, locale: AppLocale): Event {
  const title = localizedText(locale, {
    tc: event.title_tc,
    sc: event.title_sc,
    en: event.title_en,
    fallback: locale === "en" ? "Untitled event" : "未命名活動",
  });
  const shortDescription = localizedText(locale, {
    tc: event.short_description_tc,
    sc: event.short_description_sc,
    en: event.short_description_en,
  });
  const free =
    Boolean(event.is_free) ||
    event.price_type === "free" ||
    String(event.price_display_mode || "").toLowerCase() === "free";

  return {
    id: event.id,
    title,
    shortDescription,
    description: shortDescription,
    date: event.start_date || "",
    endDate: event.end_date || undefined,
    time: timeText(event, locale),
    district: event.district || (locale === "en" ? "Hong Kong" : "香港"),
    mtrStation:
      event.mtr_station ||
      (locale === "en" ? "MTR TBC" : locale === "zh-Hans" ? "港铁站待定" : "港鐵站待定"),
    ageRange: ageText(event, locale),
    organizer:
      event.organizer_name ||
      event.merchant_name ||
      (locale === "en" ? "Organizer TBC" : locale === "zh-Hans" ? "主办方待定" : "主辦方待定"),
    tags: normalizeTags(event.tags),
    category:
      event.activity_category ||
      event.category ||
      (locale === "en" ? "Family Activity" : locale === "zh-Hans" ? "亲子活动" : "親子活動"),
    priceType: free ? "free" : event.price_type || "paid",
    price: priceText(event, locale),
    senFriendly: Boolean(event.is_sen_friendly),
    indoor: Boolean(event.is_indoor),
    image:
      event.cover_image_url ||
      "https://placehold.co/1200x675/f5f3ff/7c3aed?text=HK+Family+Fun",
    officialLink:
      event.registration_url ||
      event.booking_url ||
      event.official_url ||
      event.source_url ||
      undefined,
  };
}


function hkToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function nextOccurrence(event: FavoriteEvent, today: string) {
  const start = (event.start_date || "").slice(0, 10);
  const end = (event.end_date || event.start_date || "").slice(0, 10);
  if (!start || !end || end < today) return null;
  const from = start > today ? start : today;
  if (event.recurrence_type !== "weekly") return from;
  let date = from;
  for (let step = 0; step < 370 && date <= end; step++) {
    if (eventOccursOn({
      startDate: start,
      endDate: end,
      recurrenceType: "weekly",
      recurrenceWeekdays: event.recurrence_weekdays,
      recurrenceIncludeDates: event.recurrence_include_dates,
      recurrenceExcludeDates: event.recurrence_exclude_dates,
    }, date)) return date;
    date = addCalendarDays(date, 1);
  }
  return null;
}

function getEventStatus(event: FavoriteEvent, today: string) {
  if (!event.start_date) return "unknown";
  return nextOccurrence(event, today) ? "upcoming" : "expired";
}

function eventSortDate(event: FavoriteEvent, today: string) {
  return nextOccurrence(event, today) || "9999-12-31";
}

function translate(locale: AppLocale, traditional: string, simplified: string, english: string) {
  return locale === "en" ? english : locale === "zh-Hans" ? simplified : traditional;
}

export default function FavoritesPage() {
  const [locale, setLocale] = useState<AppLocale>("zh-Hant");
  const [events, setEvents] = useState<FavoriteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [tab, setTab] = useState<"upcoming" | "expired">("upcoming");
  const [sort, setSort] = useState<"soonest" | "latest" | "saved">("soonest");
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [visibleCount, setVisibleCount] = useState(20);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const today = hkToday();
  const m = getExtraPublicMessages(locale).favorites;
  const t = (tc: string, sc: string, en: string) => translate(locale, tc, sc, en);

  useEffect(() => {
    let ignore = false;
    const activeLocale = getClientLocale();
    const activeMessages = getExtraPublicMessages(activeLocale).favorites;
    setLocale(activeLocale);

    async function loadFavorites() {
      const ids = readFavoriteIds();
      setSavedIds(ids);
      if (!ids.length) {
        setEvents([]);
        setLoading(false);
        return;
      }
      try {
        const collected: FavoriteEvent[] = [];
        for (let offset = 0; offset < ids.length; offset += 100) {
          const response = await fetch("/api/saved-events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ids.slice(offset, offset + 100) }),
            cache: "no-store",
          });
          if (!response.ok) throw new Error(activeMessages.loadFailed);
          const payload = (await response.json()) as { events?: FavoriteEvent[] };
          if (ignore) return;
          collected.push(...(payload.events || []));
        }
        if (!ignore) {
          setEvents(collected);
          setErrorText("");
        }
      } catch {
        if (!ignore) setErrorText(activeMessages.loadFailed);
      }
      if (!ignore) setLoading(false);
    }

    void loadFavorites();
    const syncIds = () => setSavedIds(readFavoriteIds());
    window.addEventListener("storage", syncIds);
    window.addEventListener("hkff:favorites-changed", syncIds);
    return () => {
      ignore = true;
      window.removeEventListener("storage", syncIds);
      window.removeEventListener("hkff:favorites-changed", syncIds);
    };
  }, []);

  function removeFavorite(id: string) {
    const nextIds = readFavoriteIds().filter((item) => item !== id);
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextIds));
    window.dispatchEvent(new CustomEvent("hkff:favorites-changed"));
    setSavedIds(nextIds);
    setEvents((current) => current.filter((event) => event.id !== id));
  }

  const activeEvents = events.filter((event) => savedIds.includes(event.id));
  const upcomingCount = activeEvents.filter((event) => getEventStatus(event, today) !== "expired").length;
  const expiredCount = activeEvents.length - upcomingCount;
  const districts = Array.from(new Set(activeEvents.map((event) => event.district || "").filter(Boolean))).sort();
  const categories = Array.from(new Set(activeEvents.map((event) => event.activity_category || event.category || "").filter(Boolean))).sort();
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = activeEvents
    .filter((event) => tab === "expired" ? getEventStatus(event, today) === "expired" : getEventStatus(event, today) !== "expired")
    .filter((event) => !district || event.district === district)
    .filter((event) => !category || (event.activity_category || event.category) === category)
    .filter((event) => {
      if (!price) return true;
      const free = Boolean(event.is_free) || event.price_type === "free" || event.price_display_mode === "free";
      return price === "free" ? free : !free;
    })
    .filter((event) => {
      if (!normalizedQuery) return true;
      return [
        event.title_tc, event.title_sc, event.title_en,
        event.short_description_tc, event.short_description_sc, event.short_description_en,
        event.organizer_name, event.merchant_name, event.district, event.mtr_station,
        event.activity_category, event.category, ...normalizeTags(event.tags),
      ].some((value) => String(value || "").toLocaleLowerCase().includes(normalizedQuery));
    })
    .sort((a, b) => {
      if (sort === "saved") return savedIds.indexOf(a.id) - savedIds.indexOf(b.id);
      const aDate = tab === "expired" ? (a.end_date || a.start_date || "") : eventSortDate(a, today);
      const bDate = tab === "expired" ? (b.end_date || b.start_date || "") : eventSortDate(b, today);
      return sort === "latest" || tab === "expired" ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate);
    });
  const displayed = filtered.slice(0, visibleCount);
  const controlClass = "min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-r from-pink-600 to-purple-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-8">
          <p className="text-sm font-black text-white/80">{m.kicker}</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{m.title}</h1>
          <p className="mt-3 text-sm leading-6 text-white/85">{m.intro}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
        {errorText ? <div role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{errorText}</div> : null}
        {loading ? <div className="rounded-2xl bg-white p-10 text-center font-bold text-slate-500">{m.loading}</div> : null}
        {!loading && !activeEvents.length ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <div className="text-4xl text-rose-500">♡</div>
            <h2 className="mt-4 text-2xl font-black">{m.emptyTitle}</h2>
            <p className="mt-2 text-sm text-slate-500">{m.emptyDesc}</p>
            <Link href="/events" className="mt-6 inline-flex rounded-full bg-purple-700 px-6 py-3 text-sm font-bold text-white">{m.browse}</Link>
          </div>
        ) : null}

        {!loading && activeEvents.length ? (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2" role="tablist" aria-label={t("收藏分類", "收藏分类", "Saved event status")}>
                <button type="button" role="tab" aria-selected={tab === "upcoming"} onClick={() => { setTab("upcoming"); setVisibleCount(20); }}
                  className={tab === "upcoming" ? "rounded-full bg-purple-700 px-4 py-2.5 text-sm font-black text-white" : "rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"}>
                  {t("即將舉行", "即将举行", "Upcoming")} ({upcomingCount})
                </button>
                <button type="button" role="tab" aria-selected={tab === "expired"} onClick={() => { setTab("expired"); setVisibleCount(20); }}
                  className={tab === "expired" ? "rounded-full bg-purple-700 px-4 py-2.5 text-sm font-black text-white" : "rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"}>
                  {t("已過期", "已过期", "Past events")} ({expiredCount})
                </button>
              </div>
              <div className="flex rounded-xl border border-slate-200 bg-white p-1" aria-label={t("顯示方式", "显示方式", "Layout")}>
                <button type="button" aria-pressed={layout === "list"} onClick={() => setLayout("list")} className={layout === "list" ? "rounded-lg bg-purple-100 px-3 py-2 text-xs font-bold text-purple-800" : "px-3 py-2 text-xs font-semibold text-slate-600"}>{t("列表", "列表", "List")}</button>
                <button type="button" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")} className={layout === "grid" ? "rounded-lg bg-purple-100 px-3 py-2 text-xs font-bold text-purple-800" : "px-3 py-2 text-xs font-semibold text-slate-600"}>{t("圖片", "图片", "Cards")}</button>
              </div>
            </div>
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label htmlFor="saved-event-search" className="mb-2 block text-sm font-black text-slate-800">{t("搜尋收藏活動", "搜索收藏活动", "Search saved events")}</label>
              <input id="saved-event-search" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setVisibleCount(20); }}
                placeholder={t("活動名稱、主辦方、地區、關鍵字...", "活动名称、主办方、地区、关键词...", "Event, organizer, district or keyword...")} className={controlClass + " w-full"} />
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <select aria-label={t("地區", "地区", "District")} value={district} onChange={(e) => { setDistrict(e.target.value); setVisibleCount(20); }} className={controlClass}>
                  <option value="">{t("所有地區", "所有地区", "All districts")}</option>
                  {districts.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select aria-label={t("活動類別", "活动类别", "Category")} value={category} onChange={(e) => { setCategory(e.target.value); setVisibleCount(20); }} className={controlClass}>
                  <option value="">{t("所有類別", "所有类别", "All categories")}</option>
                  {categories.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select aria-label={t("收費類型", "收费类型", "Price")} value={price} onChange={(e) => { setPrice(e.target.value); setVisibleCount(20); }} className={controlClass}>
                  <option value="">{t("所有收費", "所有收费", "Any price")}</option>
                  <option value="free">{t("免費", "免费", "Free")}</option>
                  <option value="paid">{t("收費", "收费", "Paid")}</option>
                </select>
                <select aria-label={t("排序", "排序", "Sort")} value={sort} onChange={(e) => setSort(e.target.value as "soonest" | "latest" | "saved")} className={controlClass}>
                  <option value="soonest">{t("日期最近優先", "日期最近优先", "Nearest date first")}</option>
                  <option value="latest">{t("日期最遠優先", "日期最远优先", "Farthest date first")}</option>
                  <option value="saved">{t("收藏先後次序", "收藏先后次序", "Saved order")}</option>
                </select>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p aria-live="polite" className="text-xs font-semibold text-slate-500">{t("找到", "找到", "Showing")} {filtered.length} {t("個活動", "个活动", "events")}</p>
                <button type="button" onClick={() => { setQuery(""); setDistrict(""); setCategory(""); setPrice(""); setSort("soonest"); setVisibleCount(20); }} className="text-xs font-bold text-purple-700 hover:underline">
                  {t("清除篩選", "清除筛选", "Clear filters")}
                </button>
              </div>
            </div>
            {!filtered.length ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">{t("暫時沒有符合條件的收藏活動。", "暂无符合条件的收藏活动。", "No saved events match these filters.")}</div>
            ) : layout === "grid" ? (
              <div className="grid items-stretch gap-5 md:grid-cols-2">
                {displayed.map((event) => (
                  <div key={event.id} className="relative">
                    <PublicEventCard event={toPublicEvent(event, locale)} locale={locale} />
                    <button type="button" onClick={() => removeFavorite(event.id)} className="absolute right-3 top-3 z-30 rounded-full bg-white px-3 py-2 text-xs font-black text-rose-700 shadow-md">
                      ♥ {m.remove}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {displayed.map((event) => {
                  const publicEvent = toPublicEvent(event, locale);
                  return (
                    <article key={event.id} className="flex items-center gap-3 border-b border-slate-100 p-3 last:border-0 sm:gap-4 sm:p-4">
                      <Link href={"/events/" + event.id} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-purple-50 sm:h-24 sm:w-28">
                        {event.cover_image_url ? <img src={event.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-center text-xs font-bold text-purple-500">{t("親子活動", "亲子活动", "Family fun")}</div>}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={"/events/" + event.id} className="line-clamp-2 text-sm font-black text-slate-900 hover:text-purple-700 sm:text-base">{publicEvent.title}</Link>
                        <p className="mt-1 line-clamp-1 text-xs font-bold text-purple-700">{tab === "upcoming" ? (nextOccurrence(event, today) || event.start_date || t("日期待定", "日期待定", "Date TBC")) : (event.end_date || event.start_date || t("日期待定", "日期待定", "Date TBC"))} · {timeText(event, locale)}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">{event.district || t("地區待定", "地区待定", "District TBC")} · {publicEvent.category} · {priceText(event, locale)}</p>
                        {tab === "expired" ? <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{t("已過期活動", "已过期活动", "Past event")}</span> : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Link href={"/events/" + event.id} className="rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white">{t("詳情", "详情", "Details")}</Link>
                        <button type="button" onClick={() => removeFavorite(event.id)} aria-label={t("取消收藏", "取消收藏", "Remove saved event")} className="rounded-lg border border-rose-100 px-2 py-1.5 text-xs font-bold text-rose-700">{t("移除", "移除", "Remove")}</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            {filtered.length > visibleCount ? <div className="mt-6 text-center"><button type="button" onClick={() => setVisibleCount((value) => value + 20)} className="rounded-full border border-purple-200 bg-white px-7 py-3 text-sm font-black text-purple-700 hover:bg-purple-50">{t("顯示更多活動", "显示更多活动", "Show more events")}</button></div> : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
