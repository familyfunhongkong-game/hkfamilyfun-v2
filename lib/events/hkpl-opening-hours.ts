/**
 * Official venue-hours adapter. Do not invent a universal activity start time:
 * HKPL displays often say "Library Opening Hours", which vary by weekday.
 * Source (verified 2026-11-02):
 * https://www.hkpl.gov.hk/tc/locations/islands/library/cheung-chau.html
 */
export type VenueHours = { start: string; end: string };
export function isCheungChauLibraryDisplay(event: {venue?: string | null; recurrenceNote?: string | null}): boolean {
  return /長洲公共圖書館|Cheung Chau Public Library/i.test(event.venue || "") &&
    /圖書館開放時間|Library Opening Hours/i.test(event.recurrenceNote || "");
}
export function cheungChauLibraryHours(day: string): VenueHours | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(day + "T12:00:00+08:00");
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== day) return null;
  // Closure dates are based on the event currently being reviewed in Dec 2026,
  // not a promise about all future December dates/years.
  if (day === "2026-12-25" || day === "2026-12-26") return null;
  if (day === "2026-12-24" || day === "2026-12-31") return { start: "12:00", end: "17:00" };
  const weekday = date.getUTCDay();
  if (weekday === 0) return { start: "09:00", end: "17:00" };
  if (weekday === 4) return { start: "12:00", end: "20:00" };
  return { start: "09:00", end: "20:00" };
}
