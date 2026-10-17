import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const home = readFileSync("app/page.tsx","utf8");
const featured = readFileSync("components/events/FeaturedEditorialCard.tsx","utf8");
const card = readFileSync("components/events/PublicEventCard.tsx","utf8");
const story = readFileSync("app/featured/[id]/page.tsx","utf8");
assert.match(home, /grid gap-6 md:grid-cols-2 xl:grid-cols-3/, "Latest cards need three columns on desktop");
assert.match(home, /max-w-\[540px\]/, "One featured card must not span most of desktop");
assert.match(home, /<FeaturedEditorialCard/, "Home featured content must use compact promo layout");
assert.match(home, /<PublicEventCard key=\{event.id\} event=\{event\} locale=\{locale\}/, "Latest cards remain standard event cards");
assert.match(featured,/eventDateLabel\(event, locale\)/,"Featured cards show date");
assert.match(featured,/eventPriceLabel\(event, locale\)/,"Featured cards show free/paid");
assert.match(featured,/event.priceType === "free"/,"Missing fee must not be mislabelled free");
assert.match(featured,/line-clamp-2/,"Featured description stays concise");
assert.match(featured,/href=\{destination\}/,"Featured link must open associated story");
assert.match(story,/event\.id === id|e\.id===id/,"Story linked to actual event");
assert.match(story,/<PublicEventCard event=\{event\}/,"Story retains standard event details");
for(const signal of ["toggleFavorite","addToCalendar","event.officialLink","event.ageRange","event.mtrStation"]){
 assert.ok(card.includes(signal),"Existing event card feature lost: "+signal);
}
console.log("[home-card-readability] PASS: responsive card dimensions, featured metadata, editorial navigation and retained event features");
