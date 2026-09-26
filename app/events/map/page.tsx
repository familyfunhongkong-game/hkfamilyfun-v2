"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { NearbyMapPoint } from "@/components/NearbyInteractiveMap";

const NearbyInteractiveMap = dynamic(
  () => import("@/components/NearbyInteractiveMap"),
  { ssr: false },
);

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

type GeoPoint = { lat: number; lng: number };

const GEO_CACHE_KEY = "hkff_geocode_cache_v1";

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

  const query = [event.venue_name, event.address, event.district, "Hong Kong"]
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

function readGeoCache(): Record<string, GeoPoint> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(GEO_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeGeoCache(cache: Record<string, GeoPoint>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
}

function geoKey(event: EventRecord) {
  return [event.venue_name, event.address, event.district]
    .map((item) => safeText(item))
    .filter(Boolean)
    .join("|");
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function geocodeEvent(event: EventRecord): Promise<GeoPoint | null> {
  const query = [event.venue_name, event.address, event.district, "Hong Kong"]
    .map((item) => safeText(item))
    .filter(Boolean)
    .join(", ");

  if (!query) return null;

  const response = await fetch("/api/geocode?q=" + encodeURIComponent(query));

  if (!response.ok) return null;

  const result = (await response.json()) as {
    found?: boolean;
    lat?: number;
    lng?: number;
  };

  if (
    !result.found ||
    typeof result.lat !== "number" ||
    typeof result.lng !== "number"
  ) {
    return null;
  }

  return {
    lat: result.lat,
    lng: result.lng,
  };
}

function haversineKm(a: GeoPoint, b: GeoPoint) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

export default function NearbyEventsMapPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [district, setDistrict] = useState("全部地區");
  const [freeOnly, setFreeOnly] = useState(false);
  const [senOnly, setSenOnly] = useState(false);
  const [geoPoints, setGeoPoints] = useState<Record<string, GeoPoint>>({});
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [locationError, setLocationError] = useState("");

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
        setLoading(false);
        return;
      }

      const rows = (data || []) as EventRecord[];
      setEvents(rows);

      const cache = readGeoCache();
      const nextPoints: Record<string, GeoPoint> = { ...cache };

      rows.forEach((event) => {
        if (
          typeof event.latitude === "number" &&
          typeof event.longitude === "number"
        ) {
          nextPoints[event.id] = {
            lat: event.latitude,
            lng: event.longitude,
          };
        } else {
          const cached = cache[geoKey(event)];
          if (cached) nextPoints[event.id] = cached;
        }
      });

      setGeoPoints(nextPoints);
      setLoading(false);

      const missing = rows.filter((event) => !nextPoints[event.id]);
      if (!missing.length) return;

      setGeocoding(true);

      for (const event of missing) {
        try {
          const point = await geocodeEvent(event);
          if (point) {
            nextPoints[event.id] = point;
            nextPoints[geoKey(event)] = point;
            setGeoPoints({ ...nextPoints });
            writeGeoCache(nextPoints);
          }
        } catch {
          // Continue with remaining events; cards and Google Maps links still work.
        }

        // Respect the public Nominatim low-volume usage policy.
        await sleep(1100);
      }

      setGeocoding(false);
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

    let rows = events.filter((event) => {
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
    });

    if (userLocation) {
      rows = [...rows].sort((a, b) => {
        const aPoint = geoPoints[a.id];
        const bPoint = geoPoints[b.id];
        if (!aPoint && !bPoint) return 0;
        if (!aPoint) return 1;
        if (!bPoint) return -1;
        return (
          haversineKm(userLocation, aPoint) -
          haversineKm(userLocation, bPoint)
        );
      });
    }

    return rows;
  }, [district, events, freeOnly, geoPoints, keyword, senOnly, userLocation]);

  const mapPoints = useMemo<NearbyMapPoint[]>(
    () =>
      filtered
        .map((event) => {
          const point = geoPoints[event.id];
          if (!point) return null;

          return {
            id: event.id,
            title: safeText(event.title_tc, "未命名活動"),
            venue: safeText(event.venue_name, event.address || "場地待定"),
            district: safeText(event.district, "地區待定"),
            date: dateText(event),
            time: timeText(event),
            lat: point.lat,
            lng: point.lng,
            href: `/events/${event.id}`,
          };
        })
        .filter(Boolean) as NearbyMapPoint[],
    [filtered, geoPoints],
  );

  function locateMe() {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("你的瀏覽器不支援定位功能。");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setLocationError("未能取得位置。你可以在瀏覽器允許位置權限後再試。");
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-sm font-black text-teal-700">附近活動地圖・地點探索</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            地圖搵附近親子活動
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            可拖動、縮放地圖及點活動標記查看詳情。按「附近我」後只會由瀏覽器取得目前位置，
            用作距離排序；HK Family Fun 不會把你的位置寫入活動資料庫。
          </p>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1.3fr_0.8fr_auto_auto_auto]">
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
              onClick={locateMe}
              className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-black text-white hover:bg-teal-800"
            >
              📍 附近我
            </button>
          </div>

          {locationError ? (
            <p className="mt-3 text-sm font-bold text-rose-700">{locationError}</p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-600">
              {loading ? "正在讀取..." : `顯示 ${filtered.length} 個活動・地圖已有 ${mapPoints.length} 個標記`}
            </p>
            {geocoding ? (
              <p className="mt-1 text-xs font-bold text-teal-700">
                正在以低頻方式定位尚未有座標的場地，地圖標記會逐步出現…
              </p>
            ) : null}
          </div>
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

        <div className="mb-7 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="h-[58vh] min-h-[420px] max-h-[720px]">
            <NearbyInteractiveMap
              points={mapPoints}
              userLocation={userLocation}
            />
          </div>
          <div className="border-t border-slate-200 bg-white px-5 py-3 text-xs text-slate-500">
            地圖資料 © OpenStreetMap contributors。地址定位屬輔助用途，出發前請以主辦方地址為準。
          </div>
        </div>

        {!loading && !errorText && !filtered.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-black">暫未找到符合條件的活動</h2>
            <p className="mt-2 text-sm text-slate-500">
              可以取消部分篩選，或稍後再查看新活動。
            </p>
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((event) => {
            const tags = normalizeTags(event.tags);
            const point = geoPoints[event.id];
            const distance =
              userLocation && point
                ? haversineKm(userLocation, point)
                : null;

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
                    {distance !== null ? (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                        約 {distance < 10 ? distance.toFixed(1) : Math.round(distance)} km
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
      </section>
    </main>
  );
}
