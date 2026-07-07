import type { Metadata } from "next";

import { SearchFilterPanel } from "@/components/home/SearchFilterPanel";
import { EventGrid } from "@/components/events/EventGrid";
import { getPublishedEvents } from "@/lib/supabase/events";
import { filterEvents, parseSearchParams } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "搜尋活動 | HK Family Fun",
  description: "按關鍵字、日期、地區、港鐵站、免費活動及 SEN 友善條件搜尋香港親子活動。",
};

interface EventsPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function EventsPage({
  searchParams,
}: EventsPageProps) {
  const filters = parseSearchParams(searchParams);

  const allEvents = await getPublishedEvents();
  const filteredEvents = filterEvents(allEvents, filters);

  return (
    <main className="pb-16 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold text-violet-600">HK Family Fun 活動搜尋</p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            搜尋親子活動
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600">
            按關鍵字、日期、地區、港鐵站、免費活動及 SEN 友善條件，
            快速找到適合你和小朋友的香港親子活動。
          </p>
        </div>

        <SearchFilterPanel />

        <section className="mt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                搜尋結果
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                找到 {filteredEvents.length} 個活動
              </p>
            </div>
          </div>

          {filteredEvents.length > 0 ? (
            <EventGrid events={filteredEvents} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
              <p className="text-lg font-bold text-slate-800">
                暫時找不到符合條件的活動
              </p>

              <p className="mt-2 text-sm text-slate-500">
                請嘗試清除部分篩選條件，或改用其他關鍵字搜尋。
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}