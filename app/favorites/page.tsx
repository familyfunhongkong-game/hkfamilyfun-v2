"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getClientLocale } from "@/lib/i18n/client";
import { localizedText, type AppLocale } from "@/lib/i18n/config";
import { getExtraPublicMessages } from "@/lib/i18n/public-extra-messages";
import { supabase } from "@/lib/supabase/client";
import PublicEventCard from "@/components/events/PublicEventCard";
import type { Event } from "@/lib/types";

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
  tags?: unknown;
  activity_category?: string | null;
  category?: string | null;
  is_free?: boolean | null;
  is_sen_friendly?: boolean | null;
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

function formatEventDate(
  event: FavoriteEvent,
  locale: AppLocale,
  fallback: string,
) {
  if (!event.start_date) return fallback;

  const format = (value: string) => {
    const date = new Date(`${value}T00:00:00+08:00`);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(
      locale === "en" ? "en-HK" : locale === "zh-Hans" ? "zh-CN" : "zh-HK",
      {
        timeZone: "Asia/Hong_Kong",
        year: "numeric",
        month: "short",
        day: "numeric",
      },
    ).format(date);
  };

  const start = format(event.start_date);
  if (!event.end_date || event.end_date === event.start_date) return start;

  const end = format(event.end_date);
  return locale === "en" ? `${start} – ${end}` : `${start} 至 ${end}`;
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
  const min = event.age_min;
  const max = event.age_max;

  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    return locale === "en" ? `Ages ${min}–${max}` : `${min}–${max}歲`;
  }
  if (min !== null && min !== undefined) {
    return locale === "en" ? `Ages ${min}+` : `${min}歲以上`;
  }
  if (max !== null && max !== undefined) {
    return locale === "en" ? `Up to age ${max}` : `${max}歲或以下`;
  }

  return locale === "en" ? "All ages" : locale === "zh-Hans" ? "适合所有年龄" : "適合所有年齡";
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

export default function FavoritesPage() {
  const [locale, setLocale] = useState<AppLocale>("zh-Hant");
  const [events, setEvents] = useState<FavoriteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const m = getExtraPublicMessages(locale).favorites;

  useEffect(() => {
    let ignore = false;
    const activeLocale = getClientLocale();
    const activeMessages = getExtraPublicMessages(activeLocale).favorites;
    setLocale(activeLocale);

    async function loadFavorites() {
      const ids = readFavoriteIds();

      if (!ids.length) {
        setEvents([]);
        setLoading(false);
        return;
      }

      if (!supabase) {
        setErrorText(activeMessages.dbUnavailable);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("public_events_i18n")
        .select(
          "id,title_tc,title_sc,title_en,short_description_tc,short_description_sc,short_description_en,organizer_name,merchant_name,start_date,end_date,start_time,end_time,district,mtr_station,cover_image_url,price_type,price_display_mode,price_label,min_price,max_price,age_min,age_max,tags,activity_category,category,is_free,is_sen_friendly,registration_url,booking_url,official_url,source_url",
        )
        .in("id", ids);

      if (ignore) return;

      if (error) {
        setErrorText(error.message || activeMessages.loadFailed);
        setEvents([]);
      } else {
        const rows = (data || []) as FavoriteEvent[];
        rows.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
        setEvents(rows);
      }

      setLoading(false);
    }

    void loadFavorites();

    return () => {
      ignore = true;
    };
  }, []);

  function removeFavorite(id: string) {
    const nextIds = readFavoriteIds().filter((item) => item !== id);
    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(nextIds),
    );
    setEvents((current) => current.filter((event) => event.id !== id));
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-r from-pink-600 to-purple-700 text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-black text-white/80">{m.kicker}</p>
          <h1 className="mt-2 text-4xl font-black">{m.title}</h1>
          <p className="mt-4 text-sm leading-7 text-white/85">{m.intro}</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {errorText ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-800">
            {errorText}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500 shadow-sm">
            {m.loading}
          </div>
        ) : null}

        {!loading && !events.length ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-pink-50 text-5xl">
              ♡
            </div>

            <h2 className="mt-6 text-2xl font-black">{m.emptyTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {m.emptyDesc}
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/events"
                className="rounded-full bg-pink-600 px-5 py-3 text-sm font-black text-white hover:bg-pink-700"
              >
                {m.browse}
              </Link>
              <Link
                href="/today"
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-pink-300 hover:text-pink-700"
              >
                {m.today}
              </Link>
            </div>
          </div>
        ) : null}

        {!loading && events.length ? (
          <div className="grid items-stretch gap-6 md:grid-cols-2">
            {events.map((event) => (
              <div key={event.id} className="relative">
                <PublicEventCard event={toPublicEvent(event, locale)} locale={locale} />
                <button
                  type="button"
                  onClick={() => removeFavorite(event.id)}
                  className="absolute right-3 top-3 z-30 rounded-full bg-white/95 px-3 py-2 text-xs font-black text-rose-700 shadow-md backdrop-blur transition hover:bg-rose-50"
                >
                  ♥ {m.remove}
                </button>
              </div>
            ))}
          </div>
        ) : null}}
      </section>
    </main>
  );
}
