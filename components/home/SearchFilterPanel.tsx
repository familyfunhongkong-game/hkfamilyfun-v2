"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import {
  AGE_GROUPS,
  CATEGORIES,
  DISTRICTS,
  MTR_STATIONS,
} from "@/lib/constants";
import type { EventFilters } from "@/lib/types";
import { buildEventsUrl } from "@/lib/utils";

interface SearchFilterPanelProps {
  initialFilters?: EventFilters;
  compact?: boolean;
}

const emptyFilters: EventFilters = {
  keyword: "",
  date: "",
  district: "",
  mtrStation: "",
  ageGroup: "",
  priceType: "",
  category: "",
  senFriendly: false,
};

export function SearchFilterPanel({
  initialFilters,
  compact = false,
}: SearchFilterPanelProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<EventFilters>({
    ...emptyFilters,
    ...initialFilters,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    router.push(buildEventsUrl(filters));
  };

  const handleReset = () => {
    setFilters(emptyFilters);
    router.push("/events");
  };

  const update = <K extends keyof EventFilters>(key: K, value: EventFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <section
      className={
        compact
          ? ""
          : "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      }
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-100 bg-white p-5 card-shadow sm:p-6"
      >
        {!compact && (
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900">搜尋活動</h2>
            <p className="text-sm text-gray-500">按關鍵字、日期、地區等條件篩選</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block sm:col-span-2 lg:col-span-4">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              關鍵字
            </span>
            <input
              type="text"
              value={filters.keyword || ""}
              onChange={(e) => update("keyword", e.target.value)}
              placeholder="搜尋活動名稱、主辦機構..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">日期</span>
            <select
              value={filters.date || ""}
              onChange={(e) => update("date", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              <option value="">全部日期</option>
              <option value="today">今日</option>
              <option value="weekend">今個週末</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">地區</span>
            <select
              value={filters.district || ""}
              onChange={(e) => update("district", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              <option value="">全部地區</option>
              {DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              港鐵站
            </span>
            <select
              value={filters.mtrStation || ""}
              onChange={(e) => update("mtrStation", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              <option value="">全部港鐵站</option>
              {MTR_STATIONS.map((station) => (
                <option key={station} value={station}>
                  {station}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              適合年齡
            </span>
            <select
              value={filters.ageGroup || ""}
              onChange={(e) => update("ageGroup", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              <option value="">全部年齡</option>
              {AGE_GROUPS.map((age) => (
                <option key={age} value={age}>
                  {age}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              收費類型
            </span>
            <select
              value={filters.priceType || ""}
              onChange={(e) =>
                update("priceType", e.target.value as EventFilters["priceType"])
              }
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              <option value="">全部</option>
              <option value="free">免費</option>
              <option value="paid">收費</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">類別</span>
            <select
              value={filters.category || ""}
              onChange={(e) => update("category", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              <option value="">全部類別</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-2.5 sm:col-span-2 lg:col-span-1">
            <input
              type="checkbox"
              checked={filters.senFriendly || false}
              onChange={(e) => update("senFriendly", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">SEN 友善活動</span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            <Search size={16} />
            搜尋活動
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            重設
          </button>
        </div>
      </form>
    </section>
  );
}
