import { readFile } from "node:fs/promises";

const source = await readFile("app/events/[id]/page.tsx", "utf8");

const requiredSignals = [
  "formatAgeRange(event, locale)",
  "event.is_sen_friendly",
  "event.is_indoor",
  "selectedImage?.url",
  "setSelectedImageIndex(index)",
  "fixed inset-x-0 bottom-0 z-50",
  "getWhatsAppUrl",
  "getPhoneUrl",
  "getEmailUrl",
  "priceDisplay",
  "dateDisplay",
  "timeDisplay",
  "ageDisplay",
  "Google Map",
  "rel=\"noopener noreferrer\"",
  "structuredLocalizedText",
  "recurrenceDateNote",
  ".split(/\\n+/)",
  "bg-purple-500",
];

let failed = false;

for (const signal of requiredSignals) {
  if (!source.includes(signal)) {
    console.error(`[event-detail] missing required UX signal: ${signal}`);
    failed = true;
  }
}

if (source.includes("DB Cover")) {
  console.error("[event-detail] internal database wording must not appear in public UI");
  failed = true;
}

const dateFormatterStart = source.indexOf("function formatDateRange");
const timeFormatterStart = source.indexOf("function formatTimeRange");
const dateFormatter =
  dateFormatterStart >= 0 && timeFormatterStart > dateFormatterStart
    ? source.slice(dateFormatterStart, timeFormatterStart)
    : "";

if (!dateFormatter.includes("recurrenceDateNote(event.recurrence_note)")) {
  console.error("[event-detail] recurrence note must be stripped of time before entering the date field");
  failed = true;
}

if (!source.includes("structuredLocalizedText(event.highlights")) {
  console.error("[event-detail] highlights must normalize structured multilingual data before rendering");
  failed = true;
}

if ((source.match(/<SectionCard title=\{m\.gallery\}/g) || []).length > 0) {
  console.error("[event-detail] gallery must stay integrated into the hero, not duplicated below");
  failed = true;
}

if (failed) process.exit(1);

console.log(
  "[event-detail] OK — hero, age/accessibility, gallery, organizer contact, map and mobile actions remain present.",
);
