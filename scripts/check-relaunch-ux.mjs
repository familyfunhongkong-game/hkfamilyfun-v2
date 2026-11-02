import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(p)=>readFileSync(p,"utf8");
const calendar=read("app/calendar/page.tsx"), planner=read("app/planner/page.tsx");
const cookie=read("components/cookie-settings-panel.tsx"), auto=read("components/cookie-auto-save-toggle.tsx");
const layout=read("app/layout.tsx"), detail=read("app/events/[id]/page.tsx");
assert.ok(calendar.includes("dayEvents.length"),"Calendar must show actual daily count");
assert.ok(calendar.includes("selectedDay"),"Calendar needs selected date");
assert.ok(calendar.includes("recentlyPublished.map("),"Selected day needs concise list");
assert.ok(calendar.includes("Date.parse(a.publishedAt || a.updatedAt"),"Newest posted first");
assert.ok(!calendar.includes("<CalendarEventIcon"),"No event icons in calendar cells");
assert.ok(calendar.includes("day-events"),"Date should jump to daily list");
assert.ok(planner.includes("setQuery(searchDraft.trim())"),"Explicit search applies keyword");
assert.ok(planner.includes('aria-label={locale === "en" ? "Search activities"'),"Accessible search button");
assert.ok(planner.includes('id="planner-results"'),"Search should reveal result section");
assert.ok(auto.includes("form.requestSubmit(submit)"),"Checkbox saves on first click");
assert.ok(cookie.includes("<CookieAutoSaveToggle"),"Use auto-save on Cookies page");
for(const name of ["instagram","facebook","threads"]) {
  assert.ok(layout.includes(`src="/icons/${name}.svg"`),"Use local "+name+" logo");
  assert.ok(read(`public/icons/${name}.svg`).includes("<svg"),"Local SVG required");
}
assert.ok(!detail.includes('className="mt-4 flex flex-wrap gap-2"') || detail.includes("shareEvent"),"Preserve sharing controls");
console.log("[relaunch-ux] PASS: calendar, planner, cookie one-click save, social brands and detail actions");
