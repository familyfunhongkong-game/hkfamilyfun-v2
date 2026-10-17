import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const page = readFileSync("app/favorites/page.tsx", "utf8");
const api = readFileSync("app/api/saved-events/route.ts", "utf8");
for (const feature of ["hkff_favorite_event_ids","getEventStatus(event, today)","Asia/Hong_Kong","nextOccurrence(event, today)","eventOccursOn","setQuery","setDistrict","setCategory","setPrice","setSort","setLayout","visibleCount","removeFavorite(event.id)",'fetch("/api/saved-events"',"ids.slice(offset, offset + 100)"]) {
  assert.ok(page.includes(feature), "Missing saved-event feature: " + feature);
}
for (const guard of ["serviceClient()","status.eq.published","status.eq.archived","published_at.not.is.null","hidden_pending_confirmation","ids.length > 100","Cache-Control","no-store"]) {
  assert.ok(api.includes(guard), "Missing saved-event API guard: " + guard);
}
assert.ok(!api.includes('select("*")'), "Do not expose all private database columns");
assert.ok(!page.includes('.from("events")'), "Do not access private table in browser");
console.log("[saved-events] PASS");
