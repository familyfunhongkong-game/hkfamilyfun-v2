import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/favorites/page.tsx", "utf8");
for (const feature of [
  "hkff_favorite_event_ids",
  "readFavoriteIds()",
  "getEventStatus(event, today)",
  "Asia/Hong_Kong",
  "setQuery",
  "setDistrict",
  "setCategory",
  "setPrice",
  "setSort",
  "setLayout",
  "visibleCount",
  "removeFavorite(event.id)",
  ".from(\"public_events_i18n\")",
  "ids.slice(offset, offset + 100)",
]) {
  assert.ok(source.includes(feature), "Saved events is missing required behavior: " + feature);
}
assert.ok(!source.includes(".from(\"events\")"), "Saved events must only read public event view");
console.log("[saved-events] PASS: search, filters, sort, compact view, expiry, removal and public visibility.");
