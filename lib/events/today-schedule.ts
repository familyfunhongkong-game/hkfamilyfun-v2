import type { Event } from "@/lib/types";

export const TODAY_PERIODS = ["morning", "afternoon", "evening", "unscheduled"] as const;
export type TodayPeriod = (typeof TODAY_PERIODS)[number];

/** All times on /today are Hong Kong wall-clock times from event.start_time.
 * A start time that is absent or invalid must NEVER get a fabricated hour.
 */
export function startMinute(event: Pick<Event, "time">): number | null {
  const value = String(event.time || "").trim();
  const match = value.match(/^([01]?\d|2[0-3]):([0-5]\d)(?=\D|$)/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function todayPeriod(event: Pick<Event, "time">): TodayPeriod {
  const minute = startMinute(event);
  if (minute === null) return "unscheduled";
  if (minute < 12 * 60) return "morning";
  if (minute < 18 * 60) return "afternoon";
  return "evening";
}

export function displayTodayTime(event: Pick<Event, "time">): {
  start: string | null; end: string | null;
} {
  const minute = startMinute(event);
  if (minute === null) return { start: null, end: null };
  const start = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  const time = String(event.time || "");
  const endMatch = time.slice(time.search(/\b\d{1,2}:\d{2}\b/) + start.length).match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  return {
    start,
    end: endMatch ? `${endMatch[1].padStart(2, "0")}:${endMatch[2]}` : null,
  };
}

export function groupTodaySchedule<T extends Event>(events: T[]): Record<TodayPeriod, T[]> {
  const ordered = [...events].sort((a, b) => {
    const minuteA = startMinute(a) ?? Number.POSITIVE_INFINITY;
    const minuteB = startMinute(b) ?? Number.POSITIVE_INFINITY;
    if (minuteA !== minuteB) return minuteA - minuteB;
    // At the same start time, show newly published listings first. Published
    // date is authoritative; updatedAt is only a fallback for legacy records.
    const publishedA = Date.parse(a.publishedAt || a.updatedAt || "") || 0;
    const publishedB = Date.parse(b.publishedAt || b.updatedAt || "") || 0;
    if (publishedA !== publishedB) return publishedB - publishedA;
    return a.title.localeCompare(b.title, "zh-HK");
  });
  const groups: Record<TodayPeriod, T[]> = { morning: [], afternoon: [], evening: [], unscheduled: [] };
  for (const event of ordered) groups[todayPeriod(event)].push(event);
  return groups;
}
