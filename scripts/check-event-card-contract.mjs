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
  "tagTone(tag)",
  "displayTag(tag)",
  "toggleFavorite",
  "addToCalendar",
  "CalendarPlus",
  "hkff_favorite_event_ids",
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

const eventSearch = await readFile("components/events/PublicEventsSearchClient.tsx", "utf8");
for (const signal of [
  "event.age_min",
  "event.age_max",
  "event.organizer_name",
  "event.is_sen_friendly",
  "event.is_indoor",
  "recurrenceNote",
  "tagTone(tag)",
  "displayTag(tag)",
  "calendarTemplateUrl(event, locale)",
  "onToggleFavorite",
]) {
  if (!eventSearch.includes(signal)) {
    console.error(`[event-card] /events card missing: ${signal}`);
    failed = true;
  }
}


for (const [name, requirement] of [
  ["card must not stretch to the tallest row", 'group flex min-w-0 flex-col self-start'],
  ["cover artwork needs responsive wide aspect ratio", 'aspect-[16/10]'],
  ["cover aspect ratio must adapt to larger screens", 'sm:aspect-[16/9]'],
  ["information hierarchy must put primary facts together", 'grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-xl'],
  ["title should no longer require tall fixed minimum", 'line-clamp-2 text-lg font-black'],
  ["primary details and booking actions must remain", 'grid grid-cols-2 gap-2'],
  ["supportive actions should wrap naturally", 'flex flex-wrap gap-1.5'],
  ["list must not force card row height", 'grid items-start gap-4 sm:grid-cols-2'],
]) {
  if (!eventSearch.includes(requirement)) {
    console.error(`[event-card] responsive redesign failed: ${name}`);
    failed = true;
  }
}
for (const signal of [
  "getGalleryImages(event)", "goToPreviousImage", "goToNextImage",
  "onToggleFavorite(event.id)", "shareEvent(eventObject)",
  "calendarTemplateUrl(event, locale)", "getGoogleMapUrl(event)",
  "getOfficialWebsiteUrl(event)", "getRegistrationUrl(event)",
  "recurrenceNote", "formatEventAge(", "tagTone(tag)",
]) {
  if (!eventSearch.includes(signal)) {
    console.error(`[event-card] redesign must retain function: ${signal}`);
    failed = true;
  }
}
if (eventSearch.includes('group flex h-full flex-col overflow-hidden rounded-[1.7rem]')) {
  console.error("[event-card] old tall stretched search card returned");
  failed = true;
}

const mapPage = await readFile("app/events/map/page.tsx", "utf8");
for (const signal of [
  "priceText(event, locale)",
  "ageText(event, locale)",
  "organizer_name",
  "toggleFavorite(event.id)",
  "addEventToCalendar(event.id)",
  "tagTone(tag)",
  "displayTag(tag)",
]) {
  if (!mapPage.includes(signal)) {
    console.error(`[event-card] map list card missing: ${signal}`);
    failed = true;
  }
}

const mapClient = await readFile("app/events/map/EventMapClient.tsx", "utf8");
for (const signal of [
  "first.price",
  "first.age",
  "first.organizer",
  "onToggleFavorite(first.id)",
  "onAddCalendar(first.id)",
  "onToggleFavorite(event.id)",
  "onAddCalendar(event.id)",
]) {
  if (!mapClient.includes(signal)) {
    console.error(`[event-card] map popup missing: ${signal}`);
    failed = true;
  }
}

const publicEvents = await readFile("lib/supabase/events.ts", "utf8");
if (
  publicEvents.includes('return `HK${') ||
  publicEvents.includes('From HK${')
) {
  console.error("[event-card] public event price formatting must use HK$");
  failed = true;
}

const mapPriceSource = await readFile("app/events/map/page.tsx", "utf8");
if (
  mapPriceSource.includes('return `HK${') ||
  mapPriceSource.includes('From HK${')
) {
  console.error("[event-card] map event price formatting must use HK$");
  failed = true;
}

const planner = await readFile("app/planner/page.tsx", "utf8");
for (const signal of [
  "cover_image_url",
  "eventPrice",
  "const age =",
  "event.organizer_name",
  "event.is_sen_friendly",
  "toggleFavorite(event.id)",
  "googleCalendarUrl(",
]) {
  if (!planner.includes(signal)) {
    console.error(`[event-card] planner card missing: ${signal}`);
    failed = true;
  }
}

if (failed) process.exit(1);

console.log(
  "[event-card] OK — public event cards retain core facts, colorful hashtags, favorites and add-to-calendar actions across list, search, planner and map surfaces.",
);
