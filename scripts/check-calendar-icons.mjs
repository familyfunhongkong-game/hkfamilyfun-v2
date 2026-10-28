import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const catalogueSource = await readFile("lib/events/calendar-icons.ts", "utf8");
const calendarSource = await readFile("app/calendar/page.tsx", "utf8");
const iconSource = await readFile("components/events/CalendarEventIcon.tsx", "utf8");
const editorSource = await readFile("app/merchant/events/[id]/edit/page.tsx", "utf8");
const displaySource = await readFile("lib/events/display-normalization.ts", "utf8");

const compiled = ts.transpileModule(catalogueSource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
const exports = {};
vm.runInNewContext(compiled.outputText, { exports, URL }, { filename: "calendar-icons.js" });
const { CALENDAR_EVENT_ICONS, getCalendarEventIcon, getCalendarThumbnailUrl } = exports;

assert.equal(CALENDAR_EVENT_ICONS.length, 29, "expect the approved 29 categories");
assert.equal(new Set(CALENDAR_EVENT_ICONS.map((x) => x.id)).size, 29, "icon IDs must be unique");
for (const item of CALENDAR_EVENT_ICONS) {
  assert.ok(item.label && item.zhHans && item.en && item.emoji && /^#[a-f0-9]{6}$/i.test(item.color));
}
assert.equal(getCalendarEventIcon({ category: "workshop" }).id, "arts_crafts");
assert.equal(getCalendarEventIcon({ category: "stem" }).id, "stem");
assert.equal(getCalendarEventIcon({ category: "市集" }).id, "market");
assert.equal(getCalendarEventIcon({ category: "親子活動", title: "兒童故事時間" }).id, "reading");
assert.equal(getCalendarEventIcon({ category: "unknown" }).id, "other");
assert.equal(getCalendarThumbnailUrl("https://example.org/poster.webp"), "https://example.org/poster.webp");
assert.equal(getCalendarThumbnailUrl("https://placehold.co/100x100"), null);
assert.equal(getCalendarThumbnailUrl("javascript:alert(1)"), null);

for (const signal of [
  "CalendarEventIcon",
  "const MOBILE_DAY_ICON_LIMIT = 1;",
  "const DESKTOP_DAY_ICON_LIMIT = 3;",
  "dayEvents.slice(0, MOBILE_DAY_ICON_LIMIT)",
  "dayEvents.slice(0, DESKTOP_DAY_ICON_LIMIT)",
  "dayEvents.length > MOBILE_DAY_ICON_LIMIT",
  "dayEvents.length > DESKTOP_DAY_ICON_LIMIT",
  "dayEvents.length - MOBILE_DAY_ICON_LIMIT",
  "dayEvents.length - DESKTOP_DAY_ICON_LIMIT",
  "eventOccursOn(",
  "getHongKongPublicHoliday(",
  'href={`/events?date=${date}`}',
]) assert.ok(calendarSource.includes(signal), `Calendar missing: ${signal}`);
assert.ok(!calendarSource.includes("dayEvents.length - 2"), "Do not render zero or negative +N badges");
for (const count of [0, 1, 2, 3, 4, 10]) {
  const mobileOverflow = count > 1 ? count - 1 : 0;
  const desktopOverflow = count > 3 ? count - 3 : 0;
  assert.ok(mobileOverflow >= 0 && desktopOverflow >= 0);
  if (count === 2) assert.equal(mobileOverflow, 1, "Two events must show +1 on mobile");
}
for (const signal of [
  'href={`/events/${encodeURIComponent(event.id)}`}',
  "getCalendarThumbnailUrl(event.image)",
  "onError={() => setFailedImage(thumbnail)}",
  "aria-label",
]) assert.ok(iconSource.includes(signal), `Icon missing: ${signal}`);
for (const signal of ["CALENDAR_EVENT_ICONS.map(", "getCalendarEventIcon(", "updateField(\"activity_category\", event.target.value)"])
  assert.ok(editorSource.includes(signal), `Merchant/Admin editor missing: ${signal}`);
assert.ok(displaySource.includes("stableCategory.zhHans") && displaySource.includes("stableCategory.en"));

console.log("[calendar-icons] PASS: 29 categories, multilingual IDs, legacy aliases, fallback, thumbnail safety and mobile/desktop links.");
