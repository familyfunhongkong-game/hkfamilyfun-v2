"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type EventRow = {
  id: string;
  title_tc?: string | null;
  title?: string | null;
  short_description_tc?: string | null;
  description_tc?: string | null;
  cover_image_url?: string | null;
  venue_name?: string | null;
  address?: string | null;
  district?: string | null;
  mtr_station?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  price_type?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  category?: string | null;
  tags?: string[] | string | null;
  age_groups?: string[] | string | null;
  is_sen_friendly?: boolean | null;
  is_indoor?: boolean | null;
  is_outdoor?: boolean | null;
  registration_required?: boolean | null;
  status?: string | null;
  publish_status?: string | null;
};

type PublicEvent = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  venue: string;
  address: string;
  district: string;
  mtrStation: string;
  startDate: string | null;
  endDate: string | null;
  dateText: string;
  timeText: string;
  priceText: string;
  category: string;
  tags: string[];
  ageText: string;
  isSenFriendly: boolean;
  isIndoor: boolean;
  isOutdoor: boolean;
};

const fallbackEvents: PublicEvent[] = [
  {
    id: "25ba737b-219e-4770-91cb-f6cbe73898e3",
    title: "Pixar Summer Fest 2026",
    description: "走進 Pixar 動畫世界，親子打卡、互動遊戲及限定活動。",
    imageUrl: null,
    venue: "海港城",
    address: "尖沙咀海港城",
    district: "油尖旺區",
    mtrStation: "尖沙咀",
    startDate: "2026-07-01",
    endDate: "2026-08-31",
    dateText: "2026-07-01 至 2026-08-31",
    timeText: "10:00 - 22:00",
    priceText: "免費",
    category: "親子活動",
    tags: ["親子", "打卡", "免費"],
    ageText: "3歲以上",
    isSenFriendly: false,
    isIndoor: true,
    isOutdoor: false,
  },
  {
    id: "sample-apm-workshop",
    title: "APM 復活節親子工作坊",
    description: "適合親子一同參與的商場手作活動。",
    imageUrl: null,
    venue: "APM 購物中心",
    address: "觀塘 APM",
    district: "觀塘區",
    mtrStation: "觀塘",
    startDate: null,
    endDate: null,
    dateText: "今日",
    timeText: "15:00 - 16:30",
    priceText: "免費",
    category: "親子工作坊",
    tags: ["免費", "3-6歲", "室內"],
    ageText: "3-6歲",
    isSenFriendly: false,
    isIndoor: true,
    isOutdoor: false,
  },
  {
    id: "sample-shatin-family",
    title: "沙田親子手作體驗",
    description: "親子手作及互動體驗活動。",
    imageUrl: null,
    venue: "沙田商場",
    address: "沙田",
    district: "沙田區",
    mtrStation: "沙田",
    startDate: null,
    endDate: null,
    dateText: "今個週末",
    timeText: "14:00 - 17:00",
    priceText: "HK$50 起",
    category: "親子活動",
    tags: ["親子", "室內"],
    ageText: "4-8歲",
    isSenFriendly: false,
    isIndoor: true,
    isOutdoor: false,
  },
];

function normalizeText(value: unknown, fallback = "待確認") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\n，、|]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

function formatDate(value?: string | null) {
  if (!value) return "日期待確認";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateRange(startDate?: string | null, endDate?: string | null) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (!startDate && !endDate) return "日期待確認";
  if (startDate && endDate && start !== end) return `${start} 至 ${end}`;

  return start;
}

function formatTimeRange(startTime?: string | null, endTime?: string | null) {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return startTime;
  return "時間待確認";
}

function formatPrice(event: EventRow) {
  if (event.price_type === "free") return "免費";

  const min = typeof event.price_min === "number" ? event.price_min : null;
  const max = typeof event.price_max === "number" ? event.price_max : null;

  if (min !== null && max !== null) return `HK$${min} - HK$${max}`;
  if (min !== null) return `HK$${min} 起`;
  if (max !== null) return `最高 HK$${max}`;

  return "收費待確認";
}

function isPublished(event: EventRow) {
  return event.status === "published" || event.publish_status === "published";
}

function buildPublicEvent(event: EventRow): PublicEvent {
  const rawTags = normalizeList(event.tags);
  const ageGroups = normalizeList(event.age_groups);

  const tags = [
    ...rawTags,
    event.price_type === "free" ? "免費" : "",
    event.is_sen_friendly ? "SEN友善" : "",
    event.is_indoor ? "室內" : "",
    event.is_outdoor ? "戶外" : "",
  ].filter(Boolean);

  return {
    id: String(event.id),
    title: normalizeText(event.title_tc ?? event.title, "未命名活動"),
    description: normalizeText(
      event.short_description_tc ?? event.description_tc,
      "活動資料由商戶或公開來源提供，請出發前向主辦方確認最新安排。",
    ),
    imageUrl: event.cover_image_url ?? null,
    venue: normalizeText(event.venue_name, "場地待確認"),
    address: normalizeText(event.address, "地址待確認"),
    district: normalizeText(event.district, "地區待確認"),
    mtrStation: normalizeText(event.mtr_station, "港鐵站待確認"),
    startDate: event.start_date ?? null,
    endDate: event.end_date ?? null,
    dateText: formatDateRange(event.start_date, event.end_date),
    timeText: formatTimeRange(event.start_time, event.end_time),
    priceText: formatPrice(event),
    category: normalizeText(event.category, "親子活動"),
    tags: tags.length > 0 ? tags.slice(0, 5) : ["親子活動"],
    ageText: ageGroups.length > 0 ? ageGroups.join("、") : "年齡待確認",
    isSenFriendly: Boolean(event.is_sen_friendly),
    isIndoor: Boolean(event.is_indoor),
    isOutdoor: Boolean(event.is_outdoor),
  };
}

