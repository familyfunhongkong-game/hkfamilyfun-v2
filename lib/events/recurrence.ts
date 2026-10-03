export type RecurrenceLike = {
  startDate?: string | null;
  endDate?: string | null;
  recurrenceType?: string | null;
  recurrenceWeekdays?: number[] | null;
  recurrenceIncludeDates?: string[] | null;
  recurrenceExcludeDates?: string[] | null;
};

export function calendarDayOfWeek(dateText: string) {
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return -1;

  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  ).getUTCDay();
}

export function addCalendarDays(dateText: string, days: number) {
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateText;

  const date = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]) + days,
    ),
  );

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function eventOccursOn(event: RecurrenceLike, targetDate: string) {
  const start = String(event.startDate || "").trim();
  const end = String(event.endDate || event.startDate || "").trim();

  if (!start || !end || targetDate < start || targetDate > end) return false;

  if (String(event.recurrenceType || "none").toLowerCase() !== "weekly") {
    return true;
  }

  const includes = Array.isArray(event.recurrenceIncludeDates)
    ? event.recurrenceIncludeDates.map(String)
    : [];
  const excludes = Array.isArray(event.recurrenceExcludeDates)
    ? event.recurrenceExcludeDates.map(String)
    : [];

  if (includes.includes(targetDate)) return true;
  if (excludes.includes(targetDate)) return false;

  const weekdays = Array.isArray(event.recurrenceWeekdays)
    ? event.recurrenceWeekdays.map(Number)
    : [];

  return weekdays.includes(calendarDayOfWeek(targetDate));
}

export function eventOccursInRange(
  event: RecurrenceLike,
  rangeStart: string,
  rangeEnd: string,
) {
  const start = String(event.startDate || "").trim();
  const end = String(event.endDate || event.startDate || "").trim();

  if (!start || !end || start > rangeEnd || end < rangeStart) return false;

  if (String(event.recurrenceType || "none").toLowerCase() !== "weekly") {
    return true;
  }

  let current = start > rangeStart ? start : rangeStart;
  const last = end < rangeEnd ? end : rangeEnd;

  for (let guard = 0; current <= last && guard < 370; guard += 1) {
    if (eventOccursOn(event, current)) return true;
    current = addCalendarDays(current, 1);
  }

  return false;
}
