"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import ResilientEventImage from "@/components/resilient-event-image";
import { getClientLocale } from "@/lib/i18n/client";
import { localizedText, uiText, type AppLocale } from "@/lib/i18n/config";
import type { MapBounds, MapEvent } from "./EventMapClient";

const EventMapClient = dynamic(() => import("./EventMapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[52vh] items-center justify-center bg-slate-100 text-sm font-bold text-slate-500 lg:min-h-[calc(100vh-10rem)]">
      正在載入地圖...
    </div>
  ),
});

type EventRecord = {
  id: string;
  title_tc?: string | null;
  title_sc?: string | null;
  title_en?: string | null;
  short_description_tc?: string | null;
  short_description_sc?: string | null;
  short_description_en?: string | null;
  venue_name?: string | null;
  venue_name_sc?: string | null;
  venue_name_en?: string | null;
  address?: string | null;
  address_sc?: string | null;
  address_en?: string | null;
  district?: string | null;
  mtr_station?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  price_display_mode?: string | null;
  price_label?: string | null;
  min_price?: number | string | null;
  max_price?: number | string | null;
  is_free?: boolean | null;
  is_sen_friendly?: boolean | null;
  category?: string | null;
  activity_category?: string | null;
  age_group?: string | null;
  age_min?: number | null;
  age_max?: number | null;
  organizer_name?: string | null;
  merchant_name?: string | null;
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

type RadiusFilter = "all" | "2" | "5" | "10" | "20";
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

function isFreeEvent(event: EventRecord) {
  return (
    Boolean(event.is_free) ||
    safeText(event.price_display_mode).toLowerCase() === "free" ||
    safeText(event.price_label).includes("免費")
  );
}

function priceText(event: EventRecord, locale: AppLocale) {
  if (isFreeEvent(event)) return uiText(locale, "免費", "免费", "Free");

  const label = safeText(event.price_label);
  if (label) return label;

  const min = Number(event.min_price);
  const max = Number(event.max_price);

  if (Number.isFinite(min) && min >= 0) {
    if (Number.isFinite(max) && max >= 0 && max !== min) {
      return `HK$${min}–${max}`;
    }
    if (min > 0) return `HK$${min}`;
  }

  return uiText(locale, "價錢見活動詳情", "价格见活动详情", "See event price");
}

function ageText(event: EventRecord, locale: AppLocale) {
  const group = safeText(event.age_group);
  if (group) return group;

  const min = typeof event.age_min === "number" ? event.age_min : null;
  const max = typeof event.age_max === "number" ? event.age_max : null;

  if (min !== null && max !== null) {
    return locale === "en" ? `Ages ${min}–${max}` : `${min}–${max}歲`;
  }
  if (min !== null) return locale === "en" ? `Ages ${min}+` : `${min}歲以上`;
  if (max !== null) return locale === "en" ? `Up to age ${max}` : `${max}歲或以下`;

  return uiText(locale, "年齡待定", "年龄待定", "Age TBC");
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

function hasCoordinates(event: EventRecord) {
  if (
    event.latitude === null ||
    event.latitude === undefined ||
    event.longitude === null ||
    event.longitude === undefined
  ) {
    return false;
  }

  const latitude = Number(event.latitude);
  const longitude = Number(event.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }

  // HK Family Fun is a Hong Kong activity platform. Reject null/default (0,0)
  // and obviously invalid out-of-market coordinates so one bad row cannot
  // zoom the public map out to the whole world.
  return (
    latitude >= 22.10 &&
    latitude <= 22.60 &&
    longitude >= 113.80 &&
    longitude <= 114.50
  );
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

  if (dayOfWeek === 0) {
    const saturday = addCalendarDays(today, -1);
    return overlapsRange(event, saturday, today);
  }

  const daysUntilSaturday = dayOfWeek === 6 ? 0 : 6 - dayOfWeek;
  const saturday = addCalendarDays(today, daysUntilSaturday);
  const sunday = addCalendarDays(saturday, 1);

  return overlapsRange(event, saturday, sunday);
}

function isInsideBounds(event: EventRecord, bounds: MapBounds | null) {
  if (!bounds) return true;
  if (!hasCoordinates(event)) return false;

  const lat = Number(event.latitude);
  const lon = Number(event.longitude);

  const latitudeMatches = lat <= bounds.north && lat >= bounds.south;
  const longitudeMatches =
    bounds.west <= bounds.east
      ? lon >= bounds.west && lon <= bounds.east
      : lon >= bounds.west || lon <= bounds.east;

  return latitudeMatches && longitudeMatches;
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
  const [locale, setLocale] = useState<AppLocale>("zh-Hant");
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [district, setDistrict] = useState("全部地區");
  const [mtr, setMtr] = useState("全部港鐵");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const [senOnly, setSenOnly] = useState(false);
  const [radius, setRadius] = useState<RadiusFilter>("all");
  const [userLocation, setUserLocation] = useState<UserLocation>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [viewportOnly, setViewportOnly] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("map");
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    setLocale(getClientLocale());

    async function loadEvents() {
      if (!supabase) {
        setErrorText("網站暫時未能連接活動資料庫。");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("public_events_i18n")
        .select(
          "id,title_tc,title_sc,title_en,short_description_tc,short_description_sc,short_description_en,venue_name,venue_name_sc,venue_name_en,address,address_sc,address_en,district,mtr_station,start_date,end_date,start_time,end_time,price_display_mode,price_label,is_free,is_sen_friendly,category,activity_category,tags,cover_image_url,google_map_url,latitude,longitude",
        )
        .eq("status", "published")
        .order("start_date", { ascending: true });

      if (error) {
        setErrorText(error.message || "讀取活動資料失敗。");
        setEvents([]);
      } else {
        setEvents((data || []) as EventRecord[]);
        setFitRequest((value) => value + 1);
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

  const filtered = useMemo<DisplayEvent[]>(() => {
    const text = keyword.trim().toLowerCase();

    const rows = events
      .filter((event) => {
        const haystack = [
          event.title_tc,
          event.title_sc,
          event.title_en,
          event.short_description_tc,
          event.short_description_sc,
          event.short_description_en,
          event.venue_name,
          event.venue_name_sc,
          event.venue_name_en,
          event.address,
          event.address_sc,
          event.address_en,
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
        const matchesViewport =
          !viewportOnly || isInsideBounds(event, mapBounds);

        return (
          matchesKeyword &&
          matchesDistrict &&
          matchesMtr &&
          matchesFree &&
          matchesSen &&
          matchesDate &&
          matchesViewport
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
        if (!userLocation || radius === "all") return true;
        if (typeof event.distanceKm !== "number") return false;
        return event.distanceKm <= Number(radius);
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

        if (aDistance !== bDistance) return aDistance - bDistance;

        return safeText(a.start_date).localeCompare(safeText(b.start_date));
      });
    }

    return rows;
  }, [
    dateFilter,
    district,
    events,
    freeOnly,
    keyword,
    mapBounds,
    mtr,
    radius,
    senOnly,
    userLocation,
    viewportOnly,
  ]);

  const mappedEvents = useMemo<MapEvent[]>(
    () =>
      filtered
        .filter(hasCoordinates)
        .map((event) => ({
          id: event.id,
          title: localizedText(locale, {
            tc: event.title_tc,
            sc: event.title_sc,
            en: event.title_en,
            fallback: uiText(locale, "未命名活動", "未命名活动", "Untitled event"),
          }),
          venue: localizedText(locale, {
            tc: event.venue_name || event.address,
            sc: event.venue_name_sc || event.address_sc,
            en: event.venue_name_en || event.address_en,
            fallback: uiText(locale, "場地待定", "场地待定", "Venue TBC"),
          }),
          district: safeText(event.district),
          mtrStation: safeText(event.mtr_station),
          date: dateText(event),
          time: timeText(event),
          latitude: Number(event.latitude),
          longitude: Number(event.longitude),
          distanceKm:
            typeof event.distanceKm === "number" ? event.distanceKm : null,
          imageUrl: event.cover_image_url || null,
          mapUrl: mapUrl(event),
          isFree: isFreeEvent(event),
          isSenFriendly: Boolean(event.is_sen_friendly),
          price: priceText(event, locale),
          age: ageText(event, locale),
          organizer: safeText(
            event.organizer_name || event.merchant_name,
            uiText(locale, "主辦方待定", "主办方待定", "Organizer TBC"),
          ),
          category: safeText(
            event.activity_category || event.category,
            uiText(locale, "親子活動", "亲子活动", "Family Activity"),
          ),
        })),
    [filtered, locale],
  );

  const selectedEvent =
    filtered.find((event) => event.id === selectedEventId) || null;

  const activeFilterCount =
    (district !== "全部地區" ? 1 : 0) +
    (mtr !== "全部港鐵" ? 1 : 0) +
    (dateFilter !== "all" ? 1 : 0) +
    (freeOnly ? 1 : 0) +
    (senOnly ? 1 : 0) +
    (radius !== "all" ? 1 : 0) +
    (viewportOnly ? 1 : 0);

  const unmappedCount = filtered.length - mappedEvents.length;
  const mappedPlaceCount = useMemo(
    () =>
      new Set(
        mappedEvents.map(
          (event) =>
            `${event.latitude.toFixed(6)}|${event.longitude.toFixed(6)}`,
        ),
      ).size,
    [mappedEvents],
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
    if (!selectedEventId || mobileView === "map") return;

    const timer = window.setTimeout(() => {
      cardRefs.current[selectedEventId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [mobileView, selectedEventId]);

  function useMyLocation() {
    setLocationMessage("");

    if (!navigator.geolocation) {
      setLocationMessage("此瀏覽器不支援定位，仍可使用地區及港鐵搜尋。");
      return;
    }

    setLocating(true);
    setLocationMessage("正在取得你的位置…");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setRadius("10");
        setLocating(false);
        setLocationMessage("定位成功。預設顯示10公里內活動，並由近至遠排列。");
        setViewportOnly(false);
        setFitRequest((value) => value + 1);
      },
      () => {
        setLocating(false);
        setLocationMessage(
          "未能取得位置。請在瀏覽器允許 Location，或繼續用地區／港鐵搜尋。",
        );
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
    setRadius("all");
    setLocationMessage("已停止使用目前位置。");
    setFitRequest((value) => value + 1);
  }

  function clearFilters() {
    setKeyword("");
    setDistrict("全部地區");
    setMtr("全部港鐵");
    setDateFilter("all");
    setFreeOnly(false);
    setSenOnly(false);
    setRadius("all");
    setViewportOnly(false);
    setSelectedEventId(null);
    setFitRequest((value) => value + 1);
  }

  function selectEvent(eventId: string) {
    setSelectedEventId(eventId);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">
              Nearby Explorer
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              {uiText(locale, "地圖搵附近親子活動", "地图找附近亲子活动", "Find Family Events Nearby")}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {uiText(locale, "拖動地圖、按標記或用目前位置搵最近活動。定位只留喺瀏覽器。", "拖动地图、按标记或使用当前位置寻找最近活动。定位只保留在浏览器。", "Move the map, select a marker or use your current location to find nearby events. Your location stays in your browser.")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/events"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              ☰ {uiText(locale, "完整活動列表", "完整活动列表", "Full Event List")}
            </Link>
            <button
              type="button"
              onClick={() => {
                setViewportOnly(false);
                setFitRequest((value) => value + 1);
              }}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              ⛶ {uiText(locale, "顯示全部", "显示全部", "Show All")}
            </button>
          </div>
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
            🗺️ {uiText(locale, "地圖", "地图", "Map")}
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
            ☰ {uiText(locale, "活動", "活动", "Events")} {filtered.length}
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-[1600px] p-3 sm:p-4 lg:h-[calc(100vh-10rem)] lg:p-5">
        <div className="grid gap-3 lg:h-full lg:grid-cols-[430px_minmax(0,1fr)]">
          <aside
            className={
              mobileView === "list"
                ? "order-2 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm lg:order-1 lg:flex lg:h-full lg:flex-col"
                : "order-2 hidden overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm lg:order-1 lg:flex lg:h-full lg:flex-col"
            }
          >
            <div className="border-b border-slate-200 p-4">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  🔎
                </span>
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder={uiText(locale, "搜尋活動、場地、港鐵站...", "搜索活动、场地、港铁站...", "Search events, venues or MTR...")}
                  className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <select
                  value={district}
                  onChange={(event) => setDistrict(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700"
                >
                  {districts.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>

                <select
                  value={mtr}
                  onChange={(event) => setMtr(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700"
                >
                  {mtrStations.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  ["all", uiText(locale, "全部日期", "全部日期", "All Dates")],
                  ["today", uiText(locale, "今日", "今天", "Today")],
                  ["tomorrow", uiText(locale, "明日", "明天", "Tomorrow")],
                  ["weekend", uiText(locale, "今個週末", "这个周末", "This Weekend")],
                ] as [DateFilter, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDateFilter(value)}
                    className={
                      dateFilter === value
                        ? "rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white"
                        : "rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFreeOnly((value) => !value)}
                  className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                    freeOnly
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {uiText(locale, "免費", "免费", "Free")}
                </button>

                <button
                  type="button"
                  onClick={() => setSenOnly((value) => !value)}
                  className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                    senOnly
                      ? "border-purple-600 bg-purple-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {uiText(locale, "SEN友善", "SEN友善", "SEN Friendly")}
                </button>

                <button
                  type="button"
                  onClick={userLocation ? clearMyLocation : useMyLocation}
                  disabled={locating}
                  className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                    userLocation
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  } disabled:opacity-60`}
                >
                  {locating
                    ? uiText(locale, "定位中…", "定位中…", "Locating…")
                    : userLocation
                      ? `📍 ${uiText(locale, "已使用我的位置", "已使用我的位置", "Using My Location")}`
                      : `📍 ${uiText(locale, "附近我", "附近我", "Near Me")}`}
                </button>

                {userLocation ? (
                  <select
                    value={radius}
                    onChange={(event) =>
                      setRadius(event.target.value as RadiusFilter)
                    }
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-800"
                  >
                    <option value="all">{uiText(locale, "不限距離", "不限距离", "Any Distance")}</option>
                    <option value="2">2 km {uiText(locale, "內", "内", "radius")}</option>
                    <option value="5">5 km {uiText(locale, "內", "内", "radius")}</option>
                    <option value="10">10 km {uiText(locale, "內", "内", "radius")}</option>
                    <option value="20">20 km {uiText(locale, "內", "内", "radius")}</option>
                  </select>
                ) : null}

                {activeFilterCount > 0 || keyword ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-full px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50"
                  >
                    {uiText(locale, "清除篩選", "清除筛选", "Clear Filters")}
                  </button>
                ) : null}
              </div>

              {locationMessage ? (
                <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-blue-800">
                  {locationMessage}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-xs font-bold text-slate-500">
              <span>
                {loading
                  ? uiText(locale, "正在讀取...", "正在读取...", "Loading...")
                  : `${filtered.length} 個活動 · ${mappedPlaceCount} 個地點`}
              </span>
              {unmappedCount > 0 ? (
                <span title="仍會顯示喺列表">
                  {unmappedCount} 個未定位
                </span>
              ) : null}
            </div>

            <div className="max-h-[58vh] overflow-y-auto p-3 lg:max-h-none lg:flex-1">
              {errorText ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
                  {errorText}
                </div>
              ) : null}

              {!loading && !errorText && !filtered.length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <p className="font-black">{uiText(locale, "暫未找到符合條件的活動", "暂未找到符合条件的活动", "No matching events found")}</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-3 text-sm font-black text-teal-700"
                  >
                    {uiText(locale, "清除篩選再試", "清除筛选再试", "Clear Filters")}
                  </button>
                </div>
              ) : null}

              <div className="space-y-3">
                {filtered.map((event) => {
                  const selected = event.id === selectedEventId;
                  const tags = normalizeTags(event.tags);
                  const mapped = hasCoordinates(event);

                  return (
                    <article
                      key={event.id}
                      ref={(node) => {
                        cardRefs.current[event.id] = node;
                      }}
                      onClick={() => mapped && selectEvent(event.id)}
                      className={`overflow-hidden rounded-2xl border bg-white transition ${
                        mapped ? "cursor-pointer" : ""
                      } ${
                        selected
                          ? "border-purple-400 shadow-md ring-2 ring-purple-100"
                          : "border-slate-200 hover:border-teal-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 p-3">
                        <div className="relative">
                          <div className="h-28 w-28 overflow-hidden rounded-xl">
                            <ResilientEventImage
                              src={event.cover_image_url}
                              alt={localizedText(locale, {
                                tc: event.title_tc,
                                sc: event.title_sc,
                                en: event.title_en,
                                fallback: uiText(locale, "活動圖片", "活动图片", "Event image"),
                              })}
                              loading="lazy"
                              compactFallback
                              className="h-28 w-28 object-cover"
                            />
                          </div>

                          {mapped ? (
                            <span className="absolute bottom-1 left-1 rounded-md bg-teal-700/95 px-1.5 py-1 text-[10px] font-bold text-white">
                              📍 地圖定位
                            </span>
                          ) : (
                            <span className="absolute bottom-1 left-1 rounded-md bg-slate-950/80 px-1.5 py-1 text-[10px] font-bold text-white">
                              未定位
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-1.5">
                            {hasCoordinates(event) ? (
                              <span className="rounded-full bg-teal-50 px-2 py-1 text-[10px] font-black text-teal-700">
                                📍 已定位
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
                                未定位
                              </span>
                            )}
                            <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
                              isFreeEvent(event)
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-800"
                            }`}>
                              {priceText(event, locale)}
                            </span>
                            {event.is_sen_friendly ? (
                              <span className="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-black text-purple-700">
                                SEN
                              </span>
                            ) : null}
                            {typeof event.distanceKm === "number" ? (
                              <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                                {event.distanceKm.toFixed(1)} km
                              </span>
                            ) : null}
                          </div>

                          <h2 className="mt-2 line-clamp-2 text-sm font-black leading-5 text-slate-950">
                            {localizedText(locale, {
                              tc: event.title_tc,
                              sc: event.title_sc,
                              en: event.title_en,
                              fallback: uiText(locale, "未命名活動", "未命名活动", "Untitled event"),
                            })}
                          </h2>

                          <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                            {localizedText(locale, {
                              tc: event.venue_name || event.address,
                              sc: event.venue_name_sc || event.address_sc,
                              en: event.venue_name_en || event.address_en,
                              fallback: uiText(locale, "場地待定", "场地待定", "Venue TBC"),
                            })}
                          </p>

                          <p className="mt-1 text-[11px] font-bold text-slate-500">
                            {dateText(event)} · {timeText(event)}
                          </p>
                          <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-slate-500">
                            {ageText(event, locale)} · {safeText(
                              event.organizer_name || event.merchant_name,
                              uiText(locale, "主辦方待定", "主办方待定", "Organizer TBC"),
                            )}
                          </p>

                          {event.mtr_station ? (
                            <p className="mt-1 text-[11px] text-slate-500">
                              {uiText(locale, "港鐵", "港铁", "MTR")} {event.mtr_station}
                              {event.district ? ` · ${event.district}` : ""}
                            </p>
                          ) : event.district ? (
                            <p className="mt-1 text-[11px] text-slate-500">
                              {event.district}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div
                        className={`border-t px-3 py-3 ${
                          selected
                            ? "border-purple-100 bg-purple-50/50"
                            : "border-slate-100"
                        }`}
                      >
                        {selected && tags.length ? (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-purple-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/events/${event.id}`}
                            onClick={(clickEvent) => clickEvent.stopPropagation()}
                            className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white"
                          >
                            {uiText(locale, "活動詳情", "活动详情", "Event Details")}
                          </Link>
                          <a
                            href={mapUrl(event)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(clickEvent) => clickEvent.stopPropagation()}
                            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700"
                          >
                            {uiText(locale, "Google Maps路線", "Google Maps路线", "Google Maps")}
                          </a>
                          {mapped ? (
                            <button
                              type="button"
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation();
                                setSelectedEventId(event.id);
                                setMobileView("map");
                              }}
                              className="rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-black text-teal-700 lg:hidden"
                            >
                              {uiText(locale, "地圖顯示", "地图显示", "Show on Map")}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </aside>

          <div
            className={
              mobileView === "map"
                ? "order-1 lg:order-2 lg:h-full"
                : "order-1 hidden lg:order-2 lg:block lg:h-full"
            }
          >
            <div className="relative h-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              {!errorText ? (
                <EventMapClient
                  events={mappedEvents}
                  userLocation={userLocation}
                  selectedEventId={selectedEventId}
                  onSelectEvent={selectEvent}
                  fitRequest={fitRequest}
                  fitEnabled={!viewportOnly}
                  onBoundsChange={setMapBounds}
                />
              ) : (
                <div className="flex min-h-[52vh] items-center justify-center p-8 text-center text-sm font-bold text-rose-700 lg:min-h-full">
                  暫時未能載入活動地圖。
                </div>
              )}

              <div className="pointer-events-none absolute left-3 top-3 z-[500] flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
                <div className="rounded-full bg-white/95 px-3 py-2 text-xs font-black text-slate-700 shadow-md backdrop-blur">
                  📍 {mappedPlaceCount} 個地點 · {mappedEvents.length} 個活動
                </div>
                {userLocation ? (
                  <div className="rounded-full bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-md">
                    附近排序
                  </div>
                ) : null}
                {viewportOnly ? (
                  <div className="rounded-full bg-purple-600 px-3 py-2 text-xs font-black text-white shadow-md">
                    只顯示此區域
                  </div>
                ) : null}
              </div>

              <div className="absolute right-3 top-14 z-[500] flex flex-col items-end gap-2">
                {mapBounds ? (
                  <button
                    type="button"
                    onClick={() => setViewportOnly((value) => !value)}
                    className={
                      viewportOnly
                        ? "rounded-full bg-purple-700 px-4 py-2 text-xs font-black text-white shadow-lg"
                        : "rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-black text-slate-700 shadow-lg backdrop-blur hover:bg-white"
                    }
                  >
                    {viewportOnly ? "✓ 此區域搜尋中" : "搜尋此地圖範圍"}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setViewportOnly(false);
                    setFitRequest((value) => value + 1);
                  }}
                  className="rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-black text-slate-700 shadow-lg backdrop-blur hover:bg-white"
                >
                  ⛶ 重置地圖
                </button>
              </div>

              {selectedEvent ? (
                <div className="absolute bottom-4 left-4 right-4 z-[500] mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur lg:hidden">
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

            <p className="mt-2 px-2 text-center text-[11px] text-slate-400 lg:text-right">
              地圖資料 © OpenStreetMap contributors · 路線按鈕會開啟 Google Maps
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
