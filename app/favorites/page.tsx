"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const FAVORITES_STORAGE_KEY = "hkff_favorite_event_ids";

type FavoriteEvent = {
  id: string;
  title_tc?: string | null;
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

function formatDate(event: FavoriteEvent) {
  if (!event.start_date) return "日期待定";
  if (!event.end_date || event.end_date === event.start_date) {
    return event.start_date;
  }
  return `${event.start_date} 至 ${event.end_date}`;
}

export default function FavoritesPage() {
  const [events, setEvents] = useState<FavoriteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadFavorites() {
      const ids = readFavoriteIds();

      if (!ids.length) {
        setEvents([]);
        setLoading(false);
        return;
      }

      if (!supabase) {
        setErrorText("網站暫時未能連接活動資料庫。");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("public_events")
        .select(
          "id,title_tc,organizer_name,merchant_name,start_date,end_date,district,cover_image_url,price_label,is_free",
        )
        .in("id", ids);

      if (ignore) return;

      if (error) {
        setErrorText(error.message || "讀取收藏活動失敗。");
        setEvents([]);
      } else {
        const rows = (data || []) as FavoriteEvent[];
        rows.sort(
          (a, b) =>
            ids.indexOf(a.id) - ids.indexOf(b.id),
        );
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
          <p className="text-sm font-black text-white/80">收藏</p>
          <h1 className="mt-2 text-4xl font-black">你收藏的活動都在這裡</h1>
          <p className="mt-4 text-sm leading-7 text-white/85">
            收藏資料會保存在目前瀏覽器。已過期或已下架活動會自動從此頁消失。
          </p>
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
            正在讀取收藏活動...
          </div>
        ) : null}

        {!loading && !events.length ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-pink-50 text-5xl">
              ♡
            </div>

            <h2 className="mt-6 text-2xl font-black">沒有收藏的有效活動</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              在活動列表或活動詳情按「收藏」，之後便可以在這裡快速找回。
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/events"
                className="rounded-full bg-pink-600 px-5 py-3 text-sm font-black text-white hover:bg-pink-700"
              >
                瀏覽活動
              </Link>
              <Link
                href="/today"
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-pink-300 hover:text-pink-700"
              >
                今日活動
              </Link>
            </div>
          </div>
        ) : null}

        {!loading && events.length ? (
          <div className="grid gap-5 md:grid-cols-2">
            {events.map((event) => (
              <article
                key={event.id}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
              >
                {event.cover_image_url ? (
                  <img
                    src={event.cover_image_url}
                    alt=""
                    className="h-52 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-52 items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50">
                    <div className="rounded-3xl bg-purple-700 px-5 py-4 text-xl font-black text-white">
                      HK Family Fun
                    </div>
                  </div>
                )}

                <div className="p-5">
                  <p className="text-xs font-black text-purple-700">
                    {formatDate(event)}
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    {event.title_tc || "未命名活動"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {event.organizer_name ||
                      event.merchant_name ||
                      "主辦單位待定"}
                    {" · "}
                    {event.district || "地區待定"}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={`/events/${event.id}`}
                      className="rounded-full bg-purple-700 px-4 py-2 text-sm font-black text-white"
                    >
                      查看活動
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeFavorite(event.id)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-black text-rose-700"
                    >
                      移除收藏
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
