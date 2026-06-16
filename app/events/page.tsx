import type { Metadata } from "next";
import { SearchFilterPanel } from "@/components/home/SearchFilterPanel";
import { EventGrid } from "@/components/events/EventGrid";
import { mockEvents } from "@/lib/mock-events";
import { filterEvents, parseSearchParams } from "@/lib/utils";

export const metadata: Metadata = {
  title: "搜尋活動",
  description: "按關鍵字、日期、地區、港鐵站等條件搜尋香港親子活動。",
};

interface EventsPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default function EventsPage({ searchParams }: EventsPageProps) {
  const filters = parseSearchParams(searchParams);
  const filteredEvents = filterEvents(mockEvents, filters);

  return (
    <div className="pb-16 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">搜尋活動</h1>
          <p className="mt-2 text-gray-600">
            找到 {filteredEvents.length} 個活動
          </p>
        </div>
      </div>

      <div className="mb-8">
        <SearchFilterPanel initialFilters={filters} />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <EventGrid events={filteredEvents} />
      </div>
    </div>
  );
}
