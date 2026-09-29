"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { MapBounds, MapEvent } from "./EventMapClient";

const EventMapClient = dynamic(() => import("./EventMapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[520px] items-center justify-center bg-slate-100 text-sm font-bold text-slate-500">
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

type DisplayEvent = EventRecord & {
  distanceKm: number | null;
};

type UserLocation = {
  latitude: number;
  longitude: number;
} | null;

type DateFilter = "all" | "today" | "weekend";

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

function addDays(dateTextValue: string, days: number) {
  const [year, month, day] = dateTextValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function weekendRange(today: string) {
  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  if (weekday === 0) {
    return { start: addDays(today, -1), end: today };
  }

  const toSaturday = weekday === 6 ? 0 : 6 - weekday;
  const start = addDays(today, toSaturday);
  return { start, end: addDays(start, 1) };
}

function overlapsRange(
  event: EventRecord,
  rangeStart: string,
  rangeEnd: string,
) {
  if (!event.start_date) return false;
  const eventStart = event.start_date;
  const eventEnd = event.end_date || event.start_date;
  return eventStart <= rangeEnd && eventEnd >= rangeStart;
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

function eventIsFree(event: EventRecord) {
  return (
    Boolean(event.is_free) ||
    safeText(event.price_display_mode).toLowerCase() === "free" ||
    safeText(event.price_label).includes("免費")
  );
}

function insideBounds(event: EventRecord, bounds: MapBounds) {
  const lat = Number(event.latitude);
  const lon = Number(event.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;

  const longitudeMatch =
    bounds.west <= bounds.east
      ? lon >= bounds.west && lon <= bounds.east
      : lon >= bounds.west || lon <= bounds.east;

  return lat >= bounds.south && lat <= bounds.north && longitudeMatch;
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-teal-700 px-4 py-2 text-sm font-black text-white shadow-sm"
          : "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:border-teal-300 hover:text-teal-700"
      }
    >
      {children}
    </button>
  );
}

function EventCard({
  event,
  selected,
  onSelect,
}: {
  event: DisplayEvent;
  selected: boolean;
  onSelect: () => void;
}) {
  const tags = normalizeTags(event.tags);

  return (
    <article
      id={`map-event-${event.id}`}
      onClick={onSelect}
      className={
        selected
          ? "cursor-pointer overflow-hidden rounded-3xl border-2 border-purple-500 bg-white shadow-lg ring-4 ring-purple-100"
          : "cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
      }
    >
      <div className="flex gap-3 p-3">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt=""
            className="h-24 w-28 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-24 w-28 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 via-blue-100 to-purple-100 text-3xl">
            📍
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-teal-50 px-2 py-1 text-[11px] font-black text-teal-700">
              {safeText(event.district, "地區待定")}
            </span>
            {eventIsFree(event) ? (
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">
                免費
              </span>
            ) : null}
            {typeof event.distanceKm === "number" ? (
              <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">
                {event.distanceKm.toFixed(1)} km
              </span>
            ) : null}
          </div>

          <h2 className="mt-2 line-clamp-2 text-sm font-black leading-5 text-slate-950">
            {safeText(event.title_tc, "未命名活動")}
          </h2>
          <p className="mt-1 line-clamp-1 text-xs text-slate-600">
            {safeText(event.venue_name, event.address || "場地待定")}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-500">
            {dateText(event)} · {timeText(event)}
          </p>
        </div>
      </div>

      {tags.length ? (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 py-2">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2 border-t border-slate-100 px-3 py-3">
        <Link
          href={`/events/${event.id}`}
          onClick={(clickEvent) => clickEvent.stopPropagation()}
          className="flex-1 rounded-xl bg-teal-700 px-3 py-2 text-center text-xs font-black text-white"
        >
          活動詳情
        </Link>
        <a
          href={mapUrl(event)}
          target="_blank"
          rel="noreferrer"
          onClick={(clickEvent) => clickEvent.stopPropagation()}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700"
        >
          路線
        </a>
      </div>
    </article>
  );
}

export default function NearbyEventsMapPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [district, setDistrict] = useState("全部地區");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const [senOnly, setSenOnly] = useState(false);
  const [radiusKm, setRadiusKm] = useState(0);
  const [userLocation, setUserLocation] = useState<UserLocation>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [viewportBounds, setViewportBounds] = useState<MapBounds | null>(null);
  const [areaBounds, setAreaBounds] = useState<MapBounds | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [queryReady, setQueryReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setKeyword(params.get("q") || "");
    setDistrict(params.get("district") || "全部地區");

    const requestedDate = params.get("date");
    if (requestedDate === "today" || requestedDate === "weekend") {
      setDateFilter(requestedDate);
    }

    setFreeOnly(params.get("free") === "1");
    setSenOnly(params.get("sen") === "1");

    const requestedRadius = Number(params.get("radius") || 0);
    if ([2, 5, 10].includes(requestedRadius)) setRadiusKm(requestedRadius);

    setSelectedEventId(params.get("event"));
    setQueryReady(true);
  }, []);

  useEffect(() => {
    if (!queryReady) return;

    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (district !== "全部地區") params.set("district", district);
    if (dateFilter !== "all") params.set("date", dateFilter);
    if (freeOnly) params.set("free", "1");
    if (senOnly) params.set("sen", "1");
    if (radiusKm) params.set("radius", String(radiusKm));
    if (selectedEventId) params.set("event", selectedEventId);

    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    );
  }, [
    dateFilter,
    district,
    freeOnly,
    keyword,
    queryReady,
    radiusKm,
    selectedEventId,
    senOnly,
  ]);

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

  const hkToday = useMemo(() => getHongKongToday(), []);
  const hkWeekend = useMemo(() => weekendRange(hkToday), [hkToday]);

  const baseFiltered = useMemo<DisplayEvent[]>(() => {
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
        const matchesFree = !freeOnly || eventIsFree(event);
        const matchesSen = !senOnly || Boolean(event.is_sen_friendly);

        let matchesDate = true;
        if (dateFilter === "today") {
          matchesDate = overlapsRange(event, hkToday, hkToday);
        } else if (dateFilter === "weekend") {
          matchesDate = overlapsRange(event, hkWeekend.start, hkWeekend.end);
        }

        return (
          matchesKeyword &&
          matchesDistrict &&
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
        if (!radiusKm || !userLocation) return true;
        return typeof event.distanceKm === "number" && event.distanceKm <= radiusKm;
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
    hkToday,
    hkWeekend.end,
    hkWeekend.start,
    keyword,
    radiusKm,
    senOnly,
    userLocation,
  ]);

  const filtered = useMemo(
    () =>
      areaBounds
        ? baseFiltered.filter((event) => insideBounds(event, areaBounds))
        : baseFiltered,
    [areaBounds, baseFiltered],
  );

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
          mtrStation: safeText(event.mtr_station),
          date: dateText(event),
          time: timeText(event),
          latitude: Number(event.latitude),
          longitude: Number(event.longitude),
          distanceKm: event.distanceKm,
          imageUrl: event.cover_image_url,
          mapUrl: mapUrl(event),
          isFree: eventIsFree(event),
          isSenFriendly: Boolean(event.is_sen_friendly),
        })),
    [filtered],
  );

  useEffect(() => {
    if (
      selectedEventId &&
      !filtered.some((event) => event.id === selectedEventId)
    ) {
      setSelectedEventId(null);
    }
  }, [filtered, selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;
    const card = document.getElementById(`map-event-${selectedEventId}`);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedEventId]);

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
        setLocationMessage("已取得位置；活動會由近至遠排序。");
        setAreaBounds(null);
        setFitRequest((value) => value + 1);
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
    setRadiusKm(0);
    setLocationMessage("已取消附近排序。");
    setFitRequest((value) => value + 1);
  }

  function searchVisibleArea() {
    if (!viewportBounds) return;
    setAreaBounds(viewportBounds);
    setSelectedEventId(null);
  }

  function clearAreaSearch() {
    setAreaBounds(null);
    setSelectedEventId(null);
    setFitRequest((value) => value + 1);
  }

  function resetFilters() {
    setKeyword("");
    setDistrict("全部地區");
    setDateFilter("all");
    setFreeOnly(false);
    setSenOnly(false);
    setRadiusKm(0);
    setAreaBounds(null);
    setSelectedEventId(null);
    setFitRequest((value) => value + 1);
  }

  const activeFilterCount =
    Number(Boolean(keyword.trim())) +
    Number(district !== "全部地區") +
    Number(dateFilter !== "all") +
    Number(freeOnly) +
    Number(senOnly) +
    Number(Boolean(radiusKm)) +
    Number(Boolean(areaBounds));

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-teal-700">
                Nearby Map・附近活動
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                用地圖搵香港親子活動
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                拖動地圖睇其他區域、點活動圖釘睇詳情，或使用目前位置將附近活動由近至遠排序。
                定位只在目前瀏覽器使用，不會儲存。
              </p>
            </div>

            <Link
              href="/events"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:border-teal-300"
            >
              ☰ 列表模式
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(180px,0.7fr)_auto]">
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

            <button
              type="button"
              onClick={userLocation ? clearMyLocation : useMyLocation}
              className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-black text-white hover:bg-teal-800"
            >
              {userLocation ? "✓ 已定位" : "📍 附近我"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <FilterChip
              active={dateFilter === "today"}
              onClick={() =>
                setDateFilter(dateFilter === "today" ? "all" : "today")
              }
            >
              今日
            </FilterChip>
            <FilterChip
              active={dateFilter === "weekend"}
              onClick={() =>
                setDateFilter(dateFilter === "weekend" ? "all" : "weekend")
              }
            >
              本週末
            </FilterChip>
            <FilterChip active={freeOnly} onClick={() => setFreeOnly(!freeOnly)}>
              免費
            </FilterChip>
            <FilterChip active={senOnly} onClick={() => setSenOnly(!senOnly)}>
              SEN友善
            </FilterChip>

            <select
              value={radiusKm}
              disabled={!userLocation}
              onChange={(event) => setRadiusKm(Number(event.target.value))}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <option value={0}>不限距離</option>
              <option value={2}>2 km內</option>
              <option value={5}>5 km內</option>
              <option value={10}>10 km內</option>
            </select>

            {activeFilterCount ? (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-full px-3 py-2 text-sm font-black text-slate-500 hover:bg-slate-100"
              >
                清除 {activeFilterCount} 個篩選
              </button>
            ) : null}
          </div>

          {locationMessage ? (
            <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800">
              {locationMessage}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-0 py-0 sm:px-4 sm:py-4 lg:px-6">
        {errorText ? (
          <div className="m-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-800">
            {errorText}
          </div>
        ) : (
          <div className="overflow-hidden border-y border-slate-200 bg-white shadow-sm sm:rounded-[2rem] sm:border">
            <div className="grid lg:grid-cols-[420px_minmax(0,1fr)]">
              <aside className="order-2 relative z-20 -mt-12 max-h-[56vh] overflow-y-auto rounded-t-[2rem] border-t border-slate-200 bg-white shadow-[0_-12px_32px_rgba(15,23,42,0.12)] lg:order-1 lg:mt-0 lg:h-[calc(100vh-14rem)] lg:max-h-none lg:rounded-none lg:border-r lg:border-t-0 lg:shadow-none">
                <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-4 py-4 backdrop-blur">
                  <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-300 lg:hidden" />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        {loading
                          ? "正在讀取..."
                          : `${filtered.length} 個活動`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {mappedEvents.length} 個有地圖定位
                        {areaBounds ? " · 只顯示目前地圖範圍" : ""}
                      </p>
                    </div>
                    {areaBounds ? (
                      <button
                        type="button"
                        onClick={clearAreaSearch}
                        className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                      >
                        顯示全部
                      </button>
                    ) : null}
                  </div>
                </div>

                {!loading && !filtered.length ? (
                  <div className="p-8 text-center">
                    <div className="text-4xl">🗺️</div>
                    <h2 className="mt-3 text-lg font-black">呢個範圍暫時冇活動</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      移動地圖去其他區域，或者清除部分篩選再試。
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 p-3">
                    {filtered.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        selected={event.id === selectedEventId}
                        onSelect={() => setSelectedEventId(event.id)}
                      />
                    ))}
                  </div>
                )}
              </aside>

              <div className="order-1 relative h-[64vh] min-h-[520px] lg:order-2 lg:h-[calc(100vh-14rem)] lg:min-h-[650px]">
                <EventMapClient
                  events={mappedEvents}
                  userLocation={userLocation}
                  selectedEventId={selectedEventId}
                  onSelectEvent={setSelectedEventId}
                  onBoundsChange={setViewportBounds}
                  fitRequest={fitRequest}
                  fitEnabled={!areaBounds}
                />

                <div className="pointer-events-none absolute left-1/2 top-4 z-[500] flex -translate-x-1/2 flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={searchVisibleArea}
                    disabled={!viewportBounds}
                    className="pointer-events-auto rounded-full border border-white/80 bg-white px-5 py-2.5 text-sm font-black text-slate-800 shadow-xl transition hover:bg-teal-50 hover:text-teal-800 disabled:opacity-50"
                  >
                    🔎 搜尋此地圖範圍
                  </button>

                  {areaBounds ? (
                    <button
                      type="button"
                      onClick={clearAreaSearch}
                      className="pointer-events-auto rounded-full bg-slate-900/85 px-4 py-2 text-xs font-black text-white shadow-lg"
                    >
                      清除地圖範圍
                    </button>
                  ) : null}
                </div>

                <div className="pointer-events-none absolute bottom-4 left-4 z-[500] rounded-2xl bg-white/95 px-3 py-2 text-[11px] font-bold text-slate-600 shadow-lg backdrop-blur">
                  點圖釘 ↔ 活動卡會同步
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="px-4 py-5 text-center text-xs text-slate-400">
          Map data © OpenStreetMap contributors · 路線連結會開啟 Google Maps
        </p>
      </section>
    </main>
  );
}
