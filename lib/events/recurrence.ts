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
  const end = String(event.endDate || event.startDate || "").trim();

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

  let current = start > rangeStart ? start : rangeStart;
  const last = end < rangeEnd ? end : rangeEnd;

  for (let guard = 0; current <= last && guard < 370; guard += 1) {
    if (eventOccursOn(event, current)) return true;
    current = addCalendarDays(current, 1);
  }

  return false;
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
  const end = String(event.endDate || event.startDate || "").slice(0, 10);
  if (!iso.test(today) || !iso.test(start) || !iso.test(end) || start > end) return null;
  let date = start > today ? start : today;
  if (date > end) return null;
  const excluded = new Set(
    Array.isArray(event.recurrenceExcludeDates) ? event.recurrenceExcludeDates.map(String) : [],
  );
  if (String(event.recurrenceType || "none").toLowerCase() !== "weekly") {
    // For a consecutive multi-day event, only closure dates are skipped.
    while (date <= end && excluded.has(date)) date = addCalendarDays(date, 1);
    return date <= end ? date : null;
  }

  const weekdays = new Set(
    Array.isArray(event.recurrenceWeekdays)
      ? event.recurrenceWeekdays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : [],
  );
  const special = Array.isArray(event.recurrenceIncludeDates)
    ? event.recurrenceIncludeDates.map(String)
        .filter((day) => iso.test(day) && day >= date && day <= end && !excluded.has(day))
        .sort()[0]
    : undefined;

  let regular: string | null = null;
  if (weekdays.size) {
    // With at least one normal opening weekday, N excluded dates can skip
    // at most N weekly occurrences. Search no more than 7*(N+1) days.
    const limit = Math.min(5000, 7 * (excluded.size + 1) + 7);
    for (let checked = 0; date <= end && checked < limit; checked++) {
      if (!excluded.has(date) && weekdays.has(calendarDayOfWeek(date))) {
        regular = date;
        break;
      }
      date = addCalendarDays(date, 1);
    }
  }
  if (special && (!regular || special < regular)) return special;
  return regular;
}
