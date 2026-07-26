"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Filter,
  Loader2,
  MapPin,
  Search,
  Ticket,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type PublicEvent = {
  id: string;
  title_tc: string | null;
  short_description_tc: string | null;
  category: string | null;
  tags: string[] | null;

  cover_image_url: string | null;
  cover_image_focus_x: number | string | null;
  cover_image_focus_y: number | string | null;
  cover_image_zoom: number | string | null;

  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;

  venue_name: string | null;
  district: string | null;
  mtr_station: string | null;

  price_type: string | null;
  price_min: number | null;
  price_max: number | null;

  is_sen_friendly: boolean | null;
  is_indoor: boolean | null;
  status: string | null;
};

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80";

function toNumber(value: number | string | null | undefined, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function getCoverImageStyle(event: PublicEvent): CSSProperties {
  const focusX = toNumber(event.cover_image_focus_x, 50);
  const focusY = toNumber(event.cover_image_focus_y, 50);
  const zoom = Math.max(1, toNumber(event.cover_image_zoom, 1));

  return {
    objectPosition: `${focusX}% ${focusY}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${focusX}% ${focusY}%`,
  };
}

function formatDate(event: PublicEvent) {
  if (!event.start_date) return "日期待確認";

  const end =
    event.end_date && event.end_date !== event.start_date
      ? ` 至 ${event.end_date}`
      : "";

  return `${event.start_date}${end}`;
}

function formatTime(event: PublicEvent) {
  if (!event.start_time && !event.end_time) return "時間待確認";

  if (event.start_time && event.end_time) {
    return `${event.start_time} - ${event.end_time}`;
  }

  return event.start_time || event.end_time || "時間待確認";
}

function formatPrice(event: PublicEvent) {
  if (event.price_type === "free") return "免費";

  if (event.price_type === "paid") {
    if (event.price_min !== null && event.price_max !== null) {
      return `HK$${event.price_min} - HK$${event.price_max}`;
    }

    if (event.price_min !== null) return `HK$${event.price_min} 起`;
    if (event.price_max !== null) return `最高 HK$${event.price_max}`;

    return "收費";
  }

  if (event.price_type === "mixed") {
    if (event.price_min !== null || event.price_max !== null) {
      return `免費及收費 HK$${event.price_min ?? 0} - HK$${event.price_max ?? "待確認"}`;
    }

    return "免費及收費";
  }

  return "收費待確認";
}

export default function PublicEventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [keyword, setKeyword] = useState("");
  const [district, setDistrict] = useState("全部地區");
  const [priceType, setPriceType] = useState("全部收費");

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (!supabase) {
        setErrorMessage("Supabase client 未能初始化。");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select(
          `
          id,
          title_tc,
          short_description_tc,
          category,
          tags,
          cover_image_url,
          cover_image_focus_x,
          cover_image_focus_y,
          cover_image_zoom,
          start_date,
          end_date,
          start_time,
          end_time,
          venue_name,
          district,
          mtr_station,
          price_type,
          price_min,
          price_max,
          is_sen_friendly,
          is_indoor,
          status
        `
        )
        .eq("status", "published")
        .order("start_date", { ascending: true, nullsFirst: false })
        .order("updated_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setEvents((data || []) as PublicEvent[]);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "載入活動時發生未知錯誤。"
      );
      setIsLoading(false);
    }
  }

  const districts = useMemo(() => {
    const unique = new Set<string>();

    events.forEach((event) => {
      if (event.district) unique.add(event.district);
    });

    return ["全部地區", ...Array.from(unique).sort()];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();

    return events.filter((event) => {
      const text = [
        event.title_tc,
        event.short_description_tc,
        event.category,
        event.venue_name,
        event.district,
        event.mtr_station,
        ...(event.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const keywordMatch = !lowerKeyword || text.includes(lowerKeyword);
      const districtMatch =
        district === "全部地區" || event.district === district;
      const priceMatch =
        priceType === "全部收費" || event.price_type === priceType;

      return keywordMatch && districtMatch && priceMatch;
    });
  }, [events, keyword, district, priceType]);

  function clearFilters() {
    setKeyword("");
    setDistrict("全部地區");
    setPriceType("全部收費");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-black text-primary-600">
                HK Family Fun Public Events
              </div>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                搜尋香港親子活動
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                以下只顯示已經 HK Family Fun 審批及發布的活動。草稿、審批中、已退回或已封存活動不會公開顯示。
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
              已發布活動：{events.length}
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto]">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800">
                  <Search className="h-4 w-4 text-primary-500" />
                  關鍵字搜尋
                </span>
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="搜尋活動名稱、地點、港鐵站、分類、標籤..."
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800">
                  <MapPin className="h-4 w-4 text-primary-500" />
                  地區
                </span>
                <select
                  value={district}
                  onChange={(event) => setDistrict(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                >
                  {districts.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800">
                  <Ticket className="h-4 w-4 text-primary-500" />
                  收費
                </span>
                <select
                  value={priceType}
                  onChange={(event) => setPriceType(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                >
                  <option value="全部收費">全部收費</option>
                  <option value="free">免費</option>
                  <option value="paid">收費</option>
                  <option value="mixed">免費及收費</option>
                  <option value="unknown">收費待確認</option>
                </select>
              </label>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <Filter className="h-4 w-4" />
                清除
              </button>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {errorMessage}
          </section>
        ) : null}

        {isLoading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
              正在載入活動...
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-950">活動列表</h2>
              <div className="text-sm font-semibold text-slate-500">
                顯示 {filteredEvents.length} / {events.length} 個已發布活動
              </div>
            </div>

            {filteredEvents.length ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={event.cover_image_url || DEFAULT_COVER_IMAGE}
                        alt={event.title_tc || "Event cover"}
                        className="h-full w-full select-none object-cover transition duration-300 group-hover:scale-105"
                        style={getCoverImageStyle(event)}
                      />

                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-primary-600 shadow-sm">
                        {event.category || "親子活動"}
                      </span>

                      {event.district ? (
                        <span className="absolute right-3 top-3 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-black text-white shadow-sm">
                          {event.district}
                        </span>
                      ) : null}
                    </div>

                    <div className="p-5">
                      <h3 className="line-clamp-2 text-lg font-black leading-snug text-slate-950">
                        {event.title_tc || "活動標題待確認"}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                        {event.short_description_tc || "活動簡介待確認。"}
                      </p>

                      <div className="mt-4 space-y-2 text-sm text-slate-700">
                        <div className="flex gap-2">
                          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                          <span>
                            {formatDate(event)}・{formatTime(event)}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                          <span>
                            {event.venue_name || "地點待確認"}・
                            {event.mtr_station || "港鐵站待確認"}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                          <span>{formatPrice(event)}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(event.tags || []).slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-600"
                          >
                            #{tag}
                          </span>
                        ))}

                        {event.is_indoor ? (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-600">
                            室內
                          </span>
                        ) : null}

                        {event.is_sen_friendly ? (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                            SEN 友善
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                暫時找不到符合條件的活動。
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}