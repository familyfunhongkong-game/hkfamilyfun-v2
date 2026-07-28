"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type MapEvent = {
  id: string;
  title: string;
  description: string;
  venue: string;
  address: string;
  district: string;
  mtrStation: string;
  dateText: string;
  timeText: string;
  priceText: string;
  category: string;
  tags: string[];
  ageText: string;
  pinX: number;
  pinY: number;
};

const events: MapEvent[] = [
  {
    id: "25ba737b-219e-4770-91cb-f6cbe73898e3",
    title: "Pixar Summer Fest 2026",
    description: "走進 Pixar 動畫世界，親子打卡、互動遊戲及限定活動。",
    venue: "海港城",
    address: "尖沙咀海港城",
    district: "油尖旺區",
    mtrStation: "尖沙咀",
    dateText: "2026-07-01 至 2026-08-31",
    timeText: "10:00 - 22:00",
    priceText: "免費",
    category: "親子活動",
    tags: ["親子", "打卡", "免費"],
    ageText: "3歲以上",
    pinX: 48,
    pinY: 58,
  },
  {
    id: "sample-apm-workshop",
    title: "APM 復活節親子工作坊",
    description: "適合親子一同參與的商場手作活動。",
    venue: "APM 購物中心",
    address: "觀塘 APM",
    district: "觀塘區",
    mtrStation: "觀塘",
    dateText: "今日",
    timeText: "15:00 - 16:30",
    priceText: "免費",
    category: "親子工作坊",
    tags: ["免費", "3-6歲", "室內"],
    ageText: "3-6歲",
    pinX: 66,
    pinY: 45,
  },
  {
    id: "sample-shatin-family",
    title: "沙田親子手作體驗",
    description: "親子手作及互動體驗活動。",
    venue: "沙田商場",
    address: "沙田",
    district: "沙田區",
    mtrStation: "沙田",
    dateText: "今個週末",
    timeText: "14:00 - 17:00",
    priceText: "HK$50 起",
    category: "親子活動",
    tags: ["親子", "室內"],
    ageText: "4-8歲",
    pinX: 58,
    pinY: 26,
  },
  {
    id: "sample-library",
    title: "夏日圖書館親子活動",
    description: "適合小朋友參與的閱讀及故事活動。",
    venue: "香港公共圖書館",
    address: "中西區",
    district: "中西區",
    mtrStation: "中環",
    dateText: "本週",
    timeText: "10:00 - 12:00",
    priceText: "免費",
    category: "教育活動",
    tags: ["免費", "閱讀", "室內"],
    ageText: "3-8歲",
    pinX: 43,
    pinY: 53,
  },
];

const quickLocations = ["我附近", "香港島", "九龍", "新界", "離島"];

