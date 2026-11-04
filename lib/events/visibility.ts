function validDateText(value: unknown) {
  const text = String(value ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

export function hongKongToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function isExplicitlyExpiredEvent(
  endDate: unknown,
  today = hongKongToday(),
) {
  const end = validDateText(endDate);
  const current = validDateText(today);
  return Boolean(end && current && end < current);
}

export function isCurrentOrOpenEndedEvent(
  endDate: unknown,
  today = hongKongToday(),
) {
  return !isExplicitlyExpiredEvent(endDate, today);
}

export function isOpenEndedPastStart(
  startDate: unknown,
  endDate: unknown,
  today = hongKongToday(),
) {
  const start = validDateText(startDate);
  const end = validDateText(endDate);
  const current = validDateText(today);

  return Boolean(!end && start && current && start < current);
}

/**
 * Public catalogue availability is based on the NEXT REAL OCCURRENCE rather
 * than editorial status alone. No database rows or approval states are mutated
 * as time passes. Cancelled dates cannot make an activity "Active".
 */
import { nextEventOccurrence } from "./recurrence";

export type PublicEventDates = {
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  recurrence_type?: string | null;
  recurrence_weekdays?: number[] | null;
  recurrence_include_dates?: string[] | null;
  recurrence_exclude_dates?: string[] | null;
};

export function nextPublicEventDate(event: PublicEventDates, today = hongKongToday()): string | null {
  const status = String(event.status || "published").toLowerCase();
  if (status !== "published") return null;
  return nextEventOccurrence({
    startDate: event.start_date,
    endDate: event.end_date,
    recurrenceType: event.recurrence_type,
    recurrenceWeekdays: event.recurrence_weekdays,
    recurrenceIncludeDates: event.recurrence_include_dates,
    recurrenceExcludeDates: event.recurrence_exclude_dates,
  }, today);
}

export function isActivePublicEvent(event: PublicEventDates, today = hongKongToday()): boolean {
  return nextPublicEventDate(event, today) !== null;
}
