import { readFile } from "node:fs/promises";

const sharedCard = await readFile("components/events/PublicEventCard.tsx", "utf8");

const requiredSharedSignals = [
  "event.ageRange",
  "event.organizer",
  "event.mtrStation",
  "event.senFriendly",
  "event.officialLink",
  "CalendarDays",
  "Clock3",
  "MapPin",
  "TrainFront",
  "Baby",
  "Building2",
];

let failed = false;

for (const signal of requiredSharedSignals) {
  if (!sharedCard.includes(signal)) {
    console.error(`[event-card] shared card missing required signal: ${signal}`);
    failed = true;
  }
}

const sharedRoutes = [
  "app/page.tsx",
  "app/today/page.tsx",
  "app/calendar/page.tsx",
  "app/favorites/page.tsx",
];

for (const file of sharedRoutes) {
  const source = await readFile(file, "utf8");
  if (!source.includes("PublicEventCard")) {
    console.error(`[event-card] ${file} no longer uses PublicEventCard`);
    failed = true;
  }
}

const eventSearch = await readFile("app/events/page.tsx", "utf8");
for (const signal of [
  "event.age_min",
  "event.age_max",
  "event.organizer_name",
  "event.is_sen_friendly",
  "event.is_indoor",
  "recurrenceNote",
]) {
  if (!eventSearch.includes(signal)) {
    console.error(`[event-card] /events card missing: ${signal}`);
    failed = true;
  }
}

const mapPage = await readFile("app/events/map/page.tsx", "utf8");
for (const signal of ["priceText(event, locale)", "ageText(event, locale)", "organizer_name"]) {
  if (!mapPage.includes(signal)) {
    console.error(`[event-card] map list card missing: ${signal}`);
    failed = true;
  }
}

const mapClient = await readFile("app/events/map/EventMapClient.tsx", "utf8");
for (const signal of ["first.price", "first.age", "first.organizer"]) {
  if (!mapClient.includes(signal)) {
    console.error(`[event-card] map popup missing: ${signal}`);
    failed = true;
  }
}

const planner = await readFile("app/planner/page.tsx", "utf8");
for (const signal of [
  "cover_image_url",
  "eventPrice",
  "const age =",
  "event.organizer_name",
  "event.is_sen_friendly",
]) {
  if (!planner.includes(signal)) {
    console.error(`[event-card] planner card missing: ${signal}`);
    failed = true;
  }
}

if (failed) process.exit(1);

console.log(
  "[event-card] OK — public event cards retain image, date/time, location, price, age, organizer and accessibility context.",
);
