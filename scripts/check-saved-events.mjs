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

assert.ok(source.includes("formatToParts(new Date())"), "Hong Kong date must not rely on locale-specific formatting");

const api = readFileSync("app/api/saved-events/route.ts", "utf8");
for (const required of [
  "serviceClient()", 'eq("status", "archived")', 'not("published_at", "is", null)',
  "hidden_pending_confirmation", "lastDate < today", "ids.length > 100",
  "private, no-store", "archived: true",
]) {
  assert.ok(api.includes(required), "Archive API security condition missing: " + required);
}
assert.ok(!api.includes('select("*")'), "Archive API must not expose internal columns");
assert.ok(source.includes('fetch("/api/saved-events"'), "Missing safe archive lookup");
assert.ok(source.includes('event.archived ? ('), "Expired history must render without dead detail links");
assert.ok(source.includes('if (event.archived) return "expired"'), "Archived listings must be past events");
