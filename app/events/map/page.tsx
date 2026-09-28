"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { MapEvent } from "./EventMapClient";

const EventMapClient = dynamic(() => import("./EventMapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[540px] items-center justify-center bg-slate-100 text-sm font-bold text-slate-500">
      正在載入地圖...
    </div>
  ),
});

type EventRecord = {
  id: string;
  title_tc?: string | null;
  short_description_tc?: string | null;
  venue_name?: string | null;
  address?: string | null;
  district?: string | null;
  mtr_station?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  price_display_mode?: string | null;
  price_label?: string | null;
  is_free?: boolean | null;
  is_sen_friendly?: boolean | null;
  category?: string | null;
  activity_category?: string | null;
  tags?: unknown;
  cover_image_url?: string | null;
  google_map_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type UserLocation = {
  latitude: number;
  longitude: number;
} | null;

function safeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\n，、]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function mapUrl(event: EventRecord) {
  if (event.google_map_url) return event.google_map_url;

  const query = [
    event.venue_name,
    event.address,
    event.district,
    "Hong Kong",
  ]
    .filter(Boolean)
    .join(" ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function dateText(event: EventRecord) {
  if (!event.start_date) return "日期待定";
  if (!event.end_date || event.end_date === event.start_date) return event.start_date;
  return `${event.start_date} 至 ${event.end_date}`;
}

function timeText(event: EventRecord) {
  if (!event.start_time) return "時間待定";
  const start = event.start_time.slice(0, 5);
  const end = event.end_time ? event.end_time.slice(0, 5) : "";
  return end ? `${start} - ${end}` : start;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function NearbyEventsMapPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [district, setDistrict] = useState("全部地區");
  const [freeOnly, setFreeOnly] = useState(false);
  const [senOnly, setSenOnly] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation>(null);
  const [locationMessage, setLocationMessage] = useState("");

  useEffect(() => {
    async function loadEvents() {
      if (!supabase) {
        setErrorText("網站暫時未能連接活動資料庫。");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("public_events")
        .select(
          "id,title_tc,short_description_tc,venue_name,address,district,mtr_station,start_date,end_date,start_time,end_time,price_display_mode,price_label,is_free,is_sen_friendly,category,activity_category,tags,cover_image_url,google_map_url,latitude,longitude",
        )
        .eq("status", "published")
        .order("start_date", { ascending: true });

      if (error) {
        setErrorText(error.message || "讀取活動資料失敗。");
        setEvents([]);
      } else {
        setEvents((data || []) as EventRecord[]);
      }

      setLoading(false);
    }

    void loadEvents();
  }, []);

  const districts = useMemo(
    () => [
      "全部地區",
      ...Array.from(
        new Set(events.map((event) => safeText(event.district)).filter(Boolean)),
      ).sort(),
    ],
    [events],
  );

  const filtered = useMemo(() => {
    const text = keyword.trim().toLowerCase();

    const rows = events
      .filter((event) => {
        const haystack = [
          event.title_tc,
          event.short_description_tc,
          event.venue_name,
          event.address,
          event.district,
          event.mtr_station,
          event.category,
          event.activity_category,
          ...normalizeTags(event.tags),
        ]
          .map((value) => safeText(value).toLowerCase())
          .join(" ");

        const matchesKeyword = !text || haystack.includes(text);
        const matchesDistrict =
          district === "全部地區" || safeText(event.district) === district;
        const matchesFree =
          !freeOnly ||
          Boolean(event.is_free) ||
          safeText(event.price_display_mode).toLowerCase() === "free" ||
          safeText(event.price_label).includes("免費");
        const matchesSen = !senOnly || Boolean(event.is_sen_friendly);

        return matchesKeyword && matchesDistrict && matchesFree && matchesSen;
      })
      .map((event) => {
        const lat = Number(event.latitude);
        const lon = Number(event.longitude);
        const distanceKm =
          userLocation && Number.isFinite(lat) && Number.isFinite(lon)
            ? haversineKm(
                userLocation.latitude,
                userLocation.longitude,
                lat,
                lon,
              )
            : null;

        return { ...event, distanceKm };
      });

    if (userLocation) {
      rows.sort((a, b) => {
        const aDistance =
          typeof a.distanceKm === "number" ? a.distanceKm : Number.POSITIVE_INFINITY;
        const bDistance =
          typeof b.distanceKm === "number" ? b.distanceKm : Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      });
    }

    return rows;
  }, [district, events, freeOnly, keyword, senOnly, userLocation]);

  const mappedEvents = useMemo<MapEvent[]>(
    () =>
      filtered
        .filter(
          (event) =>
            Number.isFinite(Number(event.latitude)) &&
            Number.isFinite(Number(event.longitude)),
        )
        .map((event) => ({
          id: event.id,
          title: safeText(event.title_tc, "未命名活動"),
          venue: safeText(event.venue_name, event.address || "場地待定"),
          district: safeText(event.district),
          date: dateText(event),
          time: timeText(event),
          latitude: Number(event.latitude),
          longitude: Number(event.longitude),
          distanceKm:
            typeof event.distanceKm === "number" ? event.distanceKm : null,
        })),
    [filtered],
  );

  function useMyLocation() {
    setLocationMessage("");

    if (!navigator.geolocation) {
      setLocationMessage("此瀏覽器不支援定位，仍可使用地區及港鐵搜尋。");
      return;
    }

    setLocationMessage("正在取得你的位置…");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationMessage("已按你目前位置將附近活動由近至遠排序。");
      },
      () => {
        setLocationMessage("未能取得位置。你可以在瀏覽器允許 Location 後再試。");
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }

  function clearMyLocation() {
    setUserLocation(null);
    setLocationMessage("已取消附近排序。");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-sm font-black text-teal-700">附近活動地圖・地點探索</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            地圖搵香港附近親子活動
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            活動位置來自平台已核實的場地資料。你可以拖動、縮放地圖，或使用目前位置將活動由近至遠排序。
            你的定位只留在目前瀏覽器，不會儲存到 HK Family Fun。
          </p>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1.4fr_0.9fr_auto_auto_auto]">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜尋活動、場地、港鐵站..."
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />

            <select
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            >
              {districts.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(event) => setFreeOnly(event.target.checked)}
              />
              免費
            </label>

            <label className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={senOnly}
                onChange={(event) => setSenOnly(event.target.checked)}
              />
              SEN友善
            </label>

            <button
              type="button"
              onClick={userLocation ? clearMyLocation : useMyLocation}
              className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-black text-white hover:bg-teal-800"
            >
              {userLocation ? "取消附近排序" : "📍 使用我的位置"}
            </button>
          </div>

          {locationMessage ? (
            <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800">
              {locationMessage}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-600">
            {loading
              ? "正在讀取..."
              : `顯示 ${filtered.length} 個活動；${mappedEvents.length} 個有地圖定位`}
          </p>
          <Link
            href="/events"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700"
          >
            切換活動列表
          </Link>
        </div>

        {errorText ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-800">
            {errorText}
          </div>
        ) : null}

        {!errorText ? (
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <EventMapClient events={mappedEvents} userLocation={userLocation} />
          </div>
        ) : null}

        {!loading && !errorText && !filtered.length ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-black">暫未找到符合條件的活動</h2>
            <p className="mt-2 text-sm text-slate-500">
              可以取消部分篩選，或稍後再查看新活動。
            </p>
          </div>
        ) : null}

        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((event) => {
            const tags = normalizeTags(event.tags);
            return (
              <article
                key={event.id}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
              >
                {event.cover_image_url ? (
                  <img
                    src={event.cover_image_url}
                    alt=""
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-gradient-to-br from-teal-100 via-blue-100 to-purple-100 text-4xl">
                    📍
                  </div>
                )}

                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
                      {safeText(event.district, "地區待定")}
                    </span>
                    {event.mtr_station ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        港鐵 {event.mtr_station}
                      </span>
                    ) : null}
                    {typeof event.distanceKm === "number" ? (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                        約 {event.distanceKm.toFixed(1)} km
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-3 text-xl font-black text-slate-950">
                    {safeText(event.title_tc, "未命名活動")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {safeText(event.venue_name, event.address || "場地待定")}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    {dateText(event)} · {timeText(event)}
                  </p>

                  {tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <a
                      href={mapUrl(event)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-teal-600 px-4 py-2 text-sm font-black text-white"
                    >
                      路線 / Google Maps
                    </a>
                    <Link
                      href={`/events/${event.id}`}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700"
                    >
                      活動詳情
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Map data © OpenStreetMap contributors
        </p>
      </section>
    </main>
  );
}
