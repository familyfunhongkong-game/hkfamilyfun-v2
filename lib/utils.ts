import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Event, EventFilters } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getWhatsAppUrl(message: string) {
  return `https://wa.me/85257018297?text=${encodeURIComponent(message)}`;
}

export function getEventShareMessage(event: Event) {
  return `【${event.title}】\n📅 ${event.date} ${event.time}\n📍 ${event.district} · ${event.mtrStation}\n👉 查看更多：hkfamilyfun.com/events/${event.id}`;
}

export function getTagColor(index: number) {
  const colors = [
    "bg-pink-100 text-pink-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-orange-100 text-orange-700",
    "bg-purple-100 text-purple-700",
    "bg-teal-100 text-teal-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
  ];
  return colors[index % colors.length];
}

function isToday(dateStr: string) {
  const today = new Date();
  const date = new Date(dateStr);
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isThisWeekend(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay();
  const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + (dayOfWeek === 0 ? -1 : daysUntilSaturday));
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);

  return date >= saturday && date <= sunday;
}

export function filterEvents(events: Event[], filters: EventFilters): Event[] {
  return events.filter((event) => {
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      const haystack = [
        event.title,
        event.shortDescription,
        event.organizer,
        event.district,
        event.mtrStation,
        ...event.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    if (filters.date === "today" && !isToday(event.date)) return false;
    if (filters.date === "weekend" && !isThisWeekend(event.date)) return false;
    if (filters.date && filters.date !== "today" && filters.date !== "weekend") {
      if (event.date !== filters.date) return false;
    }

    if (filters.district && event.district !== filters.district) return false;
    if (filters.mtrStation && event.mtrStation !== filters.mtrStation)
      return false;
    if (filters.ageGroup && event.ageRange !== filters.ageGroup) return false;
    if (filters.priceType && event.priceType !== filters.priceType) return false;
    if (filters.category && event.category !== filters.category) return false;
    if (filters.senFriendly && !event.senFriendly) return false;

    return true;
  });
}

export function parseSearchParams(
  params: Record<string, string | string[] | undefined>
): EventFilters {
  const get = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };

  return {
    keyword: get("keyword"),
    date: get("date"),
    district: get("district"),
    mtrStation: get("mtrStation"),
    ageGroup: get("ageGroup"),
    priceType: (get("priceType") as EventFilters["priceType"]) || undefined,
    category: get("category"),
    senFriendly: get("sen") === "true" || get("senFriendly") === "true",
  };
}

export function buildEventsUrl(filters: EventFilters) {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.date) params.set("date", filters.date);
  if (filters.district) params.set("district", filters.district);
  if (filters.mtrStation) params.set("mtrStation", filters.mtrStation);
  if (filters.ageGroup) params.set("ageGroup", filters.ageGroup);
  if (filters.priceType) params.set("priceType", filters.priceType);
  if (filters.category) params.set("category", filters.category);
  if (filters.senFriendly) params.set("sen", "true");
  const query = params.toString();
  return query ? `/events?${query}` : "/events";
}

export function formatEventDate(date: string, endDate?: string) {
  if (endDate && endDate !== date) {
    return `${date} 至 ${endDate}`;
  }
  return date;
}