function getPlaceholderText(category: string) {
  if (category.includes("工作坊")) return "工作坊";
  if (category.includes("教育")) return "閱讀";
  if (category.includes("藝術")) return "藝術";
  if (category.includes("運動")) return "運動";
  if (category.includes("商場")) return "商場";
  return "親子";
}

function getPlaceholderStyle(category: string) {
  if (category.includes("工作坊")) return "bg-violet-100 text-violet-700";
  if (category.includes("教育")) return "bg-blue-100 text-blue-700";
  if (category.includes("藝術")) return "bg-pink-100 text-pink-700";
  if (category.includes("運動")) return "bg-emerald-100 text-emerald-700";
  if (category.includes("商場")) return "bg-orange-100 text-orange-700";
  return "bg-purple-100 text-purple-700";
}

function isTodayEvent(event: PublicEvent) {
  if (event.dateText.includes("今日")) return true;
  if (!event.startDate && !event.endDate) return false;

  const today = new Date();
  const todayText = today.toISOString().slice(0, 10);

  const start = event.startDate ?? event.endDate;
  const end = event.endDate ?? event.startDate;

  if (!start || !end) return false;

  return start <= todayText && todayText <= end;
}

export default function EventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>(fallbackEvents);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("全部地區");
  const [selectedPrice, setSelectedPrice] = useState("全部收費");
  const [selectedCategory, setSelectedCategory] = useState("全部分類");
  const [showSenOnly, setShowSenOnly] = useState(false);
  const [todayOnly, setTodayOnly] = useState(false);
  const [calendarMode, setCalendarMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTodayOnly(params.get("date") === "today");
    setCalendarMode(params.get("view") === "calendar");
  }, []);

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      setLoading(true);

      if (!supabase) {
        setEvents(fallbackEvents);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: true });

      if (!active) return;

      if (error || !data || data.length === 0) {
        setEvents(fallbackEvents);
        setLoading(false);
        return;
      }

      const publishedRows = (data as EventRow[]).filter(isPublished);

      if (publishedRows.length === 0) {
        setEvents(fallbackEvents);
        setLoading(false);
        return;
      }

      setEvents(publishedRows.map(buildPublicEvent));
      setLoading(false);
    }

    loadEvents();

    return () => {
      active = false;
    };
  }, []);

  const districts = useMemo(() => {
    return ["全部地區", ...Array.from(new Set(events.map((item) => item.district)))];
  }, [events]);

  const categories = useMemo(() => {
    return ["全部分類", ...Array.from(new Set(events.map((item) => item.category)))];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return events.filter((event) => {
      const searchableText = [
        event.title,
        event.description,
        event.venue,
        event.address,
        event.district,
        event.mtrStation,
        event.category,
        event.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      const matchKeyword =
        search.length === 0 || searchableText.includes(search);

      const matchDistrict =
        selectedDistrict === "全部地區" || event.district === selectedDistrict;

      const matchPrice =
        selectedPrice === "全部收費" ||
        (selectedPrice === "免費" && event.priceText.includes("免費")) ||
        (selectedPrice === "收費" && !event.priceText.includes("免費"));

      const matchCategory =
        selectedCategory === "全部分類" || event.category === selectedCategory;

      const matchSen =
        !showSenOnly || event.isSenFriendly || event.tags.some((tag) => tag.includes("SEN"));

      const matchToday = !todayOnly || isTodayEvent(event);

      return (
        matchKeyword &&
        matchDistrict &&
        matchPrice &&
        matchCategory &&
        matchSen &&
        matchToday
      );
    });
  }, [
    events,
    keyword,
    selectedDistrict,
    selectedPrice,
    selectedCategory,
    showSenOnly,
    todayOnly,
  ]);

  const totalPublished = events.length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                setTodayOnly(true);
                setCalendarMode(false);
              }}
              className={`rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                todayOnly
                  ? "border-pink-300 bg-pink-100 ring-2 ring-pink-100"
                  : "border-pink-100 bg-pink-50"
              }`}
            >
              <p className="text-sm font-black text-pink-700">今日活動</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                今日帶小朋友去邊？
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                快速查看今日仍可參加的親子活動。
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setCalendarMode(true);
                setTodayOnly(false);
              }}
              className={`rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                calendarMode
                  ? "border-blue-300 bg-blue-100 ring-2 ring-blue-100"
                  : "border-blue-100 bg-blue-50"
              }`}
            >
              <p className="text-sm font-black text-blue-700">活動日曆</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                按日期計劃親子時間
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                用日曆方式查看今日、今個週末、本週及本月活動。
              </p>
            </button>

            <Link
              href="/events/map"
              className="rounded-3xl border border-teal-100 bg-teal-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
            >
              <p className="text-sm font-black text-teal-700">尋找附近活動地圖</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                用地圖找附近親子活動
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                按地區、港鐵站及位置快速搵適合活動。
              </p>
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-purple-700">
                  HK Family Fun Public Events
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight">
                  搜尋香港親子活動
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                  以下只顯示已經 HK Family Fun 審批及發布的活動。草稿、審批中、已退回或已封存活動不會公開顯示。
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                已發布活動：{totalPublished}
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-[1.5fr_0.9fr_0.9fr_0.9fr_auto]">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜尋活動名稱、地點、港鐵站、分類、標籤..."
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
              />

              <select
                value={selectedDistrict}
                onChange={(event) => setSelectedDistrict(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
              >
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={selectedPrice}
                onChange={(event) => setSelectedPrice(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
              >
                <option value="全部收費">全部收費</option>
                <option value="免費">免費</option>
                <option value="收費">收費</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setKeyword("");
                  setSelectedDistrict("全部地區");
                  setSelectedCategory("全部分類");
                  setSelectedPrice("全部收費");
                  setShowSenOnly(false);
                  setTodayOnly(false);
                  setCalendarMode(false);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:border-purple-300 hover:text-purple-700"
              >
                清除
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setTodayOnly((current) => !current)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  todayOnly
                    ? "bg-pink-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-pink-300 hover:text-pink-700"
                }`}
              >
                今日
              </button>

              <button
                type="button"
                onClick={() => setCalendarMode((current) => !current)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  calendarMode
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                }`}
              >
                活動日曆
              </button>

              <Link
                href="/events/map"
                className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-700 hover:bg-teal-100"
              >
                附近活動地圖
              </Link>

              <button
                type="button"
                onClick={() => setSelectedPrice("免費")}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
              >
                免費活動
              </button>

              <button
                type="button"
                onClick={() => setShowSenOnly((current) => !current)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  showSenOnly
                    ? "bg-purple-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:text-purple-700"
                }`}
              >
                SEN友善
              </button>

              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:border-orange-300 hover:text-orange-700"
              >
                今個週末
              </button>
            </div>
          </div>
        </div>
      </section>

      {calendarMode ? (
        <section className="border-b border-blue-100 bg-blue-50">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-blue-700">活動日曆模式</p>
                  <h2 className="mt-1 text-xl font-black">
                    按日期 / 上午 / 下午 / 晚上快速計劃
                  </h2>
                </div>
                <p className="text-sm font-semibold text-slate-500">
                  目前先以列表分組展示，下一階段可升級為完整月曆。
                </p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {["上午", "下午", "晚上", "全日 / 長時間"].map((slot) => (
                  <div
                    key={slot}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <p className="text-sm font-black text-slate-700">{slot}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      商戶活動會按時間自動分組，方便家長快速安排。
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black">
            活動列表{" "}
            <span className="text-base font-bold text-slate-500">
              顯示 {filteredEvents.length} / {totalPublished} 個已發布活動
            </span>
          </h2>

          <Link
            href="/events/map"
            className="rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-bold text-teal-700 hover:bg-teal-50"
          >
            前往附近活動地圖
          </Link>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500">
            正在載入活動...
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredEvents.map((event) => (
            <article
              key={event.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md"
            >
              <div className="relative h-44 bg-slate-100">
                {event.imageUrl ? (
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className={`flex h-full w-full items-center justify-center text-lg font-black ${getPlaceholderStyle(
                      event.category,
                    )}`}
                  >
                    {getPlaceholderText(event.category)}
                  </div>
                )}

                <div className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black text-purple-700 shadow-sm">
                  {event.category}
                </div>

                <div className="absolute right-3 top-3 rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white shadow-sm">
                  {event.district}
                </div>
              </div>

              <div className="p-5">
                <h3 className="line-clamp-2 text-lg font-black leading-7 text-slate-950">
                  {event.title}
                </h3>

                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                  {event.description}
                </p>

                <div className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                  <p>日期：{event.dateText} · {event.timeText}</p>
                  <p>
                    地點：{event.venue} · {event.mtrStation}
                  </p>
                  <p>
                    收費：{event.priceText} · {event.ageText}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {event.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex gap-3">
                  <Link
                    href={`/events/${event.id}`}
                    className="flex-1 rounded-2xl bg-purple-700 px-4 py-3 text-center text-sm font-bold text-white hover:bg-purple-800"
                  >
                    查看詳情
                  </Link>
                  <Link
                    href="/events/map"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:border-teal-300 hover:text-teal-700"
                  >
                    地圖
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
            <h3 className="text-lg font-black text-slate-950">
              暫時找不到符合條件的活動
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              請嘗試清除搜尋字眼，或改用其他地區、分類及收費條件。
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}