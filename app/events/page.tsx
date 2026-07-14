"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Search,
  Ticket,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type PublicEvent = {
  id: string;
  title_tc: string | null;
  short_description_tc: string | null;
  organizer_name: string | null;
  venue_name: string | null;
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
};

const FALLBACK_COVER_IMAGE =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80";

function formatDateRange(event: PublicEvent) {
  if (!event.start_date && !event.end_date) return "日期待確認";

  const start = event.start_date || "";
  const end = event.end_date || "";

  if (start && end && start !== end) return `${start} 至 ${end}`;
  return start || end || "日期待確認";
}

function formatTimeRange(event: PublicEvent) {
  if (!event.start_time && !event.end_time) return "時間待確認";

  const start = event.start_time ? event.start_time.slice(0, 5) : "";
  const end = event.end_time ? event.end_time.slice(0, 5) : "";

  if (start && end) return `${start} - ${end}`;
  return start || end || "時間待確認";
}

function formatPrice(event: PublicEvent) {
  if (event.price_type === "free") return "免費";
  if (!event.price_type || event.price_type === "unknown") return "收費待確認";

  const min = Number(event.price_min || 0);
  const max = Number(event.price_max || 0);

  if (min === 0 && max === 0) return "收費待確認";
  if (min === max) return `HK$${min}`;
  return `HK$${min} - HK$${max}`;
}

export default function PublicEventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchText, setSearchText] = useState("");

  async function loadPublishedEvents() {
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
            "organizer_name",
            "venue_name",
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
          ].join(", ")
        )
        .eq("status", "published")
        .order("start_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setEvents((data || []) as unknown as PublicEvent[]);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "載入公開活動時發生未知錯誤。"
      );
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPublishedEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) return events;

    return events.filter((event) => {
      const text = [
        event.title_tc,
        event.short_description_tc,
        event.organizer_name,
        event.venue_name,
        event.district,
        event.mtr_station,
        event.category,
        ...(event.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(keyword);
    });
  }, [events, searchText]);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-lg font-bold text-white">
              親
            </div>
            <div>
              <div className="font-bold text-slate-950">HK Family Fun</div>
              <div className="text-xs text-slate-500">
                香港親子活動搜尋平台
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-5 text-sm font-semibold text-slate-700">
            <Link href="/" className="hover:text-primary-600">
              首頁
            </Link>
            <Link href="/events" className="text-primary-600">
              搜尋活動
            </Link>
            <Link href="/merchant-join" className="hover:text-primary-600">
              商戶加入
            </Link>
            <Link
              href="/merchant/register"
              className="rounded-full bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
            >
              商戶免費登記
            </Link>
          </nav>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-primary-600">
            HK Family Fun Public Events
          </p>

          <h1 className="mt-2 text-4xl font-bold text-slate-950">
            搜尋香港親子活動
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            以下只顯示已經由 HK Family Fun 審批及發布的活動。草稿、審批中、已退回活動不會公開顯示。
          </p>

          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="搜尋活動名稱、地區、港鐵站、分類..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
            正在載入活動...
          </div>
        ) : errorMessage ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-lg font-bold text-slate-950">
              暫時未有符合條件的公開活動
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              已提交但未審批的活動不會顯示在公開頁面。
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="relative h-48 bg-slate-100">
                  <img
                    src={event.cover_image_url || FALLBACK_COVER_IMAGE}
                    alt={event.title_tc || "Event cover"}
                    className="h-full w-full object-cover"
                  />

                  <div className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary-600 shadow-sm">
                    {event.category || "親子活動"}
                  </div>
                </div>

                <div className="p-5">
                  <h2 className="line-clamp-2 text-lg font-bold text-slate-950 group-hover:text-primary-600">
                    {event.title_tc || "未命名活動"}
                  </h2>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                    {event.short_description_tc || "未有活動簡介。"}
                  </p>

                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <div className="flex gap-2">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                      <span>
                        {formatDateRange(event)} · {formatTimeRange(event)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                      <span>
                        {event.venue_name || "場地待確認"} ·{" "}
                        {event.district || "地區待確認"}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                      <span>{formatPrice(event)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(event.tags || ["親子活動"]).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}