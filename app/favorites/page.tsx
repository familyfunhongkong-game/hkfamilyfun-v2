"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ResilientEventImage from "@/components/resilient-event-image";
import { getClientLocale } from "@/lib/i18n/client";
import { localizedText, type AppLocale } from "@/lib/i18n/config";
import { getExtraPublicMessages } from "@/lib/i18n/public-extra-messages";
import { supabase } from "@/lib/supabase/client";

const FAVORITES_STORAGE_KEY = "hkff_favorite_event_ids";

type FavoriteEvent = {
  id: string;
  title_tc?: string | null;
  title_sc?: string | null;
  title_en?: string | null;
  organizer_name?: string | null;
  merchant_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  district?: string | null;
  cover_image_url?: string | null;
  price_label?: string | null;
  is_free?: boolean | null;
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
          "id,title_tc,title_sc,title_en,organizer_name,merchant_name,start_date,end_date,district,cover_image_url,price_label,is_free",
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
          <div className="grid gap-5 md:grid-cols-2">
            {events.map((event) => {
              const title = localizedText(locale, {
                tc: event.title_tc,
                sc: event.title_sc,
                en: event.title_en,
                fallback: m.untitled,
              });

              return (
                <article
                  key={event.id}
                  className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
                >
                  <div className="h-52 overflow-hidden">
                    <ResilientEventImage
                      src={event.cover_image_url}
                      alt={title}
                      loading="lazy"
                      compactFallback
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-black text-purple-700">
                      {formatEventDate(event, locale, m.dateTbc)}
                    </p>
                    <h2 className="mt-2 text-xl font-black text-slate-950">
                      {title}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {event.organizer_name ||
                        event.merchant_name ||
                        m.organizerTbc}
                      {" · "}
                      {event.district || m.districtTbc}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href={`/events/${event.id}`}
                        className="rounded-full bg-purple-700 px-4 py-2 text-sm font-black text-white"
                      >
                        {m.view}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeFavorite(event.id)}
                        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-black text-rose-700"
                      >
                        {m.remove}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}