function getNavigationUrl(event: MapEvent) {
  const query = encodeURIComponent(
    `${event.venue} ${event.address} ${event.district}`,
  );

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function getPlaceholderText(category: string) {
  if (category.includes("工作坊")) return "工作坊";
  if (category.includes("教育")) return "閱讀";
  if (category.includes("打卡")) return "打卡";
  return "親子";
}

export default function NearbyEventsMapPage() {
  const [keyword, setKeyword] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("全部地區");
  const [selectedPrice, setSelectedPrice] = useState("全部收費");
  const [selectedCategory, setSelectedCategory] = useState("全部分類");
  const [showSenOnly, setShowSenOnly] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");

  const districts = useMemo(() => {
    return ["全部地區", ...Array.from(new Set(events.map((item) => item.district)))];
  }, []);

  const categories = useMemo(() => {
    return ["全部分類", ...Array.from(new Set(events.map((item) => item.category)))];
  }, []);

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
        (selectedPrice === "免費" && event.priceText.includes("免費"));

      const matchCategory =
        selectedCategory === "全部分類" || event.category === selectedCategory;

      const matchSen =
        !showSenOnly || event.tags.some((tag) => tag.includes("SEN"));

      return (
        matchKeyword &&
        matchDistrict &&
        matchPrice &&
        matchCategory &&
        matchSen
      );
    });
  }, [keyword, selectedDistrict, selectedPrice, selectedCategory, showSenOnly]);

  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedEventId) ??
    filteredEvents[0] ??
    events[0];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Link
              href="/events?date=today"
              className="rounded-3xl border border-pink-100 bg-pink-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-300 hover:shadow-md"
            >
              <p className="text-sm font-black text-pink-700">今日活動</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                今日帶小朋友去邊？
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                快速查看今日仍可參加的親子活動。
              </p>
            </Link>

            <Link
              href="/events?view=calendar"
              className="rounded-3xl border border-blue-100 bg-blue-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            >
              <p className="text-sm font-black text-blue-700">活動日曆</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                按日期計劃親子時間
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                用日曆方式查看今日、今個週末、本週及本月活動。
              </p>
            </Link>

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

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight">
                  附近活動地圖
                </h1>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Nearby Events Map
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                以地圖探索附近親子活動，快速查看今日、今個週末及指定地區的精彩節目。
              </p>
            </div>

            <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1 text-sm font-bold">
              <Link
                href="/events/map"
                className="rounded-xl bg-white px-4 py-2 text-teal-700 shadow-sm"
              >
                地圖
              </Link>
              <Link
                href="/events"
                className="rounded-xl px-4 py-2 text-slate-500 hover:text-teal-700"
              >
                列表
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1.5fr_0.9fr_0.9fr_0.9fr_auto]">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜尋活動、場地或地區"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
            />

            <select
              value={selectedDistrict}
              onChange={(event) => setSelectedDistrict(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
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
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
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
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
            >
              <option value="全部收費">全部收費</option>
              <option value="免費">免費</option>
            </select>

            <button
              type="button"
              onClick={() => setShowSenOnly((current) => !current)}
              className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                showSenOnly
                  ? "bg-pink-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-pink-300 hover:text-pink-700"
              }`}
            >
              SEN友善
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {["日期", "今日", "今個週末", "年齡", "MTR站"].map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:border-teal-300 hover:text-teal-700"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-b border-slate-200 bg-slate-200">
        <div className="relative h-[470px] w-full overflow-hidden bg-slate-200">
          <iframe
            title="OpenStreetMap Hong Kong"
            src="https://www.openstreetmap.org/export/embed.html?bbox=113.8200%2C22.1500%2C114.4300%2C22.5200&layer=mapnik&marker=22.3193%2C114.1694"
            className="h-full w-full border-0"
            loading="lazy"
          />

          <div className="pointer-events-none absolute inset-0">
            {filteredEvents.map((event, index) => (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedEventId(event.id)}
                className="pointer-events-auto absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-teal-500 to-blue-600 text-sm font-black text-white shadow-xl transition hover:scale-110"
                style={{
                  left: `${event.pinX}%`,
                  top: `${event.pinY}%`,
                }}
                aria-label={event.title}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {selectedEvent ? (
            <div className="absolute bottom-6 left-1/2 w-[92%] max-w-xl -translate-x-1/2 rounded-3xl bg-white p-4 shadow-2xl">
              <div className="flex gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-sm font-black text-purple-700">
                  {getPlaceholderText(selectedEvent.category)}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-1 text-lg font-black text-slate-950">
                    {selectedEvent.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    地點：{selectedEvent.venue}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    日期：{selectedEvent.dateText} · {selectedEvent.timeText}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedEvent.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <Link
                  href={`/events/${selectedEvent.id}`}
                  className="flex-1 rounded-2xl bg-teal-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-teal-700"
                >
                  查看詳情
                </Link>
                <a
                  href={getNavigationUrl(selectedEvent)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:border-teal-300 hover:text-teal-700"
                >
                  導航
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="mb-3 text-sm font-bold text-slate-500">快速定位</p>
          <div className="flex flex-wrap gap-3">
            {quickLocations.map((name) => (
              <button
                key={name}
                type="button"
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm hover:border-teal-300 hover:text-teal-700"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black">
            活動結果{" "}
            <span className="text-base font-bold text-slate-500">
              ({filteredEvents.length})
            </span>
          </h2>
          <p className="text-sm font-semibold text-slate-500">排序：最近距離</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredEvents.map((event) => (
            <article
              key={event.id}
              className={`rounded-3xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md ${
                selectedEvent?.id === event.id
                  ? "border-teal-300 ring-2 ring-teal-100"
                  : "border-slate-200"
              }`}
            >
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedEventId(event.id)}
                  className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-sm font-black text-purple-700"
                >
                  {getPlaceholderText(event.category)}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    {event.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h3 className="mt-3 line-clamp-2 text-base font-black leading-6 text-slate-950">
                    {event.title}
                  </h3>

                  <div className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
                    <p>地點：{event.venue}</p>
                    <p>
                      日期：{event.dateText} · {event.timeText}
                    </p>
                    <p>
                      地區：{event.district} · {event.mtrStation}
                    </p>
                    <p>
                      收費：{event.priceText} · {event.ageText}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
                {event.description}
              </p>

              <div className="mt-4 flex gap-3">
                <Link
                  href={`/events/${event.id}`}
                  className="flex-1 rounded-2xl bg-teal-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-teal-700"
                >
                  查看詳情
                </Link>
                <a
                  href={getNavigationUrl(event)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:border-teal-300 hover:text-teal-700"
                >
                  導航
                </a>
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
              請嘗試清除搜尋字眼，或改用其他地區及分類。
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}