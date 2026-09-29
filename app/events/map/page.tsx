"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { MapEvent } from "./EventMapClient";

const EventMapClient = dynamic(() => import("./EventMapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[520px] items-center justify-center bg-slate-100 text-sm font-bold text-slate-500 lg:min-h-[calc(100vh-8rem)]">
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

type DateFilter = "all" | "today" | "tomorrow" | "weekend";
type MobileView = "map" | "list";

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

function getHongKongToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addCalendarDays(dateTextValue: string, days: number) {
  const [year, month, day] = dateTextValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function getCalendarDayOfWeek(dateTextValue: string) {
  const [year, month, day] = dateTextValue.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function overlapsDate(event: EventRecord, target: string) {
  if (!event.start_date) return false;
  const end = event.end_date || event.start_date;
  return event.start_date <= target && end >= target;
}

function overlapsRange(event: EventRecord, start: string, end: string) {
  if (!event.start_date) return false;
  const eventEnd = event.end_date || event.start_date;
  return event.start_date <= end && eventEnd >= start;
}

function matchesDateFilter(event: EventRecord, filter: DateFilter) {
  if (filter === "all") return true;

  const today = getHongKongToday();

  if (filter === "today") return overlapsDate(event, today);
  if (filter === "tomorrow") return overlapsDate(event, addCalendarDays(today, 1));

  const dayOfWeek = getCalendarDayOfWeek(today);
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  const saturday = addCalendarDays(today, daysUntilSaturday);
  const sunday = addCalendarDays(saturday, 1);

  return overlapsRange(event, saturday, sunday);
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

function isFreeEvent(event: EventRecord) {
  return (
    Boolean(event.is_free) ||
    safeText(event.price_display_mode).toLowerCase() === "free" ||
    safeText(event.price_label).includes("免費")
  );
}

export default function NearbyEventsMapPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [district, setDistrict] = useState("全部地區");
  const [mtr, setMtr] = useState("全部港鐵");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const [senOnly, setSenOnly] = useState(false);
  const [radiusKm, setRadiusKm] = useState("all");
  const [userLocation, setUserLocation] = useState<UserLocation>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("map");
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

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

  const mtrStations = useMemo(
    () => [
      "全部港鐵",
      ...Array.from(
        new Set(events.map((event) => safeText(event.mtr_station)).filter(Boolean)),
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
        const matchesMtr =
          mtr === "全部港鐵" || safeText(event.mtr_station) === mtr;
        const matchesFree = !freeOnly || isFreeEvent(event);
        const matchesSen = !senOnly || Boolean(event.is_sen_friendly);
        const matchesDate = matchesDateFilter(event, dateFilter);

        return (
          matchesKeyword &&
          matchesDistrict &&
          matchesMtr &&
          matchesFree &&
          matchesSen &&
          matchesDate
        );
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
      })
      .filter((event) => {
        if (!userLocation || radiusKm === "all") return true;
        return (
          typeof event.distanceKm === "number" &&
          event.distanceKm <= Number(radiusKm)
        );
      });

    if (userLocation) {
      rows.sort((a, b) => {
        const aDistance =
          typeof a.distanceKm === "number"
            ? a.distanceKm
            : Number.POSITIVE_INFINITY;
        const bDistance =
          typeof b.distanceKm === "number"
            ? b.distanceKm
            : Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      });
    }

    return rows;
  }, [
    dateFilter,
    district,
    events,
    freeOnly,
    keyword,
    mtr,
    radiusKm,
    senOnly,
    userLocation,
  ]);

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
          coverImage: event.cover_image_url || null,
          isFree: isFreeEvent(event),
          isSenFriendly: Boolean(event.is_sen_friendly),
        })),
    [filtered],
  );

  const selectedEvent =
    filtered.find((event) => event.id === selectedEventId) || null;

  useEffect(() => {
    if (selectedEventId && !filtered.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(null);
    }
  }, [filtered, selectedEventId]);

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
        setRadiusKm("10");
        setLocationMessage("已取得位置，預設顯示10公里內活動並由近至遠排序。");
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
    setRadiusKm("all");
    setLocationMessage("已取消附近排序及距離篩選。");
  }

  function selectEvent(eventId: string, switchToMap = false) {
    setSelectedEventId(eventId);

    if (switchToMap) {
      setMobileView("map");
    }

    window.setTimeout(() => {
      cardRefs.current[eventId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 50);
  }

  function resetFilters() {
    setKeyword("");
    setDistrict("全部地區");
    setMtr("全部港鐵");
    setDateFilter("all");
    setFreeOnly(false);
    setSenOnly(false);
    if (!userLocation) setRadiusKm("all");
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black text-teal-700">Nearby・地點探索</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight">
                地圖搵香港附近親子活動
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                地圖同活動清單會同步。開啟定位後可按距離搵附近活動；位置只留在目前瀏覽器，不會儲存。
              </p>
            </div>

            <Link
              href="/events"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              切換完整活動列表
            </Link>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr_auto_auto]">
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

            <select
              value={mtr}
              onChange={(event) => setMtr(event.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            >
              {mtrStations.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <label className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(event) => setFreeOnly(event.target.checked)}
              />
              免費
            </label>

            <label className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={senOnly}
                onChange={(event) => setSenOnly(event.target.checked)}
              />
              SEN友善
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {([
              ["all", "全部日期"],
              ["today", "今日"],
              ["tomorrow", "明日"],
              ["weekend", "今個週末"],
            ] as [DateFilter, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDateFilter(value)}
                className={
                  dateFilter === value
                    ? "rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
                    : "rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                }
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={userLocation ? clearMyLocation : useMyLocation}
              className={
                userLocation
                  ? "rounded-full bg-blue-700 px-4 py-2 text-xs font-black text-white"
                  : "rounded-full bg-teal-700 px-4 py-2 text-xs font-black text-white"
              }
            >
              {userLocation ? "✓ 已使用我的位置" : "📍 使用我的位置"}
            </button>

            {userLocation ? (
              <select
                value={radiusKm}
                onChange={(event) => setRadiusKm(event.target.value)}
                className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-800"
              >
                <option value="all">不限距離</option>
                <option value="2">2 km 內</option>
                <option value="5">5 km 內</option>
                <option value="10">10 km 內</option>
                <option value="20">20 km 內</option>
              </select>
            ) : null}

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-600"
            >
              清除篩選
            </button>
          </div>

          {locationMessage ? (
            <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800">
              {locationMessage}
            </p>
          ) : null}
        </div>
      </section>

      <div className="sticky top-[76px] z-30 border-b border-slate-200 bg-white p-2 lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-2 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMobileView("map")}
            className={
              mobileView === "map"
                ? "rounded-xl bg-white px-4 py-2 text-sm font-black text-teal-700 shadow-sm"
                : "rounded-xl px-4 py-2 text-sm font-black text-slate-500"
            }
          >
            🗺️ 地圖
          </button>
          <button
            type="button"
            onClick={() => setMobileView("list")}
            className={
              mobileView === "list"
                ? "rounded-xl bg-white px-4 py-2 text-sm font-black text-teal-700 shadow-sm"
                : "rounded-xl px-4 py-2 text-sm font-black text-slate-500"
            }
          >
            ☰ 活動 {filtered.length}
          </button>
        </div>
      </div>

      {errorText ? (
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-800">
            {errorText}
          </div>
        </div>
      ) : (
        <section className="mx-auto max-w-[1600px] lg:grid lg:grid-cols-[minmax(360px,42%)_1fr]">
          <div
            className={
              mobileView === "list"
                ? "block bg-slate-50 lg:block"
                : "hidden bg-slate-50 lg:block"
            }
          >
            <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-700">
                  {loading
                    ? "正在讀取..."
                    : `${filtered.length} 個活動 · ${mappedEvents.length} 個可在地圖顯示`}
                </p>
                {userLocation ? (
                  <span className="text-xs font-bold text-blue-700">
                    由近至遠
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-3 p-3 sm:p-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
              {!loading && filtered.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <h2 className="text-xl font-black">暫未找到符合條件的活動</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    可以取消部分篩選，或者擴大附近距離。
                  </p>
                </div>
              ) : null}

              {filtered.map((event) => {
                const selected = event.id === selectedEventId;
                const hasCoordinates =
                  Number.isFinite(Number(event.latitude)) &&
                  Number.isFinite(Number(event.longitude));

                return (
                  <article
                    key={event.id}
                    ref={(node) => {
                      cardRefs.current[event.id] = node;
                    }}
                    className={
                      selected
                        ? "overflow-hidden rounded-3xl border-2 border-purple-500 bg-white shadow-lg ring-4 ring-purple-100"
                        : "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm hover:border-teal-300 hover:shadow-md"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => hasCoordinates && selectEvent(event.id)}
                      className="grid w-full grid-cols-[112px_1fr] text-left sm:grid-cols-[140px_1fr]"
                    >
                      {event.cover_image_url ? (
                        <img
                          src={event.cover_image_url}
                          alt=""
                          className="h-full min-h-[160px] w-full object-cover"
                        />
                      ) : (
                        <div className="flex min-h-[160px] items-center justify-center bg-gradient-to-br from-teal-100 via-blue-100 to-purple-100 text-3xl">
                          📍
                        </div>
                      )}

                      <div className="min-w-0 p-4">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-black text-teal-700">
                            {safeText(event.district, "地區待定")}
                          </span>

                          {event.mtr_station ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                              港鐵 {event.mtr_station}
                            </span>
                          ) : null}

                          {isFreeEvent(event) ? (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                              免費
                            </span>
                          ) : null}

                          {typeof event.distanceKm === "number" ? (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
                              {event.distanceKm.toFixed(1)} km
                            </span>
                          ) : null}
                        </div>

                        <h2 className="mt-2 line-clamp-2 text-base font-black leading-6 text-slate-950">
                          {safeText(event.title_tc, "未命名活動")}
                        </h2>

                        <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                          {safeText(event.venue_name, event.address || "場地待定")}
                        </p>

                        <p className="mt-2 text-xs font-bold text-slate-600">
                          {dateText(event)} · {timeText(event)}
                        </p>

                        {hasCoordinates ? (
                          <p className="mt-3 text-xs font-black text-teal-700">
                            在地圖顯示 →
                          </p>
                        ) : (
                          <p className="mt-3 text-xs font-bold text-amber-700">
                            此活動暫未有精確地圖定位
                          </p>
                        )}
                      </div>
                    </button>

                    <div className="flex gap-2 border-t border-slate-100 p-3">
                      <Link
                        href={`/events/${event.id}`}
                        className="flex-1 rounded-xl bg-slate-950 px-3 py-2 text-center text-xs font-black text-white"
                      >
                        活動詳情
                      </Link>
                      <a
                        href={mapUrl(event)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-xs font-black text-slate-700"
                      >
                        Google Maps路線
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div
            className={
              mobileView === "map"
                ? "relative block min-h-[calc(100vh-12rem)] lg:block"
                : "relative hidden min-h-[calc(100vh-12rem)] lg:block"
            }
          >
            <div className="overflow-hidden bg-white lg:sticky lg:top-[76px] lg:h-[calc(100vh-76px)]">
              <EventMapClient
                events={mappedEvents}
                userLocation={userLocation}
                selectedEventId={selectedEventId}
                onSelectEvent={(eventId) => selectEvent(eventId)}
              />

              <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-2xl bg-white/95 px-3 py-2 text-xs font-black text-slate-700 shadow-lg backdrop-blur">
                {mappedEvents.length} 個地圖活動
              </div>

              {selectedEvent ? (
                <div className="absolute bottom-4 left-4 right-4 z-[500] mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
                  <div className="flex gap-3">
                    {selectedEvent.cover_image_url ? (
                      <img
                        src={selectedEvent.cover_image_url}
                        alt=""
                        className="h-20 w-24 flex-none rounded-2xl object-cover"
                      />
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-black text-teal-700">
                            {safeText(selectedEvent.district, "香港")}
                            {typeof selectedEvent.distanceKm === "number"
                              ? ` · ${selectedEvent.distanceKm.toFixed(1)} km`
                              : ""}
                          </p>
                          <h2 className="mt-1 line-clamp-2 text-sm font-black leading-5">
                            {safeText(selectedEvent.title_tc, "未命名活動")}
                          </h2>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedEventId(null)}
                          className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-500"
                          aria-label="關閉活動卡"
                        >
                          ✕
                        </button>
                      </div>

                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {safeText(
                          selectedEvent.venue_name,
                          selectedEvent.address || "場地待定",
                        )}
                      </p>

                      <div className="mt-3 flex gap-2">
                        <Link
                          href={`/events/${selectedEvent.id}`}
                          className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-black text-white"
                        >
                          活動詳情
                        </Link>
                        <a
                          href={mapUrl(selectedEvent)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700"
                        >
                          路線
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      )}

      <p className="border-t border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-400">
        Map data © OpenStreetMap contributors · Google Maps只用作外部路線連結
      </p>
    </main>
  );
}
