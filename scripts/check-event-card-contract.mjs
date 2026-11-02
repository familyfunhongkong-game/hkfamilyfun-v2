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

// Card hero and content must be separate siblings, never overlapping layers.
const compactBegin = sharedCard.indexOf("if (compact) {");
const fullBegin = sharedCard.indexOf("\\n  return (\\n    <article", compactBegin);
const compactMarkup = sharedCard.slice(compactBegin, fullBegin);
const fullMarkup = sharedCard.slice(fullBegin);
const fullHeroEnd = fullMarkup.indexOf('      </Link>\\n\\n      <div className={`flex flex-1 flex-col');
if (compactBegin < 0 || fullBegin < 0 || fullHeroEnd < 0) {
  console.error("[event-card] missing independent image hero and content regions");
  failed = true;
} else {
  const hero = fullMarkup.slice(0, fullHeroEnd);
  const content = fullMarkup.slice(fullHeroEnd);
  const requirements = [
    ["hero has fixed aspect ratio", 'aspect-[5/4]'],
    ["hero is clipped independently", 'relative isolate block w-full shrink-0 overflow-hidden'],
    ["responsive image fills hero background", 'h-full w-full object-cover'],
    ["overlay badges are positioned above the photo", 'absolute inset-x-3 top-3 z-20'],
    ["overlay badges cannot block image click", 'pointer-events-none'],
    ["featured badge is on the cover", '精選推介'],
    ["category is on the cover", '{category}'],
    ["free/price is on the cover", '{price}'],
  ];
  for (const [label, token] of requirements) {
    if (!hero.includes(token)) {
      console.error("[event-card] missing: " + label);
      failed = true;
    }
  }
  for (const token of ["<h3", "<InfoLine", "toggleFavorite", "addToCalendar"]) {
    if (!content.includes(token)) {
      console.error("[event-card] content area missing: " + token);
      failed = true;
    }
  }
  if (hero.includes("📍 {event.district}") || content.includes("absolute bottom-3")) {
    console.error("[event-card] old overlapping district/metadata badge returned");
    failed = true;
  }
  if (!compactMarkup.includes('relative isolate block aspect-square overflow-hidden') ||
      !compactMarkup.includes("absolute inset-x-1.5 top-1.5 z-20") ||
      !compactMarkup.includes("{price}")) {
    console.error("[event-card] compact thumbnail should also put badges above the photo");
    failed = true;
  }
}

const sharedRoutes = ["app/page.tsx", "app/favorites/page.tsx"];
for (const file of sharedRoutes) {
  const source = await readFile(file, "utf8");
  if (!source.includes("PublicEventCard")) {
    console.error(`[event-card] ${file} no longer uses PublicEventCard`);
    failed = true;
  }
}
const calendar = await readFile("app/calendar/page.tsx", "utf8");
if (!calendar.includes("ResilientEventImage") || !calendar.includes("recentlyPublished.map(") ||
    calendar.includes("<PublicEventCard")) {
  console.error("[event-card] calendar should render compact selected-day rows instead of full cards");
  failed = true;
}

// /today is deliberately a separate compact time-ordered list, not a
// stretched multi-column PublicEventCard. Keep shared cards on other routes.
const today = await readFile("app/today/page.tsx", "utf8");
const todayRow = await readFile("components/events/TodayScheduleRow.tsx", "utf8");
for (const signal of [
  "groupTodaySchedule(todayEvents)",
  "eventOccursOn(",
  "Asia/Hong_Kong",
  "<TodayScheduleRow",
  "schedule[period].map(",
  'href="/calendar"',
]) {
  if (!today.includes(signal)) {
    console.error(`[event-card] Today timetable missing ${signal}`);
    failed = true;
  }
}
for (const signal of [
  "ResilientEventImage",
  "object-contain",
  "event.title",
  "event.price",
  "event.district",
  "displayTodayTime(event)",
  "href={`/events/${event.id}`}",
]) {
  if (!todayRow.includes(signal)) {
    console.error(`[event-card] Today compact schedule row missing ${signal}`);
    failed = true;
  }
}
if (today.includes("<PublicEventCard")) {
  console.error("[event-card] Today must not use oversized details cards.");
  failed = true;
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
