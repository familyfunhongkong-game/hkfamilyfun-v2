import { calendarDayOfWeek } from "@/lib/events/recurrence";

export type DailyOpeningHours = { start: string; end: string };
/** Keys are 0=Sunday … 6=Saturday. Missing days are CLOSED.
 * null means legacy recurring event using its existing universal times.
 */
export type WeeklyOpeningHours = Partial<Record<"0"|"1"|"2"|"3"|"4"|"5"|"6", DailyOpeningHours>>;

export const HK_WEEKDAYS = [
  { day: 0, label: "星期日" }, { day: 1, label: "星期一" },
  { day: 2, label: "星期二" }, { day: 3, label: "星期三" },
  { day: 4, label: "星期四" }, { day: 5, label: "星期五" },
  { day: 6, label: "星期六" },
] as const;
const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function parseWeeklyOpeningHours(input: unknown): WeeklyOpeningHours | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const values: WeeklyOpeningHours = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!/^[0-6]$/.test(key)) return null;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const day = value as Record<string, unknown>;
    if (Object.keys(day).some(field => !["start", "end"].includes(field))) return null;
    if (typeof day.start !== "string" || typeof day.end !== "string" ||
        !TIME_RE.test(day.start) || !TIME_RE.test(day.end) || day.end <= day.start) {
      return null; // The first version does not support sessions crossing midnight.
    }
    values[key as keyof WeeklyOpeningHours] = { start: day.start, end: day.end };
  }
  return values;
}

export function activeWeekdays(hours: WeeklyOpeningHours): number[] {
  return Object.keys(hours).map(Number).sort((a, b) => a - b);
}

export function updateWeekdayHours(
  previous: WeeklyOpeningHours, weekday: number, period: DailyOpeningHours | null,
): WeeklyOpeningHours {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return previous;
  const next = { ...previous };
  if (period === null) delete next[String(weekday) as keyof WeeklyOpeningHours];
  else next[String(weekday) as keyof WeeklyOpeningHours] = { ...period };
  return next;
}

export function hoursForDate(hours: WeeklyOpeningHours | null, date: string): DailyOpeningHours | null {
  if (!hours) return null;
  const day = calendarDayOfWeek(date);
  return day >= 0 ? hours[String(day) as keyof WeeklyOpeningHours] || null : null;
}

/** Preserve existing recurrence include/exclude date behavior. Specific
 * additional opening dates without a configured weekday use legacy hours.
 */
export function resolveTimeForDate(
  date: string,
  weeklyHours: WeeklyOpeningHours | null,
  fallback: string,
  explicitAdditionalDate = false,
): string | null {
  if (!weeklyHours) return fallback;
  const period = hoursForDate(weeklyHours, date);
  if (period) return `${period.start} - ${period.end}`;
  return explicitAdditionalDate ? fallback : null;
}
