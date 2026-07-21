"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Search,
  SlidersHorizontal,
  Ticket,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type PublicEvent = {
  id: string;
  title_tc: string | null;
  short_description_tc: string | null;
  description_tc: string | null;
  organizer_name: string | null;
  venue_name: string | null;
  address: string | null;
  district: string | null;
  mtr_station: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  price_type: string | null;
  price_min: number | null;
  price_max: number | null;
  category: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
  status: string | null;
  published_at: string | null;
  updated_at: string | null;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80";

const DISTRICT_FILTERS = [
  "全部地區",
  "全港",
  "多區",
  "網上",
  "中西區",
  "灣仔",
  "東區",
  "南區",
  "油尖旺",
  "深水埗",
  "九龍城",
  "黃大仙",
  "觀塘",
  "荃灣",
  "屯門",
  "元朗",
  "北區",
  "大埔",
  "沙田",
  "西貢",
  "葵青",
  "離島",
];

const PRICE_FILTERS = [
  { value: "all", label: "全部收費" },
  { value: "free", label: "免費" },
  { value: "paid", label: "收費" },
  { value: "mixed", label: "免費及收費" },
];

function formatDate(value: string | null) {
  if (!value) return "日期待確認";

  try {
    return new Intl.DateTimeFormat("zh-HK", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatTime(value: string | null) {
  if (!value) return "";

  return value.slice(0, 5);
}

function formatDateRange(event: PublicEvent) {
  const startDate = formatDate(event.start_date);
  const endDate = event.end_date ? formatDate(event.end_date) : "";

  if (!event.start_date) return "日期待確認";

  if (!event.end_date || event.end_date === event.start_date) {
    return startDate;
  }

  return `${startDate} 至 ${endDate}`;
}

function formatTimeRange(event: PublicEvent) {
  const startTime = formatTime(event.start_time);
  const endTime = formatTime(event.end_time);

  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return `${startTime} 開始`;
  return "時間待確認";
}

function formatPrice(event: PublicEvent) {
  if (event.price_type === "free") return "免費";
  if (event.price_type === "mixed") return "免費及收費";
  if (event.price_type === "unknown" || !event.price_type) return "收費待確認";

  const min = event.price_min;
  const max = event.price_max;

  if (min !== null && max !== null && min !== max) {
    return `HK$${min} - HK$${max}`;
  }

  if (min !== null) return `HK$${min}`;
  if (max !== null) return `HK$${max}`;

  return "收費";
}

function getPrimaryLocation(event: PublicEvent) {
  const venue = event.venue_name?.trim();
  const district = event.district?.trim();
  const mtrStation = event.mtr_station?.trim();

  const locationParts = [venue, district, mtrStation].filter(Boolean);

  if (locationParts.length === 0) return "地點待確認";

  return locationParts.join("・");
}

function getEventImage(event: PublicEvent) {
  return event.cover_image_url || FALLBACK_IMAGE;
}

function getEventTags(event: PublicEvent) {
  const tags = event.tags || [];

  if (tags.length > 0) return tags.slice(0, 4);

  if (event.category) return [event.category];

  return ["親子活動"];
}

function normalize(value: string | null | undefined) {
  return (value || "").toLowerCase().trim();
}

function matchesKeyword(event: PublicEvent, keyword: string) {
  const cleanedKeyword = keyword.toLowerCase().trim();

  if (!cleanedKeyword) return true;

  const searchableText = [
    event.title_tc,
    event.short_description_tc,
    event.description_tc,
    event.organizer_name,
    event.venue_name,
    event.address,
    event.district,
    event.mtr_station,
    event.category,
    ...(event.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(cleanedKeyword);
}

function matchesDistrict(event: PublicEvent, selectedDistrict: string) {
  if (selectedDistrict === "全部地區") return true;

  return normalize(event.district) === normalize(selectedDistrict);
}

function matchesPrice(event: PublicEvent, selectedPrice: string) {
  if (selectedPrice === "all") return true;

  return event.price_type === selectedPrice;
}

function isVisiblePublicEvent(event: PublicEvent) {
  return event.status === "published";
}

export default function PublicEventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("全部地區");
  const [selectedPrice, setSelectedPrice] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadEvents() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (!supabase) {
        setErrorMessage(
          "Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。"
        );
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select(
          [
            "id",
            "title_tc",
            "short_description_tc",
            "description_tc",
            "organizer_name",
            "venue_name",
            "address",
            "district",
            "mtr_station",
            "start_date",
            "end_date",
            "start_time",
            "end_time",
            "price_type",
            "price_min",
            "price_max",
            "category",
            "tags",
            "cover_image_url",
            "status",
            "published_at",
            "updated_at",
          ].join(", ")
        )
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .limit(100);

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      const loadedEvents = (data || []) as unknown as PublicEvent[];
      setEvents(loadedEvents.filter(isVisiblePublicEvent));
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "載入活動資料時發生未知錯誤。"
      );
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      return (
        matchesKeyword(event, keyword) &&
        matchesDistrict(event, selectedDistrict) &&
        matchesPrice(event, selectedPrice)
      );
    });
  }, [events, keyword, selectedDistrict, selectedPrice]);

  const totalPublished = events.length;
  const hasActiveFilter =
    keyword.trim() !== "" ||
    selectedDistrict !== "全部地區" ||
    selectedPrice !== "all";

  function clearFilters() {
    setKeyword("");
    setSelectedDistrict("全部地區");
    setSelectedPrice("all");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-primary-600">
            HK Family Fun Public Events
          </p>

          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">
                搜尋香港親子活動
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                以下只顯示已經由 HK Family Fun 審批及發布的活動。草稿、審批中、已退回或已封存活動不會公開顯示。
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              已發布活動：{" "}
              <span className="font-bold text-slate-950">
                {totalPublished}
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
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
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <MapPin className="h-4 w-4 text-primary-500" />
                  地區
                </span>

                <select
                  value={selectedDistrict}
                  onChange={(event) => setSelectedDistrict(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                >
                  {DISTRICT_FILTERS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Ticket className="h-4 w-4 text-primary-500" />
                  收費
                </span>

                <select
                  value={selectedPrice}
                  onChange={(event) => setSelectedPrice(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                >
                  {PRICE_FILTERS.map((price) => (
                    <option key={price.value} value={price.value}>
                      {price.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasActiveFilter}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  清除
                </button>
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {errorMessage}
          </section>
        ) : null}

        <section className="mt-6">
          {isLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <p className="text-sm text-slate-600">正在載入活動...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                暫時找不到合適活動
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                請嘗試清除篩選，或用其他關鍵字搜尋。
              </p>

              {hasActiveFilter ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-600"
                >
                  清除所有篩選
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-950">
                  活動列表
                </h2>

                <p className="text-sm text-slate-500">
                  顯示 {filteredEvents.length} / {totalPublished} 個已發布活動
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="relative h-48 overflow-hidden bg-slate-100">
                      <img
                        src={getEventImage(event)}
                        alt={event.title_tc || "HK Family Fun 活動圖片"}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />

                      <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-primary-600 shadow-sm">
                        {event.category || "親子活動"}
                      </div>

                      {event.district ? (
                        <div className="absolute right-4 top-4 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white">
                          {event.district}
                        </div>
                      ) : null}
                    </div>

                    <div className="p-5">
                      <h3 className="line-clamp-2 text-lg font-bold leading-7 text-slate-950 group-hover:text-primary-600">
                        {event.title_tc || "未命名活動"}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                        {event.short_description_tc ||
                          "活動資料已由 HK Family Fun 審批及發布。"}
                      </p>

                      <div className="mt-4 space-y-3 text-sm text-slate-700">
                        <div className="flex gap-2">
                          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                          <span>
                            {formatDateRange(event)}・{formatTimeRange(event)}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                          <span className="line-clamp-2">
                            {getPrimaryLocation(event)}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                          <span>{formatPrice(event)}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {getEventTags(event).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
