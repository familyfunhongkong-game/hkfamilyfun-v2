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
  const end = String(event.endDate || (String(event.recurrenceType || "").toLowerCase() === "weekly" ? "9999-12-31" : event.startDate) || "").trim();

  if (!start || !end || targetDate < start || targetDate > end) return false;

  // Cancelled or closed dates take precedence for ALL event types,
  // including multi-day non-weekly listings.
  const cancelled = Array.isArray(event.recurrenceExcludeDates)
    ? event.recurrenceExcludeDates.map(String) : [];
  if (cancelled.includes(targetDate)) return false;

  if (String(event.recurrenceType || "none").toLowerCase() !== "weekly") {
    return true;
  }

  const includes = Array.isArray(event.recurrenceIncludeDates)
    ? event.recurrenceIncludeDates.map(String)
    : [];
  const excludes = Array.isArray(event.recurrenceExcludeDates)
    ? event.recurrenceExcludeDates.map(String)
    : [];

  // Closure/cancellation is always authoritative when both exception lists
  // contain the same date. Never advertise a cancelled occurrence.
  if (excludes.includes(targetDate)) return false;
  if (includes.includes(targetDate)) return true;

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
  const end = String(event.endDate || (String(event.recurrenceType || "").toLowerCase() === "weekly" ? "9999-12-31" : event.startDate) || "").trim();

  if (!start || !end || start > rangeEnd || end < rangeStart) return false;

  if (String(event.recurrenceType || "none").toLowerCase() !== "weekly") {
    // Exclusions must also apply to non-weekly multi-day events.
    // Look for the first non-cancelled day in the intersected date range.
    const cancelled = new Set(
      Array.isArray(event.recurrenceExcludeDates)
        ? event.recurrenceExcludeDates.map(String) : [],
    );
    let date = start > rangeStart ? start : rangeStart;
    const lastDate = end < rangeEnd ? end : rangeEnd;
    // An interval with N excluded days must contain an available day
    // within the next N+1 dates, unless the interval ends first.
    for (let checked = 0; date <= lastDate && checked <= cancelled.size; checked++) {
      if (!cancelled.has(date)) return true;
      date = addCalendarDays(date, 1);
    }
    return false;
  }

  const next = nextEventOccurrence(event, rangeStart);
  return Boolean(next && next <= rangeEnd);
}


/**
 * Find the next actual bookable/displayable calendar date for a saved listing.
 * Excluded days beat explicit inclusions; a weekly schedule may additionally
 * include exceptional days outside its regular weekday selections.
 * This is pure ISO calendar logic: the caller supplies "today" in Hong Kong.
 */
export function nextEventOccurrence(event: RecurrenceLike, today: string): string | null {
  const iso = /^\\d{4}-\\d{2}-\\d{2}$/;
  const start = String(event.startDate || "").slice(0, 10);
  const weekly = String(event.recurrenceType || "none").toLowerCase() === "weekly";
  // A weekly listing with no end date is ongoing; a one-off listing is not.
  const end = String(event.endDate || (weekly ? "9999-12-31" : event.startDate) || "").slice(0, 10);
  if (!iso.test(today) || !iso.test(start) || !iso.test(end) || start > end) return null;
  const first = start > today ? start : today;
  if (first > end) return null;
  const excluded = new Set(
    Array.isArray(event.recurrenceExcludeDates) ? event.recurrenceExcludeDates.map(String) : [],
  );
  if (!weekly) {
    let day = first;
    while (day <= end && excluded.has(day)) day = addCalendarDays(day, 1);
    return day <= end ? day : null;
  }
  const weekdays = new Set(
    Array.isArray(event.recurrenceWeekdays)
      ? event.recurrenceWeekdays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : [],
  );
  const special = Array.isArray(event.recurrenceIncludeDates)
    ? event.recurrenceIncludeDates.map(String)
        .filter((day) => iso.test(day) && day >= first && day <= end && !excluded.has(day))
        .sort()[0]
    : undefined;

  let regular: string | null = null;
  if (weekdays.size) {
    let candidate = first;
    // Every skipped regular occurrence must occur on an explicitly excluded
    // date. There cannot be more skipped occurrences than excluded dates.
    for (let tries = 0; tries <= excluded.size; tries++) {
      const weekday = calendarDayOfWeek(candidate);
      const offset = Math.min(...[...weekdays].map((day) => (day - weekday + 7) % 7));
      candidate = addCalendarDays(candidate, offset);
      if (candidate > end) break;
      if (!excluded.has(candidate)) {
        regular = candidate;
        break;
      }
      candidate = addCalendarDays(candidate, 1);
    }
  }
  if (special && (!regular || special < regular)) return special;
  return regular;
}
