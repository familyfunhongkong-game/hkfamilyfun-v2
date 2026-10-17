/** Hong Kong-local opening sessions. No implicit hours are fabricated. */
export type TimeSlot = { start: string; end: string };
export type DailyHours = { weekday: number; slots: TimeSlot[] };
export type DateOverride = { date: string; closed?: boolean; slots?: TimeSlot[] };
export type OpeningSchedule = {
  timezone: "Asia/Hong_Kong";
  weekly: DailyHours[];
  overrides?: DateOverride[];
};
const hhmm = (value: string) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};
export function validSlots(slots: TimeSlot[]): boolean {
  if (!Array.isArray(slots)) return false;
  const sorted = [...slots].sort((a, b) => (hhmm(a.start) ?? -1) - (hhmm(b.start) ?? -1));
  let lastEnd = -1;
  for (const slot of sorted) {
    const start = hhmm(slot.start);
    const end = hhmm(slot.end);
    if (start === null || end === null || end <= start || start < lastEnd) return false;
    lastEnd = end;
  }
  return true;
}
export function dayOpeningSlots(schedule: OpeningSchedule, date: string): TimeSlot[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const weekday = new Date(date + "T12:00:00Z").getUTCDay();
  const special = schedule.overrides?.find((item) => item.date === date);
  if (special) return special.closed ? [] : validSlots(special.slots ?? []) ? special.slots ?? [] : [];
  const regular = schedule.weekly.find((day) => day.weekday === weekday)?.slots ?? [];
  return validSlots(regular) ? regular : [];
}
export function openingSummary(schedule: OpeningSchedule, date: string): string {
  return dayOpeningSlots(schedule, date).map(({start,end}) => start + "–" + end).join("、");
}
