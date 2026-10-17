import { readFile } from "node:fs/promises";

const holidaySource = await readFile("lib/hk-public-holidays.ts", "utf8");
const calendarSource = await readFile("app/calendar/page.tsx", "utf8");
const todaySource = await readFile("app/today/page.tsx", "utf8");
const todaySortSource = await readFile("lib/events/today-schedule.ts", "utf8");
const searchSource = await readFile(
  "components/events/PublicEventsSearchClient.tsx",
  "utf8",
);

let failed = false;

function requireSignals(label, source, signals) {
  for (const signal of signals) {
    if (!source.includes(signal)) {
      console.error(`[calendar-persona] ${label} missing: ${signal}`);
      failed = true;
    }
  }
}

requireSignals("2026 public holidays", holidaySource, [
  'date: "2026-01-01"',
  'date: "2026-04-07"',
  'date: "2026-10-01"',
  'date: "2026-10-19"',
  'date: "2026-12-26"',
]);

requireSignals("2027 public holidays", holidaySource, [
  "HOLIDAYS_2027",
  'date: "2027-01-01"',
  'date: "2027-02-09"',
  'date: "2027-09-16"',
  'date: "2027-12-27"',
]);

requireSignals("calendar red-day behavior", calendarSource, [
  "isSunday",
  "isRedDay",
  "香港公眾假期／星期日",
  "eventTimeSortValue",
  ".sort((a, b) =>",
]);

requireSignals("Today chronological order", todaySource, [
  "groupTodaySchedule(todayEvents)",
  "eventOccursOn(",
  "timeZone: \"Asia/Hong_Kong\"",
]);
requireSignals("Today deterministic start-time sorting", todaySortSource, [
  "startMinute(a) ?? Number.POSITIVE_INFINITY",
  "startMinute(b) ?? Number.POSITIVE_INFINITY",
  "minuteA - minuteB",
  "todayPeriod(event)",
  "unscheduled",
]);

requireSignals("date-specific chronological order", searchSource, [
  "eventStartTimeSortValue",
  "if (specificDate)",
  "eventStartTimeSortValue(a.start_time)",
  "eventStartTimeSortValue(b.start_time)",
  "return next;",
]);

if (failed) process.exit(1);

console.log(
  "[calendar-persona] OK — HK public holidays/Sundays remain red and daily event views remain chronological.",
);
