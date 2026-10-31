import { nextEventOccurrence, type RecurrenceLike } from "./recurrence";
import { hongKongToday } from "./visibility";

export type SmartExpiryEvent = {
  start_date?: string | null;
  end_date?: string | null;
  recurrence_type?: string | null;
  recurrence_weekdays?: number[] | null;
  recurrence_include_dates?: string[] | null;
  recurrence_exclude_dates?: string[] | null;
};

/**
 * Read-only discovery classification. Never mutate editorial status.
 * Missing/invalid dates are "needs_review", not silently expired.
 * For all-day events, the final calendar date remains available through
 * 23:59:59 Hong Kong time. Exact end-time handling is a follow-up gate.
 */
export function classifyEventAvailability(
  event: SmartExpiryEvent,
  today = hongKongToday(),
): "available" | "expired" | "needs_review" {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const start = String(event.start_date || "").slice(0, 10);
  const end = String(event.end_date || event.start_date || "").slice(0, 10);
  if (!datePattern.test(today) || !datePattern.test(start) || !datePattern.test(end) || end < start) {
    return "needs_review";
  }

  const occurrence: RecurrenceLike = {
    startDate: start,
    endDate: end,
    recurrenceType: event.recurrence_type,
    recurrenceWeekdays: event.recurrence_weekdays,
    recurrenceIncludeDates: event.recurrence_include_dates,
    recurrenceExcludeDates: event.recurrence_exclude_dates,
  };
  return nextEventOccurrence(occurrence, today) ? "available" : "expired";
}
