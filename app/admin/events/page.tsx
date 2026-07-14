"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type HomeEvent = {
  id: string;
  title_tc: string | null;
  short_description_tc: string | null;
  venue_name: string | null;
  district: string | null;
  start_date: string | null;
  cover_image_url: string | null;
  category: string | null;
  status: string | null;
};

const FALLBACK_COVER_IMAGE =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80";

export default function HomePage() {
  const [events, setEvents] = useState<HomeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadPublishedEvents() {
    setIsLoading(true);

    try {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("events")
        .select(
          [
            "id",
            "title_tc",
            "short_description_tc",
            "venue_name",
            "district",
            "start_date",
            "cover_image_url",
            "category",
            "status",
          ].join(", ")
        )
        .eq("status", "published")
        .order("start_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(6);

      setEvents((data || []) as unknown as HomeEvent[]);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPublishedEvents();
  }, []);

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
            <Link href="/" className="text-primary-600">
              首頁
            </Link>
            <Link href="/events" className="hover:text-primary-600">
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

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700">
                <Sparkles className="h-4 w-4" />
                香港親子活動搜尋平台
              </p>

              <h1 className="mt-5 text-5xl font-bold leading-tight text-slate-950">
                Plan Less.
                <br />
                Play More.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                HK Family Fun 幫家長更快找到香港親子活動。公開頁面只顯示已通過 HK Family Fun 審批及發布的活動，避免家長看到未確認資料。
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/events"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-6 py-4 text-sm font-semibold text-white hover:bg-primary-600"
                >
                  <Search className="h-4 w-4" />
                  搜尋活動
                </Link>

                <Link
                  href="/merchant-join"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-6 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  商戶免費加入
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-green-600" />
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    活動先審批，後公開
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    商戶可以建立草稿及提交活動；HK Family Fun 管理員審批後，活動才會在公開頁面出現。
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 text-sm">
                <div className="rounded-2xl bg-white p-4">
                  1. 商戶匯入 URL / 圖片 / PDF
                </div>
                <div className="rounded-2xl bg-white p-4">
                  2. 商戶補充資料並提交審批
                </div>
                <div className="rounded-2xl bg-white p-4">
                  3. Admin approve 後公開上架
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                最新公開活動
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                只顯示已發布活動。
              </p>
            </div>

            <Link
              href="/events"
              className="text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              查看全部 →
            </Link>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
              正在載入活動...
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="font-semibold text-slate-900">
                暫時未有公開活動
              </p>
              <p className="mt-1 text-sm text-slate-500">
                當活動通過審批後會顯示在這裡。
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative h-40 bg-slate-100">
                    <img
                      src={event.cover_image_url || FALLBACK_COVER_IMAGE}
                      alt={event.title_tc || "Event cover"}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary-600">
                      {event.category || "親子活動"}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="line-clamp-2 font-bold text-slate-950">
                      {event.title_tc || "未命名活動"}
                    </h3>

                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                      {event.short_description_tc || "未有活動簡介。"}
                    </p>

                    <div className="mt-4 space-y-2 text-xs text-slate-600">
                      <div className="flex gap-2">
                        <CalendarDays className="h-4 w-4 text-primary-500" />
                        <span>{event.start_date || "日期待確認"}</span>
                      </div>
                      <div className="flex gap-2">
                        <MapPin className="h-4 w-4 text-primary-500" />
                        <span>
                          {event.venue_name || "場地待確認"} ·{" "}
                          {event.district || "地區待確認"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}