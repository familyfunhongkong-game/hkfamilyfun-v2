import { readFile } from "node:fs/promises";

const sources = {
  sharedCard: await readFile("components/events/PublicEventCard.tsx", "utf8"),
  publicMapper: await readFile("lib/supabase/events.ts", "utf8"),
  eventSearch: await readFile("app/events/page.tsx", "utf8"),
  eventDetail: await readFile("app/events/[id]/page.tsx", "utf8"),
};

let failed = false;

function requireSignals(label, source, signals) {
  for (const signal of signals) {
    if (!source.includes(signal)) {
      console.error(`[event-calendar] ${label} missing: ${signal}`);
      failed = true;
    }
  }
}

requireSignals("shared card calendar-date parser", sources.sharedCard, [
  "function parseCalendarDate",
  'value.match(/^(\\d{4})-(\\d{2})-(\\d{2})/)',
  "new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))",
]);

requireSignals("public mapper calendar-date parser", sources.publicMapper, [
  "function parseCalendarDate",
  'value.match(/^(\\d{4})-(\\d{2})-(\\d{2})/)',
  "timeZone: \"Asia/Hong_Kong\"",
  "startTime.slice(0, 5)",
]);

for (const [label, source] of [
  ["event search", sources.eventSearch],
  ["event detail", sources.eventDetail],
]) {
  requireSignals(label, source, [
    "Database event dates are calendar dates, not moments in time.",
    'value.match(/^(\\d{4})-(\\d{2})-(\\d{2})/)',
    "Number(dateOnly[1])",
    "Number(dateOnly[2]) - 1",
    "Number(dateOnly[3])",
    "text.slice(0, 5)",
  ]);
}

const forbidden = [
  "new Date(event.date)",
  "new Date(event.start_date)",
  "new Date(event.end_date)",
];

for (const [label, source] of Object.entries(sources)) {
  for (const signal of forbidden) {
    if (source.includes(signal)) {
      console.error(
        `[event-calendar] ${label} must not treat YYYY-MM-DD calendar data as a timezone-converted instant: ${signal}`,
      );
      failed = true;
    }
  }
}

if (failed) process.exit(1);

console.log(
  "[event-calendar] OK — public event dates remain calendar dates and event clock times remain local HH:MM values without UTC/day drift.",
);
