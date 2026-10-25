import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const cron = readFileSync("app/api/cron/archive-expired-events/route.ts", "utf8");
const helper = readFileSync("lib/events/smart-expiry.ts", "utf8");
const events = readFileSync("lib/supabase/events.ts", "utf8");
const search = readFileSync("components/events/PublicEventsSearchClient.tsx", "utf8");

assert.ok(cron.includes('policy: "smart-expiry-read-only"'));
assert.ok(!cron.includes('.update('), "Cron must not mutate event rows");
assert.ok(!cron.includes('serviceClient('), "Cron must not request service-role client");
assert.ok(cron.includes('authorization !== "Bearer " + cronSecret'), "Cron auth must remain");
assert.ok(helper.includes("nextEventOccurrence("), "Availability must consider recurrence");
assert.ok(helper.includes(String.raw`/^\\d{4}-\\d{2}-\\d{2}$/`), "ISO date regex must use digit character classes");
assert.ok(helper.includes('"needs_review"'), "Invalid dates require review");
assert.ok(events.includes('classifyEventAvailability(event) === "expired"'));
assert.ok(events.includes('if (isInternalTestEvent(event)) return null;'), "Published historical details must remain accessible");
assert.ok(search.includes('classifyEventAvailability(event) !== "expired"'), "Public search must exclude expired occurrences");
console.log("[smart-expiry] static safety contract PASS");
